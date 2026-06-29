import { create } from "zustand";
import { createNode, defaultFrameFor, getBlockDef, getComponentDef } from "../registry";
import { DEFAULT_SHADOW, isValidTokenKey, resolveFrame, toSides } from "../types/page";
import type {
  BreakpointId,
  NodeFrame,
  NodeOverride,
  PageDocument,
  PageNode,
  ShadowSpec,
  Sides,
} from "../types/page";
import type { EventBinding } from "../types/events";

const HISTORY_LIMIT = 50;

export type AlignMode = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

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

/** Backfill frame/background/radius on documents saved before these fields. */
function normalizeDocument(doc: PageDocument): PageDocument {
  let changed = false;
  const nodes: Record<string, PageNode> = {};
  for (const [id, node] of Object.entries(doc.nodes)) {
    const def = getComponentDef(node.type);
    let next = node;
    if (!next.frame) {
      next = {
        ...next,
        frame: defaultFrameFor(node.type),
        background: next.background ?? def?.defaultBackground,
      };
    }
    // Backfill radius for nodes saved before the field existed so the
    // canvas keeps matching each component's default rounded corners.
    if (next.borderRadius === undefined && def?.defaultBorderRadius !== undefined) {
      next = { ...next, borderRadius: def.defaultBorderRadius };
    }
    // Drop a legacy/invalid shadow value (pre pixel-level ShadowSpec format, or
    // a null from external JSON) so only a ShadowSpec object or undefined remain.
    if (next.boxShadow != null && typeof (next.boxShadow as unknown) !== "object") {
      next = { ...next, boxShadow: undefined };
    }
    if (next !== node) changed = true;
    nodes[id] = next;
  }
  return changed ? { ...doc, nodes } : doc;
}

interface EditorState {
  document: PageDocument | null;
  selectedIds: string[];
  past: PageDocument[];
  future: PageDocument[];
  lastTag: string | null;
  /** Breakpoint currently being edited/previewed; desktop is the base. */
  activeBreakpoint: BreakpointId;

  loadDocument: (doc: PageDocument) => void;
  setBreakpoint: (bp: BreakpointId) => void;
  newDocument: (name: string) => PageDocument;
  selectNode: (id: string | null, additive?: boolean) => void;
  addNode: (
    parentId: string,
    type: string,
    position?: { x: number; y: number },
  ) => string | null;
  /** Insert a composable block (a section container + child nodes) as one step. */
  addBlock: (
    parentId: string,
    blockKey: string,
    position?: { x: number; y: number },
  ) => string | null;
  updateNodeProps: (id: string, partial: Record<string, unknown>) => void;
  /** Append a default event binding (click → 직접 설명) to a node. */
  addNodeEvent: (id: string) => void;
  /** Patch one of a node's event bindings by its id. */
  updateNodeEvent: (
    id: string,
    eventId: string,
    partial: Partial<Omit<EventBinding, "id">>,
  ) => void;
  /** Remove one of a node's event bindings by its id. */
  removeNodeEvent: (id: string, eventId: string) => void;
  updateNodeFrame: (id: string, partial: Partial<NodeFrame>, tag?: string) => void;
  moveNodeBy: (id: string, dx: number, dy: number, tag?: string) => void;
  setNodeBackground: (id: string, background: string) => void;
  setNodeRadius: (id: string, borderRadius: number) => void;
  /** Upsert a document-level color token. Invalid keys are ignored. */
  setColorToken: (key: string, value: string) => void;
  /** Remove a color token. Nodes still referencing it render without that color
   * (the ref dangles → resolves to undefined) until repointed. */
  removeColorToken: (key: string) => void;
  /** Merge a partial pixel shadow into the node (creates a default if none). */
  updateNodeShadow: (id: string, partial: Partial<ShadowSpec>) => void;
  /** Remove a node's shadow entirely. */
  clearNodeShadow: (id: string) => void;
  updateNodeSpacing: (
    id: string,
    partial: { padding?: Partial<Sides>; margin?: Partial<Sides> },
  ) => void;
  removeNode: (id: string) => void;
  /** Deep-clone a node (and its subtree) with fresh ids next to the original. */
  duplicateNode: (id: string) => string | null;
  moveNode: (id: string, newParentId: string, position?: { x: number; y: number }) => void;
  /** Reorder among siblings: "forward" = toward front (top of stack). */
  reorderNode: (id: string, dir: "forward" | "backward") => void;
  /** Move a node to be the last child of a container. */
  moveNodeInto: (id: string, parentId: string) => void;
  /** Place a node just before/after a reference node among its siblings. */
  moveNodeAdjacent: (id: string, refId: string, side: "before" | "after") => void;
  alignNodes: (ids: string[], mode: AlignMode) => void;
  distributeNodes: (ids: string[], axis: "h" | "v") => void;
  /** Center selected direct children within their (also-selected) parent box. */
  centerInParent: (ids: string[], axis: "h" | "v") => void;
  /**
   * Set a node's per-breakpoint hidden flag. desktop is always visible, so a
   * desktop call is a no-op. Recorded as one undo step.
   */
  setNodeHidden: (id: string, bp: BreakpointId, hidden: boolean) => void;
  /**
   * Drop a node's entire override for a breakpoint so it inherits from the
   * cascade (parent breakpoint / base) again. desktop has no override → no-op.
   */
  resetOverride: (id: string, bp: BreakpointId) => void;
  undo: () => void;
  redo: () => void;
}

