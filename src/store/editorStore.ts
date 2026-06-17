import { create } from "zustand";
import { createNode, getComponentDef } from "../registry";
import type { PageDocument, PageNode } from "../types/page";

const HISTORY_LIMIT = 50;

function nowIso(): string {
  return new Date().toISOString();
}

/** Create an empty document whose root is a Layout container. */
export function createDocument(name: string): PageDocument {
  const root = createNode("Layout");
  const stamp = nowIso();
  return {
    id: crypto.randomUUID(),
    version: 1,
    rootId: root.id,
    nodes: { [root.id]: root },
    meta: { name, createdAt: stamp, updatedAt: stamp },
  };
}

interface EditorState {
  document: PageDocument | null;
  selectedId: string | null;
  past: PageDocument[];
  future: PageDocument[];
  /** Tag of the last commit, used to coalesce rapid edits (e.g. prop typing). */
  lastTag: string | null;

  loadDocument: (doc: PageDocument) => void;
  newDocument: (name: string) => PageDocument;
  selectNode: (id: string | null) => void;
  addNode: (parentId: string, type: string, index?: number) => string | null;
  updateNodeProps: (id: string, partial: Record<string, unknown>) => void;
  removeNode: (id: string) => void;
  moveNode: (id: string, newParentId: string, index?: number) => void;
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
  /** Apply a change, recording history. Same non-null tag as the previous
   * commit coalesces (no new undo step) — keeps prop typing to one step. */
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

  return {
    document: null,
    selectedId: null,
    past: [],
    future: [],
    lastTag: null,

    loadDocument: (doc) =>
      set({ document: doc, selectedId: null, past: [], future: [], lastTag: null }),

    newDocument: (name) => {
      const doc = createDocument(name);
      set({ document: doc, selectedId: null, past: [], future: [], lastTag: null });
      return doc;
    },

    selectNode: (id) => set({ selectedId: id }),

    addNode: (parentId, type, index) => {
      const doc = get().document;
      if (!doc) return null;
      if (!isContainer(doc.nodes, parentId)) return null;
      const node = createNode(type);
      apply((d) => {
        const parent = d.nodes[parentId];
        const children = [...parent.children];
        children.splice(index ?? children.length, 0, node.id);
        return {
          ...d,
          nodes: { ...d.nodes, [node.id]: node, [parentId]: { ...parent, children } },
        };
      }, null);
      set({ selectedId: node.id });
      return node.id;
    },

    updateNodeProps: (id, partial) => {
      const doc = get().document;
      if (!doc || !doc.nodes[id]) return;
      apply(
        (d) => {
          const node = d.nodes[id];
          return {
            ...d,
            nodes: { ...d.nodes, [id]: { ...node, props: { ...node.props, ...partial } } },
          };
        },
        `props:${id}:${Object.keys(partial).join(",")}`,
      );
    },

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

    moveNode: (id, newParentId, index) => {
      const doc = get().document;
      if (!doc || id === doc.rootId || id === newParentId) return;
      if (!isContainer(doc.nodes, newParentId)) return;
      if (collectSubtree(doc.nodes, id).includes(newParentId)) return;
      const oldParentId = findParentId(doc.nodes, id);
      if (!oldParentId) return;
      apply((d) => {
        const nodes = { ...d.nodes };
        const oldParent = nodes[oldParentId];
        nodes[oldParentId] = {
          ...oldParent,
          children: oldParent.children.filter((c) => c !== id),
        };
        const newParent = nodes[newParentId];
        const children = [...newParent.children];
        children.splice(index ?? children.length, 0, id);
        nodes[newParentId] = { ...newParent, children };
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
