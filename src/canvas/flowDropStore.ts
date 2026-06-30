/** The live insertion target while dragging a flex (flow) child on the canvas:
 * the sibling being hovered, which side the dragged item would land, and the
 * container's flex direction (so the indicator draws a vertical or horizontal
 * bar). Mirrors guideStore — a tiny external store so NodeView can render the
 * indicator without threading drag state through the tree. */
export interface FlowDrop {
  overId: string;
  side: "before" | "after";
  direction: "row" | "column";
}

let state: FlowDrop | null = null;
const listeners = new Set<() => void>();

function same(a: FlowDrop | null, b: FlowDrop | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.overId === b.overId && a.side === b.side && a.direction === b.direction;
}

function notify() {
  // Defer so we never trigger a React update during another render
  // (the drag handlers can run within dnd-kit's render cycle).
  queueMicrotask(() => listeners.forEach((l) => l()));
}

export const flowDropStore = {
  get: (): FlowDrop | null => state,
  set: (next: FlowDrop | null) => {
    if (same(state, next)) return;
    state = next;
    notify();
  },
  clear: () => {
    if (state === null) return;
    state = null;
    notify();
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
