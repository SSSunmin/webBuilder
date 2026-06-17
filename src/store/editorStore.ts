import { create } from "zustand";
import { createNode, getComponentDef } from "../registry";
import type { PageDocument, PageNode } from "../types/page";

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

  loadDocument: (doc: PageDocument) => void;
  newDocument: (name: string) => PageDocument;
  selectNode: (id: string | null) => void;
  addNode: (parentId: string, type: string, index?: number) => string | null;
  updateNodeProps: (id: string, partial: Record<string, unknown>) => void;
  removeNode: (id: string) => void;
  moveNode: (id: string, newParentId: string, index?: number) => void;
}

/** Find the id of the node whose children include `childId`. */
function findParentId(
  nodes: Record<string, PageNode>,
  childId: string,
): string | null {
  for (const node of Object.values(nodes)) {
    if (node.children.includes(childId)) return node.id;
  }
  return null;
}

/** Collect `id` and all of its descendant ids. */
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

export const useEditorStore = create<EditorState>((set, get) => ({
  document: null,
  selectedId: null,

  loadDocument: (doc) => set({ document: doc, selectedId: null }),

  newDocument: (name) => {
    const doc = createDocument(name);
    set({ document: doc, selectedId: null });
    return doc;
  },

  selectNode: (id) => set({ selectedId: id }),

  addNode: (parentId, type, index) => {
    const doc = get().document;
    if (!doc) return null;
    const parent = doc.nodes[parentId];
    if (!parent || !isContainer(doc.nodes, parentId)) return null;

    const node = createNode(type);
    const children = [...parent.children];
    const at = index ?? children.length;
    children.splice(at, 0, node.id);

    set({
      document: {
        ...doc,
        nodes: {
          ...doc.nodes,
          [node.id]: node,
          [parentId]: { ...parent, children },
        },
      },
      selectedId: node.id,
    });
    return node.id;
  },

  updateNodeProps: (id, partial) => {
    const doc = get().document;
    if (!doc) return;
    const node = doc.nodes[id];
    if (!node) return;
    set({
      document: {
        ...doc,
        nodes: {
          ...doc.nodes,
          [id]: { ...node, props: { ...node.props, ...partial } },
        },
      },
    });
  },

  removeNode: (id) => {
    const doc = get().document;
    if (!doc || id === doc.rootId) return; // never remove the root

    const parentId = findParentId(doc.nodes, id);
    const removed = collectSubtree(doc.nodes, id);
    const removedSet = new Set(removed);

    const nodes: Record<string, PageNode> = {};
    for (const [nodeId, node] of Object.entries(doc.nodes)) {
      if (removedSet.has(nodeId)) continue;
      nodes[nodeId] =
        nodeId === parentId
          ? { ...node, children: node.children.filter((c) => c !== id) }
          : node;
    }

    set({
      document: { ...doc, nodes },
      selectedId: removedSet.has(get().selectedId ?? "")
        ? null
        : get().selectedId,
    });
  },

  moveNode: (id, newParentId, index) => {
    const doc = get().document;
    if (!doc || id === doc.rootId || id === newParentId) return;
    if (!isContainer(doc.nodes, newParentId)) return;
    // Disallow moving a node into its own subtree.
    if (collectSubtree(doc.nodes, id).includes(newParentId)) return;

    const oldParentId = findParentId(doc.nodes, id);
    if (!oldParentId) return;

    const nodes = { ...doc.nodes };

    // Remove from old parent.
    const oldParent = nodes[oldParentId];
    nodes[oldParentId] = {
      ...oldParent,
      children: oldParent.children.filter((c) => c !== id),
    };

    // Insert into new parent (re-read in case it equals old parent).
    const newParent = nodes[newParentId];
    const children = [...newParent.children];
    const at = index ?? children.length;
    children.splice(at, 0, id);
    nodes[newParentId] = { ...newParent, children };

    set({ document: { ...doc, nodes } });
  },
}));
