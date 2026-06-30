import { getComponentDef } from "../registry";
import { resolveFlow } from "../types/page";
import type { PageNode } from "../types/page";

export interface FlowRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What a drag should do when the dragged node lives in a flex (flow) container. */
export type FlowDragAction =
  | { kind: "reorder"; id: string; refId: string; side: "before" | "after" }
  | { kind: "reparent"; id: string; parentId: string }
  | null;

function parentOf(nodes: Record<string, PageNode>, childId: string): string | null {
  for (const node of Object.values(nodes)) {
    if (node.children.includes(childId)) return node.id;
  }
  return null;
}

/**
 * Which side of `over` to insert `active`, by comparing main-axis centers
 * (row → x, column → y). Pure geometry — the rects come from the DOM at drop time.
 */
export function flowDropSide(
  active: FlowRect,
  over: FlowRect,
  direction: "row" | "column",
): "before" | "after" {
  if (direction === "column") {
    return active.y + active.h / 2 < over.y + over.h / 2 ? "before" : "after";
  }
  return active.x + active.w / 2 < over.x + over.w / 2 ? "before" : "after";
}

/**
 * Decide what dragging `activeId` over `overId` should do — but only when
 * `activeId` lives in a flex (flow) container. Returns null when it doesn't (the
 * caller then falls back to the absolute drag path) or when no flow action fits:
 * - over a sibling in the same flex parent → reorder (before/after by main axis)
 * - over a different container → reparent (append; position is meaningless in flow)
 *
 * Keeping this pure (rects in, decision out) lets the drag wiring stay a thin
 * adapter and makes the reorder/append logic unit-testable without a real DOM.
 */
export function resolveFlowDrag(
  nodes: Record<string, PageNode>,
  activeId: string,
  overId: string | undefined,
  activeRect: FlowRect | null,
  overRect: FlowRect | null,
): FlowDragAction {
  const parentId = parentOf(nodes, activeId);
  const parent = parentId ? nodes[parentId] : null;
  const flow = parent ? resolveFlow(parent) : null;
  if (!flow || !overId || overId === activeId) return null;

  // Sibling in the same flex parent → reorder.
  if (parentOf(nodes, overId) === parentId) {
    if (!activeRect || !overRect) return null;
    return {
      kind: "reorder",
      id: activeId,
      refId: overId,
      side: flowDropSide(activeRect, overRect, flow.flexDirection),
    };
  }
  // A different container under the pointer → append into it.
  if (overId !== parentId && getComponentDef(nodes[overId]?.type ?? "")?.isContainer) {
    return { kind: "reparent", id: activeId, parentId: overId };
  }
  return null;
}
