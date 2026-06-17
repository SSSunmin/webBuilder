import type { Modifier } from "@dnd-kit/core";

export const SNAP_THRESHOLD = 6;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Best delta to add to align one of `edges` to one of `targets` (or null). */
function bestSnap(
  edges: number[],
  targets: number[],
  threshold: number,
): number | null {
  let best: number | null = null;
  let bestDist = threshold + 1;
  for (const e of edges) {
    for (const t of targets) {
      const d = t - e;
      const ad = Math.abs(d);
      if (ad <= threshold && ad < bestDist) {
        bestDist = ad;
        best = d;
      }
    }
  }
  return best;
}

/**
 * Snap a moving box (in parent-relative coords) to sibling edges/centers and
 * the container bounds. Returns the adjusted top-left position.
 */
export function snapBox(
  moving: Box,
  siblings: Box[],
  bounds: { w: number; h: number },
  threshold = SNAP_THRESHOLD,
): { x: number; y: number } {
  const xEdges = [moving.x, moving.x + moving.w, moving.x + moving.w / 2];
  const yEdges = [moving.y, moving.y + moving.h, moving.y + moving.h / 2];

  const xTargets = [0, bounds.w, bounds.w / 2];
  const yTargets = [0, bounds.h, bounds.h / 2];
  for (const s of siblings) {
    xTargets.push(s.x, s.x + s.w, s.x + s.w / 2);
    yTargets.push(s.y, s.y + s.h, s.y + s.h / 2);
  }

  const dx = bestSnap(xEdges, xTargets, threshold);
  const dy = bestSnap(yEdges, yTargets, threshold);
  return { x: moving.x + (dx ?? 0), y: moving.y + (dy ?? 0) };
}

/**
 * dnd-kit modifier: live magnetic snapping of the dragged node to its siblings'
 * edges/centers and the parent container's bounds (viewport coords via DOM).
 */
export function createSnapModifier(threshold = SNAP_THRESHOLD): Modifier {
  return ({ active, transform, draggingNodeRect }) => {
    if (!active || !draggingNodeRect) return transform;
    const nodeId = String(active.id).replace(/^drag:/, "");
    const draggedEl = document.querySelector(`[data-node-id="${nodeId}"]`);
    const container =
      draggedEl?.parentElement?.closest("[data-node-id]") ?? null;

    const left = draggingNodeRect.left + transform.x;
    const top = draggingNodeRect.top + transform.y;
    const w = draggingNodeRect.width;
    const h = draggingNodeRect.height;
    const xEdges = [left, left + w, left + w / 2];
    const yEdges = [top, top + h, top + h / 2];

    const xTargets: number[] = [];
    const yTargets: number[] = [];
    document.querySelectorAll("[data-node-id]").forEach((el) => {
      if (el === draggedEl) return;
      if (el !== container) {
        const par = el.parentElement?.closest("[data-node-id]");
        if (par !== container) return; // only siblings + the container itself
      }
      const r = el.getBoundingClientRect();
      xTargets.push(r.left, r.right, r.left + r.width / 2);
      yTargets.push(r.top, r.bottom, r.top + r.height / 2);
    });

    const dx = bestSnap(xEdges, xTargets, threshold);
    const dy = bestSnap(yEdges, yTargets, threshold);
    return {
      ...transform,
      x: transform.x + (dx ?? 0),
      y: transform.y + (dy ?? 0),
    };
  };
}
