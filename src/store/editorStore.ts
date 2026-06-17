import { create } from "zustand";
import { createNode, defaultFrameFor, getComponentDef } from "../registry";
import type { NodeFrame, PageDocument, PageNode } from "../types/page";

const HISTORY_LIMIT = 50;

function nowIso(): string {
  return new Date().toISOString();
}

/** Create an empty document whose root is a Layout frame. */
export function createDocument(name: string): PageDocument {
  const root = createNode("Layout");
  root.frame = { ...root.frame, x: 0, y: 0 };
  const stamp = nowIso();
  return {
    id: crypto.randomUUID(),
    version: 1,
    rootId: root.id,
    nodes: { [root.id]: root },
    meta: { name, createdAt: stamp, updatedAt: stamp },
  };
}

/** Backfill frame/background on documents saved before free-positioning. */
function normalizeDocument(doc: PageDocument): PageDocument {
  let changed = false;
  const nodes: Record<string, PageNode> = {};
  for (const [id, node] of Object.entries(doc.nodes)) {
    if (node.frame) {
      nodes[id] = node;
      continue;
    }
    changed = true;
    nodes[id] = {
      ...node,
      frame: defaultFrameFor(node.type),
      background: node.background ?? getComponentDef(node.type)?.defaultBackground,
    };
  }
  return changed ? { ...doc, nodes } : doc;
}

interface EditorState {
  document: PageDocument | null;
  selectedId: string | null;
  past: PageDocument[];
  future: PageDocument[];
  lastTag: string | null;

  loadDocument: (doc: PageDocument) => void;
  newDocument: (name: string) => PageDocument;
  selectNode: (id: string | null) => void;
  addNode: (
    parentId: string,
    type: string,
    position?: { x: number; y: number },
  ) => string | null;
  updateNodeProps: (id: string, partial: Record<string, unknown>) => void;
  updateNodeFrame: (id: string, partial: Partial<NodeFrame>, tag?: string) => void;
  moveNodeBy: (id: string, dx: number, dy: number, tag?: string) => void;
  setNodeBackground: (id: string, background: string) => void;
  removeNode: (id: string) => void;
  moveNode: (id: string, newParentId: string, position?: { x: number; y: number }) => void;
  undo: () => void;
  redo: () => void;
}

function findParentId(
  nodes: Record<string, PageNode>,
  childId: string,
): string | null {
  for (const node of Object.values(nodes)) {
    if (node.children.includes(childId)) return node.id;
  }
  return null;
}

function collectSubtree(
  nodes: Record<string, PageNode>,
  id: string,
  acc: string[] = [],
): string[] {
  acc.push(id);
  const node = nodes[id];
  if (node) {
    for (const childId of node.children) collectSubtree(nodes, childId, acc);
  }
  return acc;
}

function isContainer(nodes: Record<string, PageNode>, id: string): boolean {
  const node = nodes[id];
  return node ? Boolean(getComponentDef(node.type)?.isContainer) : false;
}

