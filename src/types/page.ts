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

/**
 * Normalize a side value to a numeric Sides. Accepts a uniform number, a Sides,
 * a `token:<key>` spacing reference (resolved against `tokens` and applied
 * uniformly; a dangling ref → zero), or missing.
 */
export function toSides(
  v: Sides | number | string | undefined | null,
  tokens?: DocumentTokens,
): Sides {
  if (v == null) return ZERO_SIDES;
  if (typeof v === "string") {
    const n = resolveSpacing(v, tokens);
    return n == null ? ZERO_SIDES : { top: n, right: n, bottom: n, left: n };
  }
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
  /** Inner padding — explicit per-side values, or a `token:<key>` spacing-token
   * reference applied uniformly to all sides. Children snap to the padded area. */
  padding?: Sides | string;
  /** Outer margin — explicit per-side values, or a `token:<key>` spacing-token
   * reference applied uniformly. Siblings keep this gap when snapping. */
  margin?: Sides | string;
  /** Per-breakpoint overrides; desktop is the base frame (no override). */
  overrides?: Partial<Record<Exclude<BreakpointId, "desktop">, NodeOverride>>;
  /** Interaction bindings (trigger → action), emitted to the spec and code. */
  events?: EventBinding[];
}

/** Document-level design tokens. A node points at a color/spacing token by
 * storing `token:<key>` in the matching field (background, padding, margin);
 * fonts are applied document-wide rather than referenced per node.
 * - colors: named CSS colors (v1)
 * - fonts: named font-family stacks; `body` is applied to the page root (v2)
 * - spacing: named px values referenced uniformly by padding/margin (v2) */
export interface DocumentTokens {
  colors?: Record<string, string>;
  fonts?: Record<string, string>;
  spacing?: Record<string, number>;
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

// --- Design tokens --------------------------------------------------------
// A node references a token by storing `token:<key>` in a field instead of a
// literal value: background → color tokens, padding/margin → spacing tokens.
// Rendering resolves the ref; code export emits a CSS custom property
// (`var(--color-<key>)` / `var(--space-<key>)`) backed by a `:root` block.
// Fonts are not referenced per node — they apply document-wide (see baseDecls).

const TOKEN_PREFIX = "token:";

/** Token keys map to CSS custom property names, so keep them identifier-like:
 * start with a letter, then letters/digits/hyphens. */
export function isValidTokenKey(key: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9-]*$/.test(key);
}

/** True when a field holds a `token:<key>` reference rather than a literal. */
function isTokenRef(value: string | Sides | undefined): value is string {
  return typeof value === "string" && value.startsWith(TOKEN_PREFIX);
}

/** Extract the token key from a `token:<key>` reference. */
function tokenKey(ref: string): string {
  return ref.slice(TOKEN_PREFIX.length);
}

// --- Color tokens ---
/** Build the sentinel a node stores to point at a color token. */
export function makeColorTokenRef(key: string): string {
  return TOKEN_PREFIX + key;
}

/** True when a color field holds a token reference rather than a literal color. */
export function isColorTokenRef(value: string | undefined): value is string {
  return isTokenRef(value);
}

/** Extract the token key from a `token:<key>` color reference. */
export function colorTokenKey(ref: string): string {
  return tokenKey(ref);
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

// --- Spacing tokens ---
/** Build the sentinel a node stores in padding/margin to point at a spacing token. */
export function makeSpacingTokenRef(key: string): string {
  return TOKEN_PREFIX + key;
}

/** True when a padding/margin field holds a spacing token reference. */
export function isSpacingTokenRef(value: string | Sides | undefined): value is string {
  return isTokenRef(value);
}

/** Extract the token key from a `token:<key>` spacing reference. */
export function spacingTokenKey(ref: string): string {
  return tokenKey(ref);
}

/** CSS custom property name for a spacing token key. */
export function spacingTokenVar(key: string): string {
  return `--space-${key}`;
}

/**
 * Resolve a padding/margin value to its px number when it is a spacing-token
 * reference, or undefined otherwise (a literal Sides is handled by the caller)
 * — including a dangling ref (token deleted), so the spacing simply drops.
 */
export function resolveSpacing(
  value: string | Sides | undefined,
  tokens: DocumentTokens | undefined,
): number | undefined {
  if (!isSpacingTokenRef(value)) return undefined;
  return sanitizeSpacing(tokens?.spacing?.[spacingTokenKey(value)]) ?? undefined;
}

// --- Font tokens ---
/** CSS custom property name for a font token key. */
export function fontTokenVar(key: string): string {
  return `--font-${key}`;
}

/** The document's base font-family (the `body` font token), sanitized, or
 * undefined — applied to the page root so all text inherits it. */
export function documentFontFamily(tokens: DocumentTokens | undefined): string | undefined {
  return sanitizeFontFamily(tokens?.fonts?.body) ?? undefined;
}

// --- Trust boundary (A03: CSS injection) ---
/**
 * A token value or literal background is user-supplied and gets interpolated
 * into generated CSS / SVG, so allow only simple color forms — otherwise a
 * value like `red; } body { ... ` could break out of a `:root`/`<style>` block.
 * Returns the trimmed color when safe, or null so callers drop it.
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

/**
 * Trust boundary for a font-family value (interpolated into CSS). Allow only a
 * font stack of names/keywords — letters, digits, spaces, commas, quotes,
 * hyphens, underscores — so `;`/`{`/`}`/`(` can't break out of the stylesheet.
 * Returns the trimmed value when safe, or null so callers drop it.
 */
export function sanitizeFontFamily(font: string | undefined): string | null {
  if (!font) return null;
  const f = font.trim();
  if (!f) return null;
  return /^[a-zA-Z0-9 ,"'_-]+$/.test(f) ? f : null;
}

/**
 * Trust boundary for a spacing value (emitted as `<n>px`). Coerce to a finite,
 * non-negative integer; anything else (NaN, string from external JSON, negative)
 * returns null so callers drop it.
 */
export function sanitizeSpacing(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}
