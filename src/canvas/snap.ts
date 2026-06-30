import type { Modifier } from "@dnd-kit/core";
import { toSides } from "../types/page";
import type { Sides } from "../types/page";

export const SNAP_THRESHOLD = 6;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A box that may carry an outer margin (keeps a gap when others snap to it).
 * A `token:<key>` spacing ref is accepted (matches PageNode.margin) and resolves
 * to zero here — snap geometry has no document tokens, so a token margin simply
 * contributes no gap. */
export interface SnapBox extends Box {
  margin?: Sides | number | string;
}

/** Inner snap rectangle (e.g. a container's padded area). */
export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface AxisSnap {
  delta: number;
  guides: number[];
}

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

function boxEdges(b: SnapBox, axis: "x" | "y"): number[] {
  const m = toSides(b.margin);
  return axis === "x"
    ? [b.x - m.left, b.x + b.w + m.right, b.x + b.w / 2]
    : [b.y - m.top, b.y + b.h + m.bottom, b.y + b.h / 2];
}

export interface SnapResult {
  dx: number;
  dy: number;
  vGuides: number[];
  hGuides: number[];
}

export interface ResizeSnapResult {
  w: number;
  h: number;
  vGuides: number[];
  hGuides: number[];
}

/**
 * Compute snap deltas for a moving box against sibling boxes (edges/centers,
 * margin-aware) and an inner bounds rectangle (a container's padded area),
 * plus equal-spacing. All inputs share one coordinate space.
 */
export function computeSnap(
  moving: SnapBox,
  others: SnapBox[],
  bounds: Bounds | null,
  threshold = SNAP_THRESHOLD,
): SnapResult {
  const xEdges = boxEdges(moving, "x");
  const yEdges = boxEdges(moving, "y");
  const xTargets: number[] = [];
  const yTargets: number[] = [];
  if (bounds) {
    xTargets.push(bounds.x0, bounds.x1, (bounds.x0 + bounds.x1) / 2);
    yTargets.push(bounds.y0, bounds.y1, (bounds.y0 + bounds.y1) / 2);
  }
  for (const o of others) {
    xTargets.push(...boxEdges(o, "x"));
    yTargets.push(...boxEdges(o, "y"));
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

/**
 * Snap the bottom-right corner of a top-left-anchored resizing box to sibling
 * edges/centers (margin-aware) and the container's inner bounds.
 */
export function snapResize(
  box: SnapBox,
  others: SnapBox[],
  bounds: Bounds | null,
  threshold = SNAP_THRESHOLD,
): ResizeSnapResult {
  const xTargets: number[] = [];
  const yTargets: number[] = [];
  if (bounds) {
    xTargets.push(bounds.x0, bounds.x1, (bounds.x0 + bounds.x1) / 2);
    yTargets.push(bounds.y0, bounds.y1, (bounds.y0 + bounds.y1) / 2);
  }
  for (const o of others) {
    xTargets.push(...boxEdges(o, "x"));
    yTargets.push(...boxEdges(o, "y"));
  }

  const xSnap = edgeSnap([box.x + box.w], xTargets, threshold);
  const ySnap = edgeSnap([box.y + box.h], yTargets, threshold);

  return {
    w: box.w + (xSnap?.delta ?? 0),
    h: box.h + (ySnap?.delta ?? 0),
    vGuides: xSnap?.guides ?? [],
    hGuides: ySnap?.guides ?? [],
  };
}

/** Frame-space convenience for drop: returns the snapped top-left position. */
export function snapBox(
  moving: SnapBox,
  siblings: SnapBox[],
  bounds: Bounds | null,
  threshold = SNAP_THRESHOLD,
): { x: number; y: number } {
  const r = computeSnap(moving, siblings, bounds, threshold);
  return { x: moving.x + r.dx, y: moving.y + r.dy };
}

function numAttr(el: Element | null, name: string): number {
  return el ? parseFloat(el.getAttribute(name) ?? "0") || 0 : 0;
}

function marginOf(el: Element | null): Sides {
  return {
    top: numAttr(el, "data-mt"),
    right: numAttr(el, "data-mr"),
    bottom: numAttr(el, "data-mb"),
    left: numAttr(el, "data-ml"),
  };
}

export function domSnapContext(draggedEl: Element | null): {
  others: SnapBox[];
  bounds: Bounds | null;
  container: Element | null;
} {
  const container = draggedEl?.parentElement?.closest("[data-node-id]") ?? null;

  let bounds: Bounds | null = null;
  if (container) {
    const cr = container.getBoundingClientRect();
    bounds = {
      x0: cr.left + numAttr(container, "data-pl"),
      y0: cr.top + numAttr(container, "data-pt"),
      x1: cr.right - numAttr(container, "data-pr"),
      y1: cr.bottom - numAttr(container, "data-pb"),
    };
  }

  const others: SnapBox[] = [];
  document.querySelectorAll("[data-node-id]").forEach((el) => {
    if (el === draggedEl || el === container) return;
    const par = el.parentElement?.closest("[data-node-id]");
    if (par !== container) return;
    const r = el.getBoundingClientRect();
    others.push({ x: r.left, y: r.top, w: r.width, h: r.height, margin: marginOf(el) });
  });

  return { others, bounds, container };
}

/**
 * dnd-kit modifier: live magnetic snapping. Snaps to siblings (margin-aware)
 * and the parent container's padded inner bounds; reports guide lines.
 */
export function createSnapModifier(
  onGuides?: (g: { vx: number[]; hy: number[] }) => void,
  threshold = SNAP_THRESHOLD,
): Modifier {
  return ({ active, transform, activeNodeRect, draggingNodeRect }) => {
    // Use the active node's real rect (the actual component), not the drag
    // overlay/placeholder rect, so snapping is based on the true size.
    const rect = activeNodeRect ?? draggingNodeRect;
    if (!active || !rect) return transform;
    const nodeId = String(active.id).replace(/^drag:/, "");
    const draggedEl = document.querySelector(`[data-node-id="${nodeId}"]`);
    const { others, bounds } = domSnapContext(draggedEl);

    const moving: SnapBox = {
      x: rect.left + transform.x,
      y: rect.top + transform.y,
      w: rect.width,
      h: rect.height,
      margin: marginOf(draggedEl),
    };

    const snap = computeSnap(moving, others, bounds, threshold);
    onGuides?.({ vx: snap.vGuides, hy: snap.hGuides });
    return { ...transform, x: transform.x + snap.dx, y: transform.y + snap.dy };
  };
}