function findParentId(nodes: Record<string, PageNode>, childId: string): string | null {
  for (const node of Object.values(nodes)) {
    if (node.children.includes(childId)) return node.id;
  }
  return null;
}

/**
 * True when every id present in the document shares a single parent.
 * ids missing from the document are ignored. Empty/single sets are trivially
 * same-parent. Used to keep parent-relative ops on one coordinate plane.
 */
export function sameParent(nodes: Record<string, PageNode>, ids: string[]): boolean {
  let parent: string | null | undefined;
  for (const id of ids) {
    if (!nodes[id]) continue;
    const p = findParentId(nodes, id);
    if (parent === undefined) parent = p;
    else if (parent !== p) return false;
  }
  return true;
}

/**
 * Detect a "parent + its direct children" selection: exactly one of the ids is
 * the direct parent of all the others. Returns the parent id and the child ids,
 * or null when the selection isn't that shape (e.g. only siblings, or a
 * non-direct ancestor). Used to center children within their parent box.
 */
export function findParentChild(
  nodes: Record<string, PageNode>,
  ids: string[],
): { parentId: string; childIds: string[] } | null {
  if (ids.length < 2) return null;
  for (const pid of ids) {
    const parent = nodes[pid];
    if (!parent) continue;
    const others = ids.filter((i) => i !== pid);
    if (others.length && others.every((c) => parent.children.includes(c))) {
      return { parentId: pid, childIds: others };
    }
  }
  return null;
}

/** Deep-copy a node's per-breakpoint overrides so clones don't share nested objects. */
function cloneOverrides(
  overrides: NonNullable<PageNode["overrides"]>,
): NonNullable<PageNode["overrides"]> {
  const out: NonNullable<PageNode["overrides"]> = {};
  for (const [bp, ov] of Object.entries(overrides)) {
    if (!ov) continue;
    out[bp as "tablet" | "mobile"] = {
      ...ov,
      ...(ov.frame ? { frame: { ...ov.frame } } : {}),
    };
  }
  return out;
}

/**
 * Write a partial frame onto a node at the active breakpoint.
 * desktop edits merge into the base frame (identical to pre-Stage-B behavior);
 * other breakpoints merge into overrides[bp].frame, keeping the override sparse
 * and preserving sibling override fields (e.g. hidden).
 */
function writeFrame(node: PageNode, bp: BreakpointId, partial: Partial<NodeFrame>): PageNode {
  if (bp === "desktop") return { ...node, frame: { ...node.frame, ...partial } };
  const prev = node.overrides?.[bp];
  return {
    ...node,
    overrides: {
      ...node.overrides,
      [bp]: { ...prev, frame: { ...prev?.frame, ...partial } },
    },
  };
}

