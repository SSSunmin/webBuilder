import type { Modifier } from "@dnd-kit/core";

export const SNAP_THRESHOLD = 6;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface AxisSnap {
  delta: number;
  guides: number[];
}

/** Snap an edge to the nearest aligned target edge within threshold. */
function edgeSnap(edges: number[], targets: number[], threshold: number): AxisSnap | null {
  let best: number | null = null;
  let target = 0;
  let bestDist = threshold + 1;
  for (const e of edges) {
    for (const t of targets) {
      const d = t - e;
      const ad = Math.abs(d);
      if (ad <= threshold && ad < bestDist) {
        bestDist = ad;
        best = d;
        target = t;
      }
    }
  }
  return best === null ? null : { delta: best, guides: [target] };
}

/** Snap so the moving box is equally spaced between a left/right neighbor. */
function spacingSnap(
  moving: Box,
  others: Box[],
  axis: "x" | "y",
  threshold: number,
): AxisSnap | null {
  const lo = (b: Box) => (axis === "x" ? b.x : b.y);
  const hi = (b: Box) => (axis === "x" ? b.x + b.w : b.y + b.h);
  const overlaps = (b: Box) =>
    axis === "x"
      ? b.y < moving.y + moving.h && b.y + b.h > moving.y
      : b.x < moving.x + moving.w && b.x + b.w > moving.x;

  const mLo = lo(moving);
  const mHi = hi(moving);
  let left: Box | null = null;
  let right: Box | null = null;
  for (const o of others) {
    if (!overlaps(o)) continue;
    if (hi(o) <= mLo + threshold && (!left || hi(o) > hi(left))) left = o;
    if (lo(o) >= mHi - threshold && (!right || lo(o) < lo(right))) right = o;
  }
  if (!left || !right) return null;
  const targetLo = (hi(left) + lo(right) - (mHi - mLo)) / 2;
  const delta = targetLo - mLo;
  if (Math.abs(delta) > threshold) return null;
  return { delta, guides: [hi(left), lo(right)] };
}

function pick(a: AxisSnap | null, b: AxisSnap | null): AxisSnap | null {
  if (!a) return b;
  if (!b) return a;
  return Math.abs(b.delta) < Math.abs(a.delta) ? b : a;
}

export interface SnapResult {
  dx: number;
  dy: number;
  vGuides: number[];
  hGuides: number[];
}

/**
 * Compute snap deltas for a moving box against other boxes (edges + centers)
 * and optional container bounds, plus equal-spacing. All in one coord space.
 */
export function computeSnap(
  moving: Box,
  others: Box[],
  bounds: { w: number; h: number } | null,
  threshold = SNAP_THRESHOLD,
): SnapResult {
  const xEdges = [moving.x, moving.x + moving.w, moving.x + moving.w / 2];
  const yEdges = [moving.y, moving.y + moving.h, moving.y + moving.h / 2];
  const xTargets: number[] = [];
  const yTargets: number[] = [];
  if (bounds) {
    xTargets.push(0, bounds.w, bounds.w / 2);
    yTargets.push(0, bounds.h, bounds.h / 2);
  }
  for (const o of others) {
    xTargets.push(o.x, o.x + o.w, o.x + o.w / 2);
    yTargets.push(o.y, o.y + o.h, o.y + o.h / 2);
  }

  const px = pick(edgeSnap(xEdges, xTargets, threshold), spacingSnap(moving, others, "x", threshold));
  const py = pick(edgeSnap(yEdges, yTargets, threshold), spacingSnap(moving, others, "y", threshold));

  return {
    dx: px?.delta ?? 0,
    dy: py?.delta ?? 0,
    vGuides: px?.guides ?? [],
    hGuides: py?.guides ?? [],
  };
}

/** Frame-space convenience for drop: returns the snapped top-left position. */
export function snapBox(
  moving: Box,
  siblings: Box[],
  bounds: { w: number; h: number },
  threshold = SNAP_THRESHOLD,
): { x: number; y: number } {
  const r = computeSnap(moving, siblings, bounds, threshold);
  return { x: moving.x + r.dx, y: moving.y + r.dy };
}

/**
 * dnd-kit modifier: live magnetic snapping (siblings + container bounds) with
 * guide-line reporting in viewport coords via `onGuides`.
 */
export function createSnapModifier(
  onGuides?: (g: { vx: number[]; hy: number[] }) => void,
  threshold = SNAP_THRESHOLD,
): Modifier {
  return ({ active, transform, draggingNodeRect }) => {
    if (!active || !draggingNodeRect) return transform;
    const nodeId = String(active.id).replace(/^drag:/, "");
    const draggedEl = document.querySelector(`[data-node-id="${nodeId}"]`);
    const container = draggedEl?.parentElement?.closest("[data-node-id]") ?? null;

    const moving: Box = {
      x: draggingNodeRect.left + transform.x,
      y: draggingNodeRect.top + transform.y,
      w: draggingNodeRect.width,
      h: draggingNodeRect.height,
    };

    const others: Box[] = [];
    document.querySelectorAll("[data-node-id]").forEach((el) => {
      if (el === draggedEl) return;
      if (el !== container) {
        const par = el.parentElement?.closest("[data-node-id]");
        if (par !== container) return; // only siblings + the container itself
      }
      const r = el.getBoundingClientRect();
      others.push({ x: r.left, y: r.top, w: r.width, h: r.height });
    });

    const snap = computeSnap(moving, others, null, threshold);
    onGuides?.({ vx: snap.vGuides, hy: snap.hGuides });
    return { ...transform, x: transform.x + snap.dx, y: transform.y + snap.dy };
  };
}
