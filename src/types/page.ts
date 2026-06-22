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

export type BreakpointId = "desktop" | "tablet" | "mobile";

export interface BreakpointDef {
  id: BreakpointId;
  label: string;
  width: number;
}

export const BREAKPOINTS: BreakpointDef[] = [
  { id: "desktop", label: "데스크탑", width: 1280 },
  { id: "tablet", label: "태블릿", width: 768 },
  { id: "mobile", label: "모바일", width: 375 },
];

/** Per-breakpoint override of a node's layout. Only the changed fields are kept. */
export interface NodeOverride {
  frame?: Partial<NodeFrame>;
  hidden?: boolean;
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
  /** Per-breakpoint overrides; desktop is the base frame (no override). */
  overrides?: Partial<Record<Exclude<BreakpointId, "desktop">, NodeOverride>>;
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

/**
 * Resolve a node's frame at a breakpoint by cascading desktop-first:
 * desktop (base) → tablet override → mobile override.
 */
export function resolveFrame(node: PageNode, bp: BreakpointId): NodeFrame {
  let frame: NodeFrame = { ...node.frame };
  if (bp === "tablet" || bp === "mobile") frame = { ...frame, ...node.overrides?.tablet?.frame };
  if (bp === "mobile") frame = { ...frame, ...node.overrides?.mobile?.frame };
  return frame;
}

/**
 * Resolve a node's hidden state at a breakpoint, cascading desktop-first.
 * A later breakpoint can re-show a node hidden by an earlier one.
 */
export function resolveHidden(node: PageNode, bp: BreakpointId): boolean {
  let hidden = false;
  if (bp === "tablet" || bp === "mobile") hidden = node.overrides?.tablet?.hidden ?? hidden;
  if (bp === "mobile") hidden = node.overrides?.mobile?.hidden ?? hidden;
  return hidden;
}