export function collectSubtree(nodes: Record<string, PageNode>, id: string, acc: string[] = []): string[] {
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
  const apply = (producer: (doc: PageDocument) => PageDocument, tag: string | null) => {
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

  const patchNode = (id: string, patch: (node: PageNode) => PageNode, tag: string | null) => {
    const doc = get().document;
    if (!doc || !doc.nodes[id]) return;
    apply((d) => ({ ...d, nodes: { ...d.nodes, [id]: patch(d.nodes[id]) } }), tag);
  };

  /**
   * Apply partial frame changes to many nodes in one history step, at the
   * active breakpoint. On desktop each partial merges into the base frame
   * (so passing only the changed axis matches the old full-frame behavior);
   * on other breakpoints it merges into overrides[bp].frame.
   */
  const patchFrames = (frames: Record<string, Partial<NodeFrame>>, tag: string | null) => {
    const doc = get().document;
    if (!doc) return;
    const bp = get().activeBreakpoint;
    apply((d) => {
      const nodes = { ...d.nodes };
      for (const [id, partial] of Object.entries(frames)) {
        if (nodes[id]) nodes[id] = writeFrame(nodes[id], bp, partial);
      }
      return { ...d, nodes };
    }, tag);
  };

  return {
    document: null,
    selectedIds: [],
    past: [],
    future: [],
    lastTag: null,
    activeBreakpoint: "desktop",

    setBreakpoint: (bp) => set({ activeBreakpoint: bp }),

    loadDocument: (doc) =>
      set({
        document: normalizeDocument(doc),
        selectedIds: [],
        past: [],
        future: [],
        lastTag: null,
        activeBreakpoint: "desktop",
      }),

    newDocument: (name) => {
      const doc = createDocument(name);
      set({
        document: doc,
        selectedIds: [],
        past: [],
        future: [],
        lastTag: null,
        activeBreakpoint: "desktop",
      });
      return doc;
    },

    selectNode: (id, additive) => {
      // Changing selection ends the current undo coalescing session, so a later
      // patch with the same tag (e.g. resize A → select B → resize A again)
      // records a fresh snapshot instead of merging into the previous one.
      if (id === null) {
        set({ selectedIds: [], lastTag: null });
        return;
      }
      if (!additive) {
        set({ selectedIds: [id], lastTag: null });
        return;
      }
      const current = get().selectedIds;
      set({
        selectedIds: current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id],
        lastTag: null,
      });
    },

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
      set({ selectedIds: [node.id] });
      return node.id;
    },

    addBlock: (parentId, blockKey, position) => {
      const doc = get().document;
      if (!doc || !isContainer(doc.nodes, parentId)) return null;
      const block = getBlockDef(blockKey);
      if (!block) return null;
      // Guard the section type so createNode never throws and children can nest.
      if (!getComponentDef(block.section.type)?.isContainer) return null;

      const section = createNode(block.section.type, position);
      section.frame = { ...section.frame, w: block.section.size.w, h: block.section.size.h };
      if (block.section.background !== undefined) section.background = block.section.background;
      if (block.section.props) section.props = { ...section.props, ...block.section.props };

      const childNodes = block.children.map((spec) => {
        const child = createNode(spec.type);
        child.frame = { ...spec.frame };
        if (spec.props) child.props = { ...child.props, ...spec.props };
        if (spec.background !== undefined) child.background = spec.background;
        if (spec.borderRadius !== undefined) child.borderRadius = spec.borderRadius;
        return child;
      });
      section.children = childNodes.map((c) => c.id);

      apply((d) => {
        const parent = d.nodes[parentId];
        const nodes = { ...d.nodes, [section.id]: section };
        for (const child of childNodes) nodes[child.id] = child;
        nodes[parentId] = { ...parent, children: [...parent.children, section.id] };
        return { ...d, nodes };
      }, null);
      set({ selectedIds: [section.id] });
      return section.id;
    },

    updateNodeProps: (id, partial) =>
      patchNode(
        id,
        (node) => ({ ...node, props: { ...node.props, ...partial } }),
        `props:${id}:${Object.keys(partial).join(",")}`,
      ),

    // Adding/removing a binding is a discrete action (null tag → own undo step);
    // editing a binding's fields coalesces by tag like updateNodeProps does.
    addNodeEvent: (id) =>
      patchNode(
        id,
        (node) => ({
          ...node,
          events: [
            ...(node.events ?? []),
            { id: crypto.randomUUID(), trigger: "click", action: "custom" },
          ],
        }),
        null,
      ),

    updateNodeEvent: (id, eventId, partial) =>
      patchNode(
        id,
        (node) => ({
          ...node,
          events: (node.events ?? []).map((ev) =>
            ev.id === eventId ? { ...ev, ...partial } : ev,
          ),
        }),
        `event:${id}:${eventId}:${Object.keys(partial).join(",")}`,
      ),

    removeNodeEvent: (id, eventId) =>
      patchNode(
        id,
        (node) => ({
          ...node,
          events: (node.events ?? []).filter((ev) => ev.id !== eventId),
        }),
        null,
      ),

    updateNodeFrame: (id, partial, tag) => {
      const bp = get().activeBreakpoint;
      patchNode(
        id,
        (node) => writeFrame(node, bp, partial),
        tag ?? `frame:${id}:${Object.keys(partial).join(",")}`,
      );
    },

    moveNodeBy: (id, dx, dy, tag) => {
      const bp = get().activeBreakpoint;
      patchNode(
        id,
        (node) => {
          // Move relative to the resolved position at this breakpoint, not the
          // base frame, so dragging a node that already has an override nudges
          // from where it actually sits.
          const cur = resolveFrame(node, bp);
          return writeFrame(node, bp, {
            x: Math.max(0, Math.round(cur.x + dx)),
            y: Math.max(0, Math.round(cur.y + dy)),
          });
        },
        tag ?? null,
      );
    },

    setNodeBackground: (id, background) =>
      patchNode(id, (node) => ({ ...node, background }), `bg:${id}`),

    setColorToken: (key, value) => {
      if (!isValidTokenKey(key)) return;
      apply(
        (d) => ({
          ...d,
          meta: {
            ...d.meta,
            tokens: { ...d.meta.tokens, colors: { ...d.meta.tokens?.colors, [key]: value } },
          },
        }),
        // Coalesce edits to the same token (e.g. dragging a color picker).
        `token:color:${key}`,
      );
    },

    removeColorToken: (key) =>
      apply((d) => {
        const colors = { ...d.meta.tokens?.colors };
        if (!(key in colors)) return d;
        delete colors[key];
        return { ...d, meta: { ...d.meta, tokens: { ...d.meta.tokens, colors } } };
      }, null),

    setNodeRadius: (id, borderRadius) =>
      patchNode(
        id,
        (node) => ({ ...node, borderRadius: Math.max(0, Math.round(borderRadius)) }),
        `radius:${id}`,
      ),

    updateNodeShadow: (id, partial) =>
      patchNode(
        id,
        (node) => ({ ...node, boxShadow: { ...(node.boxShadow ?? DEFAULT_SHADOW), ...partial } }),
        // Per-field tag so dragging X then Y then blur are separate undo steps
        // (enabling the shadow uses {} → "shadow:<id>:", its own step).
        `shadow:${id}:${Object.keys(partial).join(",")}`,
      ),

    clearNodeShadow: (id) =>
      patchNode(id, (node) => ({ ...node, boxShadow: undefined }), null),

    updateNodeSpacing: (id, partial) => {
      const tag =
        `spacing:${id}:` +
        [
          partial.padding && "p" + Object.keys(partial.padding).join(","),
          partial.margin && "m" + Object.keys(partial.margin).join(","),
        ]
          .filter(Boolean)
          .join("|");
      patchNode(
        id,
        (node) => {
          const next = { ...node };
          if (partial.padding) {
            next.padding = { ...toSides(node.padding), ...partial.padding };
          }
          if (partial.margin) {
            next.margin = { ...toSides(node.margin), ...partial.margin };
          }
          return next;
        },
        tag,
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
      set({ selectedIds: get().selectedIds.filter((x) => !removedSet.has(x)) });
    },

    duplicateNode: (id) => {
      const doc = get().document;
      if (!doc || id === doc.rootId) return null;
      const parentId = findParentId(doc.nodes, id);
      if (!parentId) return null;

      // Fresh id for every node in the subtree, then remap children + offset
      // the top-level copy so it doesn't sit exactly on the original.
      const subtree = collectSubtree(doc.nodes, id);
      const idMap = new Map(subtree.map((old) => [old, crypto.randomUUID()]));
      const clones: Record<string, PageNode> = {};
      for (const oldId of subtree) {
        const n = doc.nodes[oldId];
        const newId = idMap.get(oldId)!;
        clones[newId] = {
          ...n,
          id: newId,
          children: n.children.filter((c) => idMap.has(c)).map((c) => idMap.get(c)!),
          frame: { ...n.frame },
          props: { ...n.props },
          ...(n.padding ? { padding: { ...n.padding } } : {}),
          ...(n.margin ? { margin: { ...n.margin } } : {}),
          ...(n.boxShadow ? { boxShadow: { ...n.boxShadow } } : {}),
          ...(n.overrides ? { overrides: cloneOverrides(n.overrides) } : {}),
          ...(n.events
            ? { events: n.events.map((e) => ({ ...e, id: crypto.randomUUID() })) }
            : {}),
        };
      }
      const newRootId = idMap.get(id)!;
      const root = clones[newRootId];
      clones[newRootId] = {
        ...root,
        frame: { ...root.frame, x: root.frame.x + 16, y: root.frame.y + 16 },
      };

      apply((d) => {
        const parent = d.nodes[parentId];
        const children = [...parent.children];
        children.splice(children.indexOf(id) + 1, 0, newRootId);
        return {
          ...d,
          nodes: { ...d.nodes, ...clones, [parentId]: { ...parent, children } },
        };
      }, null);
      set({ selectedIds: [newRootId] });
      return newRootId;
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
        nodes[newParentId] = { ...newParent, children: [...newParent.children, id] };
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

    reorderNode: (id, dir) => {
      const doc = get().document;
      if (!doc) return;
      const parentId = findParentId(doc.nodes, id);
      if (!parentId) return;
      const parent = doc.nodes[parentId];
      const i = parent.children.indexOf(id);
      const j = dir === "forward" ? i + 1 : i - 1;
      if (j < 0 || j >= parent.children.length) return;
      const children = [...parent.children];
      [children[i], children[j]] = [children[j], children[i]];
      apply(
        (d) => ({ ...d, nodes: { ...d.nodes, [parentId]: { ...d.nodes[parentId], children } } }),
        null,
      );
    },

    moveNodeInto: (id, parentId) => {
      const doc = get().document;
      if (!doc || id === doc.rootId || id === parentId) return;
      if (!isContainer(doc.nodes, parentId)) return;
      if (collectSubtree(doc.nodes, id).includes(parentId)) return;
      const oldParentId = findParentId(doc.nodes, id);
      if (!oldParentId) return;
      apply((d) => {
        const nodes = { ...d.nodes };
        nodes[oldParentId] = {
          ...nodes[oldParentId],
          children: nodes[oldParentId].children.filter((c) => c !== id),
        };
        const np = nodes[parentId];
        nodes[parentId] = { ...np, children: [...np.children, id] };
        return { ...d, nodes };
      }, null);
    },

    moveNodeAdjacent: (id, refId, side) => {
      const doc = get().document;
      if (!doc || id === doc.rootId || id === refId) return;
      const refParentId = findParentId(doc.nodes, refId);
      if (!refParentId) return; // can't place a sibling of the root
      if (collectSubtree(doc.nodes, id).includes(refParentId)) return;
      const oldParentId = findParentId(doc.nodes, id);
      if (!oldParentId) return;
      apply((d) => {
        const nodes = { ...d.nodes };
        nodes[oldParentId] = {
          ...nodes[oldParentId],
          children: nodes[oldParentId].children.filter((c) => c !== id),
        };
        const rp = nodes[refParentId];
        const children = [...rp.children];
        const refIndex = children.indexOf(refId);
        children.splice(side === "before" ? refIndex : refIndex + 1, 0, id);
        nodes[refParentId] = { ...rp, children };
        return { ...d, nodes };
      }, null);
    },

    alignNodes: (ids, mode) => {
      const doc = get().document;
      if (!doc || ids.length < 2) return;
      // frame is parent-relative; only align when every target shares a parent,
      // otherwise we'd treat unrelated coordinate planes as one and fling nodes
      // outside their containers.
      if (!sameParent(doc.nodes, ids)) return;
      const bp = get().activeBreakpoint;
      const frames = ids
        .filter((id) => doc.nodes[id])
        .map((id) => resolveFrame(doc.nodes[id], bp));
      const minX = Math.min(...frames.map((f) => f.x));
      const maxR = Math.max(...frames.map((f) => f.x + f.w));
      const minY = Math.min(...frames.map((f) => f.y));
      const maxB = Math.max(...frames.map((f) => f.y + f.h));
      const cx = (minX + maxR) / 2;
      const cy = (minY + maxB) / 2;
      // Record only the changed axis so the override stays sparse and the
      // unchanged axis keeps inheriting.
      const next: Record<string, Partial<NodeFrame>> = {};
      for (const id of ids) {
        if (!doc.nodes[id]) continue;
        const f = resolveFrame(doc.nodes[id], bp);
        if (mode === "left") next[id] = { x: minX };
        else if (mode === "right") next[id] = { x: maxR - f.w };
        else if (mode === "hcenter") next[id] = { x: Math.round(cx - f.w / 2) };
        else if (mode === "top") next[id] = { y: minY };
        else if (mode === "bottom") next[id] = { y: maxB - f.h };
        else if (mode === "vcenter") next[id] = { y: Math.round(cy - f.h / 2) };
      }
      patchFrames(next, null);
    },

    distributeNodes: (ids, axis) => {
      const doc = get().document;
      if (!doc || ids.length < 3) return;
      // Same parent-relative coordinate guard as alignNodes.
      if (!sameParent(doc.nodes, ids)) return;
      const bp = get().activeBreakpoint;
      const items = ids
        .filter((id) => doc.nodes[id])
        .map((id) => ({ id, f: resolveFrame(doc.nodes[id], bp) }));
      if (items.length < 3) return;
      const center = (f: NodeFrame) => (axis === "h" ? f.x + f.w / 2 : f.y + f.h / 2);
      // Even out the centers between the first and last item (both stay put),
      // so differently-sized components read as evenly spaced.
      items.sort((a, b) => center(a.f) - center(b.f));
      const firstC = center(items[0].f);
      const lastC = center(items[items.length - 1].f);
      const step = (lastC - firstC) / (items.length - 1);
      // Only the distribution axis changes; record it as a partial.
      const next: Record<string, Partial<NodeFrame>> = {};
      items.forEach((it, i) => {
        const targetCenter = firstC + i * step;
        next[it.id] =
          axis === "h"
            ? { x: Math.round(targetCenter - it.f.w / 2) }
            : { y: Math.round(targetCenter - it.f.h / 2) };
      });
      patchFrames(next, null);
    },

    centerInParent: (ids, axis) => {
      const doc = get().document;
      if (!doc) return;
      const pc = findParentChild(doc.nodes, ids);
      if (!pc) return;
      const bp = get().activeBreakpoint;
      // Child frames are parent-relative, so center within the parent's padded
      // content box (children snap to that area). The other axis keeps
      // inheriting (sparse override).
      const pf = resolveFrame(doc.nodes[pc.parentId], bp);
      const pad = toSides(doc.nodes[pc.parentId].padding);
      const next: Record<string, Partial<NodeFrame>> = {};
      for (const cid of pc.childIds) {
        const cf = resolveFrame(doc.nodes[cid], bp);
        next[cid] =
          axis === "h"
            ? { x: Math.round(pad.left + (pf.w - pad.left - pad.right - cf.w) / 2) }
            : { y: Math.round(pad.top + (pf.h - pad.top - pad.bottom - cf.h) / 2) };
      }
      patchFrames(next, null);
    },

    setNodeHidden: (id, bp, hidden) => {
      if (bp === "desktop") return; // desktop is always visible
      patchNode(
        id,
        (node) => {
          const prev = node.overrides?.[bp];
          return {
            ...node,
            overrides: { ...node.overrides, [bp]: { ...prev, hidden } },
          };
        },
        `hidden:${id}:${bp}`,
      );
    },

    resetOverride: (id, bp) => {
      if (bp === "desktop") return; // no override to reset on the base
      patchNode(
        id,
        (node) => {
          if (!node.overrides?.[bp]) return node;
          const overrides: Partial<Record<Exclude<BreakpointId, "desktop">, NodeOverride>> = {
            ...node.overrides,
          };
          delete overrides[bp];
          return { ...node, overrides };
        },
        `reset:${id}:${bp}`,
      );
    },

    undo: () => {
      const { past, future, document } = get();
      if (!past.length || !document) return;
      set({
        document: past[past.length - 1],
        past: past.slice(0, -1),
        future: [document, ...future],
        lastTag: null,
        selectedIds: [],
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
        selectedIds: [],
      });
    },
  };
});
