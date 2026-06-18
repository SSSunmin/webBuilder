export interface NodeFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Per-side spacing values (px). */
export interface Sides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const ZERO_SIDES: Sides = { top: 0, right: 0, bottom: 0, left: 0 };

/** Normalize a side value that may be a uniform number, a Sides, or missing. */
export function toSides(v: Sides | number | undefined | null): Sides {
  if (v == null) return ZERO_SIDES;
  if (typeof v === "number") return { top: v, right: v, bottom: v, left: v };
  return {
    top: v.top ?? 0,
    right: v.right ?? 0,
    bottom: v.bottom ?? 0,
    left: v.left ?? 0,
  };
}

export interface PageNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children: string[];
  /** Absolute position/size within the parent's box. */
  frame: NodeFrame;
  /** Optional background color (CSS color). */
  background?: string;
  /** Corner radius (px). Applied to the node box so the background and
   * border follow the same rounded corners. */
  borderRadius?: number;
  /** Inner padding (per side) — children snap to the padded inner area. */
  padding?: Sides;
  /** Outer margin (per side) — siblings keep this gap when snapping. */
  margin?: Sides;
}

export interface PageDocument {
  id: string;
  version: 1;
  rootId: string;
  nodes: Record<string, PageNode>;
  meta: {
    name: string;
    createdAt: string;
    updatedAt: string;
    thumbnail?: string;
  };
}

export interface PageMeta {
  id: string;
  name: string;
  updatedAt: string;
}
