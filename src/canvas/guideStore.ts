export interface Guides {
  /** Vertical guide lines at these viewport x-coordinates. */
  vx: number[];
  /** Horizontal guide lines at these viewport y-coordinates. */
  hy: number[];
}

const EMPTY: Guides = { vx: [], hy: [] };

let state: Guides = EMPTY;
const listeners = new Set<() => void>();

function notify() {
  // Defer so we never trigger a React update during another render
  // (the dnd-kit snap modifier runs in render).
  queueMicrotask(() => listeners.forEach((l) => l()));
}

export const guideStore = {
  get: (): Guides => state,
  set: (next: Guides) => {
    if (!next.vx.length && !next.hy.length && state === EMPTY) return;
    state = next.vx.length || next.hy.length ? next : EMPTY;
    notify();
  },
  clear: () => {
    if (state === EMPTY) return;
    state = EMPTY;
    notify();
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