export const useEditorStore = create<EditorState>((set, get) => {
  const apply = (
    producer: (doc: PageDocument) => PageDocument,
    tag: string | null,
  ) => {
    const { document, past, lastTag } = get();
    if (!document) return;
    const next = producer(document);
    if (next === document) return;
    const coalesce = tag !== null && tag === lastTag;
    set({
      document: next,
      past: coalesce ? past : [...past, document].slice(-HISTORY_LIMIT),
      future: [],
      lastTag: tag,
    });
  };

  const patchNode = (
    id: string,
    patch: (node: PageNode) => PageNode,
    tag: string | null,
  ) => {
    const doc = get().document;
    if (!doc || !doc.nodes[id]) return;
    apply(
      (d) => ({ ...d, nodes: { ...d.nodes, [id]: patch(d.nodes[id]) } }),
      tag,
    );
  };

  return {
    document: null,
    selectedId: null,
    past: [],
    future: [],
    lastTag: null,

    loadDocument: (doc) =>
      set({
        document: normalizeDocument(doc),
        selectedId: null,
        past: [],
        future: [],
        lastTag: null,
      }),

    newDocument: (name) => {
      const doc = createDocument(name);
      set({ document: doc, selectedId: null, past: [], future: [], lastTag: null });
      return doc;
    },

    selectNode: (id) => set({ selectedId: id }),

    addNode: (parentId, type, position) => {
      const doc = get().document;
      if (!doc || !isContainer(doc.nodes, parentId)) return null;
      const node = createNode(type, position);
      apply((d) => {
        const parent = d.nodes[parentId];
        return {
          ...d,
          nodes: {
            ...d.nodes,
            [node.id]: node,
            [parentId]: { ...parent, children: [...parent.children, node.id] },
          },
        };
      }, null);
      set({ selectedId: node.id });
      return node.id;
    },

    updateNodeProps: (id, partial) =>
      patchNode(
        id,
        (node) => ({ ...node, props: { ...node.props, ...partial } }),
        `props:${id}:${Object.keys(partial).join(",")}`,
      ),

    updateNodeFrame: (id, partial, tag) =>
      patchNode(
        id,
        (node) => ({ ...node, frame: { ...node.frame, ...partial } }),
        tag ?? `frame:${id}:${Object.keys(partial).join(",")}`,
      ),

    moveNodeBy: (id, dx, dy, tag) =>
      patchNode(
        id,
        (node) => ({
          ...node,
          frame: {
            ...node.frame,
            x: Math.max(0, Math.round(node.frame.x + dx)),
            y: Math.max(0, Math.round(node.frame.y + dy)),
          },
        }),
        tag ?? null,
      ),

    setNodeBackground: (id, background) =>
      patchNode(id, (node) => ({ ...node, background }), `bg:${id}`),

    removeNode: (id) => {
      const doc = get().document;
      if (!doc || id === doc.rootId) return;
      const parentId = findParentId(doc.nodes, id);
      const removedSet = new Set(collectSubtree(doc.nodes, id));
      apply((d) => {
        const nodes: Record<string, PageNode> = {};
        for (const [nodeId, node] of Object.entries(d.nodes)) {
          if (removedSet.has(nodeId)) continue;
          nodes[nodeId] =
            nodeId === parentId
              ? { ...node, children: node.children.filter((c) => c !== id) }
              : node;
        }
        return { ...d, nodes };
      }, null);
      if (removedSet.has(get().selectedId ?? "")) set({ selectedId: null });
    },

    moveNode: (id, newParentId, position) => {
      const doc = get().document;
      if (!doc || id === doc.rootId || id === newParentId) return;
      if (!isContainer(doc.nodes, newParentId)) return;
      if (collectSubtree(doc.nodes, id).includes(newParentId)) return;
      const oldParentId = findParentId(doc.nodes, id);
      if (!oldParentId || oldParentId === newParentId) return;
      apply((d) => {
        const nodes = { ...d.nodes };
        const oldParent = nodes[oldParentId];
        nodes[oldParentId] = {
          ...oldParent,
          children: oldParent.children.filter((c) => c !== id),
        };
        const newParent = nodes[newParentId];
        nodes[newParentId] = {
          ...newParent,
          children: [...newParent.children, id],
        };
        if (position) {
          nodes[id] = {
            ...nodes[id],
            frame: {
              ...nodes[id].frame,
              x: Math.max(0, Math.round(position.x)),
              y: Math.max(0, Math.round(position.y)),
            },
          };
        }
        return { ...d, nodes };
      }, null);
    },

    undo: () => {
      const { past, future, document } = get();
      if (!past.length || !document) return;
      set({
        document: past[past.length - 1],
        past: past.slice(0, -1),
        future: [document, ...future],
        lastTag: null,
        selectedId: null,
      });
    },

    redo: () => {
      const { past, future, document } = get();
      if (!future.length || !document) return;
      set({
        document: future[0],
        future: future.slice(1),
        past: [...past, document],
        lastTag: null,
        selectedId: null,
      });
    },
  };
});
