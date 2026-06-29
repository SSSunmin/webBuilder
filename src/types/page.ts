import type { EventBinding } from "./events";

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

/** Pixel-level drop shadow. Maps 1:1 to a CSS box-shadow's parameters. */
export interface ShadowSpec {
  /** Horizontal offset (px). */
  x: number;
  /** Vertical offset (px). */
  y: number;
  /** Blur radius (px, ≥ 0). */
  blur: number;
  /** Spread radius (px). */
  spread: number;
  /** Shadow color as a hex string (#rgb or #rrggbb). */
  color: string;
  /** Alpha 0–1 applied to the color. */
  opacity: number;
}

/** Sensible starting shadow when a node first enables one. */
export const DEFAULT_SHADOW: ShadowSpec = {
  x: 0,
  y: 4,
  blur: 12,
  spread: 0,
  color: "#000000",
  opacity: 0.15,
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 8) h = h.slice(0, 6); // #rrggbbaa → drop alpha (opacity handles it)
  const n = Number.parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return { r: 0, g: 0, b: 0 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Build the CSS box-shadow value for a spec, or undefined when absent. */
export function shadowCss(spec: ShadowSpec | undefined): string | undefined {
  if (!spec) return undefined;
  const { r, g, b } = hexToRgb(spec.color || "#000000");
  const a = Math.max(0, Math.min(1, spec.opacity));
  return `${spec.x}px ${spec.y}px ${Math.max(0, spec.blur)}px ${spec.spread}px rgba(${r}, ${g}, ${b}, ${a})`;
}

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
  /** Pixel-level drop shadow; undefined = none. */
  boxShadow?: ShadowSpec;
  /** Inner padding (per side) — children snap to the padded inner area. */
  padding?: Sides;
  /** Outer margin (per side) — siblings keep this gap when snapping. */
  margin?: Sides;
  /** Per-breakpoint overrides; desktop is the base frame (no override). */
  overrides?: Partial<Record<Exclude<BreakpointId, "desktop">, NodeOverride>>;
  /** Interaction bindings (trigger → action), emitted to the spec and code. */
  events?: EventBinding[];
}

/** Document-level design tokens. v1 carries named colors only; a node points at
 * a color by storing `token:<key>` in a color field (see {@link makeColorTokenRef}). */
export interface DocumentTokens {
  colors?: Record<string, string>;
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
    /** Document-level design tokens (v1: named colors referenced by nodes). */
    tokens?: DocumentTokens;
  };
}

export interface PageMeta {
  id: string;
  name: string;
  updatedAt: string;
  /** SVG wireframe data URI for the home card preview. */
  thumbnail?: string;
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

// --- Design tokens (v1: named colors) -------------------------------------
// A node references a token by storing `token:<key>` in a color field instead
// of a literal color. Rendering resolves the ref to its hex value; code export
// emits a CSS custom property (`var(--color-<key>)`) backed by a `:root` block.

const COLOR_TOKEN_PREFIX = "token:";

/** Token keys map to CSS custom property names, so keep them identifier-like:
 * start with a letter, then letters/digits/hyphens. */
export function isValidTokenKey(key: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9-]*$/.test(key);
}

/** Build the sentinel a node stores to point at a color token. */
export function makeColorTokenRef(key: string): string {
  return COLOR_TOKEN_PREFIX + key;
}

/** True when a color field holds a token reference rather than a literal color. */
export function isColorTokenRef(value: string | undefined): value is string {
  return typeof value === "string" && value.startsWith(COLOR_TOKEN_PREFIX);
}

/** Extract the token key from a `token:<key>` reference. */
export function colorTokenKey(ref: string): string {
  return ref.slice(COLOR_TOKEN_PREFIX.length);
}

/** CSS custom property name for a color token key. */
export function colorTokenVar(key: string): string {
  return `--color-${key}`;
}

/**
 * Resolve a color field to a literal CSS color for rendering. A token ref is
 * looked up in the document's tokens; a dangling ref (token deleted/renamed)
 * resolves to undefined so the node simply renders without a background rather
 * than showing the raw `token:` string.
 */
export function resolveColor(
  value: string | undefined,
  tokens: DocumentTokens | undefined,
): string | undefined {
  if (!isColorTokenRef(value)) return value;
  return tokens?.colors?.[colorTokenKey(value)];
}

/**
 * Trust boundary for color values. A token value or literal background is
 * user-supplied and gets interpolated into generated CSS / SVG, so allow only
 * simple color forms — otherwise a value like `red; } body { ... ` could break
 * out of a `:root`/`<style>` block (CSS injection, A03). Returns the trimmed
 * color when safe, or null so callers drop it rather than emit it raw.
 */
export function sanitizeColor(color: string | undefined): string | null {
  if (!color) return null;
  const c = color.trim();
  if (!c) return null;
  // hex, rgb()/rgba(), hsl()/hsla(), or a bare color keyword
  if (/^#[0-9a-fA-F]{3,8}$/.test(c)) return c;
  if (/^(rgb|rgba|hsl|hsla)\([0-9.,%\s/]+\)$/.test(c)) return c;
  if (/^[a-zA-Z]+$/.test(c)) return c;
  return null;
}
