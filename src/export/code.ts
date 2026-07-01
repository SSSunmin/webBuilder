import { getComponentDef } from "../registry";
import type {
  BreakpointId,
  DocumentTokens,
  PageDocument,
  PageNode,
  ResolvedFlow,
  ResolvedGrid,
  Sides,
} from "../types/page";
import {
  BREAKPOINTS,
  colorTokenKey,
  colorTokenVar,
  fontTokenVar,
  isColorTokenRef,
  isSpacingTokenRef,
  resolveFlow,
  resolveGrid,
  sanitizeColor,
  sanitizeFontFamily,
  sanitizeSpacing,
  shadowCss,
  spacingTokenKey,
  spacingTokenVar,
  toSides,
} from "../types/page";
import { TRIGGER_PROP, actionBody, actionNeedsEvent, safeComment } from "../types/events";

function indentBlock(code: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return code
    .split("\n")
    .map((l) => (l.length ? pad + l : l))
    .join("\n");
}

const BP_WIDTH = Object.fromEntries(BREAKPOINTS.map((b) => [b.id, b.width])) as Record<
  BreakpointId,
  number
>;

/** Format a Sides as a CSS spacing value: omitted (null) when all zero, a single
 * px value when uniform, or a "top right bottom left" px shorthand. */
function cssSpacing(sides: Sides): string | null {
  const { top, right, bottom, left } = sides;
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return null;
  if (top === right && right === bottom && bottom === left) return `${top}px`;
  return `${top}px ${right}px ${bottom}px ${left}px`;
}

/**
 * A padding/margin CSS declaration. A spacing-token ref becomes `var(--space-…)`
 * backed by the :root block — but only when the token still exists and resolves
 * to a safe number; a dangling/invalid ref drops the spacing (matches toSides
 * + rootTokenBlock). A literal Sides becomes a px value/shorthand.
 */
function spacingDecl(
  prop: "padding" | "margin",
  value: Sides | string | undefined,
  tokens: DocumentTokens | undefined,
): string | null {
  if (isSpacingTokenRef(value)) {
    const key = spacingTokenKey(value);
    return sanitizeSpacing(tokens?.spacing?.[key]) !== null
      ? `${prop}: var(${spacingTokenVar(key)})`
      : null;
  }
  const css = cssSpacing(toSides(value, tokens));
  return css ? `${prop}: ${css}` : null;
}

/** CSS declarations for a flex container's child wrapper. Children wrap so a
 * narrower container reflows them; values come from resolveFlow (gap sanitized,
 * enums mapped to fixed keywords) so nothing here can break out of the block. */
function flowDecls(flow: ResolvedFlow, forceResets = false): string[] {
  const parts = [
    "display: flex",
    `flex-direction: ${flow.flexDirection}`,
    "flex-wrap: wrap",
    "width: 100%",
    "height: 100%",
    "box-sizing: border-box",
  ];
  if (flow.gap || forceResets) parts.push(`gap: ${flow.gap}px`);
  parts.push(`align-items: ${flow.alignItems}`, `justify-content: ${flow.justifyContent}`);
  return parts;
}

function gridDecls(grid: ResolvedGrid, forceResets = false): string[] {
  const parts = [
    "display: grid",
    `grid-template-columns: ${grid.gridTemplateColumns}`,
    "width: 100%",
    "height: 100%",
    "box-sizing: border-box",
  ];
  if (grid.gridTemplateRows) parts.push(`grid-template-rows: ${grid.gridTemplateRows}`);
  else if (forceResets) parts.push("grid-template-rows: none");
  if (grid.gap || forceResets) parts.push(`gap: ${grid.gap}px`);
  parts.push(`align-items: ${grid.alignItems}`, `justify-content: ${grid.justifyContent}`);
  return parts;
}

function hasLayoutOverride(node: PageNode, bp: Exclude<BreakpointId, "desktop">): boolean {
  const ov = node.overrides?.[bp];
  return !!(
    ov &&
    (ov.flexDirection !== undefined ||
      ov.gridColumns !== undefined ||
      ov.gridRows !== undefined ||
      ov.gap !== undefined ||
      ov.alignItems !== undefined ||
      ov.justifyContent !== undefined)
  );
}

function pushWrapperOverrideRules(
  acc: CssAccum,
  cls: string,
  node: PageNode,
  mode: "flex" | "grid",
): void {
  for (const bp of ["tablet", "mobile"] as const) {
    if (!hasLayoutOverride(node, bp)) continue;
    const resolved = mode === "flex" ? resolveFlow(node, bp) : resolveGrid(node, bp);
    const decls =
      mode === "flex"
        ? resolved && flowDecls(resolved as ResolvedFlow, true)
        : resolved && gridDecls(resolved as ResolvedGrid, true);
    // why: wrapper layout lives on `.pg-N-c`, not `.pg-N`; emit the full rule so media order wins.
    if (decls) acc[bp].push(`.${cls} { ${decls.join("; ")}; }`);
  }
}

/** Base (desktop) CSS declarations for a node's frame + box styling. `inFlow` =
 * the parent is a flex container, so this node flows (relative, fixed size)
 * instead of being absolutely positioned. */
function baseDecls(
  node: PageNode,
  isRoot: boolean,
  tokens: DocumentTokens | undefined,
  inFlow: boolean,
  inGrid: boolean,
): string[] {
  const f = node.frame;
  const parts = isRoot
    ? ["position: relative", `width: ${f.w}px`, `height: ${f.h}px`, "margin: 0 auto"]
    : inGrid
      ? ["position: relative", `width: ${f.w}px`, `height: ${f.h}px`]
      : inFlow
      ? ["position: relative", `width: ${f.w}px`, `height: ${f.h}px`, "flex: 0 0 auto"]
      : [
          "position: absolute",
          `left: ${f.x}px`,
          `top: ${f.y}px`,
          `width: ${f.w}px`,
          `height: ${f.h}px`,
        ];
  if (node.background) {
    // A token reference becomes a CSS custom property backed by the :root block —
    // but only when the token still exists AND its value is a safe color; a
    // dangling or unsafe ref drops the background, matching resolveColor + the
    // :root block (rootTokenBlock filters the same way). A literal color is
    // sanitized so a value like `red; } ...` can't break out of the stylesheet.
    if (isColorTokenRef(node.background)) {
      const key = colorTokenKey(node.background);
      if (sanitizeColor(tokens?.colors?.[key])) parts.push(`background: var(${colorTokenVar(key)})`);
    } else {
      const bg = sanitizeColor(node.background);
      if (bg) parts.push(`background: ${bg}`);
    }
  }
  if (typeof node.borderRadius === "number") parts.push(`border-radius: ${node.borderRadius}px`);
  const shadow = shadowCss(node.boxShadow);
  if (shadow) parts.push(`box-shadow: ${shadow}`);
  const padding = spacingDecl("padding", node.padding, tokens);
  if (padding) parts.push(padding);
  // Root keeps its "0 auto" centering margin; user margin applies elsewhere.
  if (!isRoot) {
    const margin = spacingDecl("margin", node.margin, tokens);
    if (margin) parts.push(margin);
  }
  // The page root applies the document's base font (the `body` font token) so
  // every node inherits it; emitted as a custom property backed by :root.
  if (isRoot && sanitizeFontFamily(tokens?.fonts?.body)) {
    parts.push(`font-family: var(${fontTokenVar("body")})`);
  }
  return parts;
}

/**
 * A padding/margin declaration for an OVERRIDE. Unlike baseDecls (which omits a
 * zero value), an override must always emit something — including `0` — so it
 * beats the base rule at that breakpoint instead of letting the base leak. A
 * token ref becomes var(--space-…); a dangling/zero value resets to 0.
 */
function overrideSpacingDecl(
  prop: "padding" | "margin",
  value: Sides | string,
  tokens: DocumentTokens | undefined,
): string {
  if (isSpacingTokenRef(value)) {
    const key = spacingTokenKey(value);
    return sanitizeSpacing(tokens?.spacing?.[key]) !== null
      ? `${prop}: var(${spacingTokenVar(key)})`
      : `${prop}: 0`; // dangling override token → reset to 0 at this bp
  }
  return `${prop}: ${cssSpacing(toSides(value, tokens)) ?? "0"}`;
}

/**
 * A background declaration for an OVERRIDE. Like overrideSpacingDecl, it always
 * emits something so it beats the base rule at that breakpoint: a valid color or
 * token → that color; a dangling/unsafe value → `transparent` (clears the base
 * bg at this bp rather than letting it leak). Same A03 whitelist as baseDecls.
 */
function overrideBackgroundDecl(value: string, tokens: DocumentTokens | undefined): string {
  if (isColorTokenRef(value)) {
    const key = colorTokenKey(value);
    return sanitizeColor(tokens?.colors?.[key])
      ? `background: var(${colorTokenVar(key)})`
      : "background: transparent";
  }
  const bg = sanitizeColor(value);
  return bg ? `background: ${bg}` : "background: transparent";
}

/**
 * CSS declarations for a node's override at a breakpoint (only the changed
 * fields). Emitted inside a max-width media query so the cascade matches
 * resolveFrame/resolveHidden (desktop base → tablet → mobile).
 */
function overrideDecls(
  node: PageNode,
  bp: Exclude<BreakpointId, "desktop">,
  tokens: DocumentTokens | undefined,
): string[] {
  const ov = node.overrides?.[bp];
  if (!ov) return [];
  const parts: string[] = [];
  if (ov.frame) {
    if (ov.frame.x !== undefined) parts.push(`left: ${ov.frame.x}px`);
    if (ov.frame.y !== undefined) parts.push(`top: ${ov.frame.y}px`);
    if (ov.frame.w !== undefined) parts.push(`width: ${ov.frame.w}px`);
    if (ov.frame.h !== undefined) parts.push(`height: ${ov.frame.h}px`);
  }
  // Emit display for both true/false so a later breakpoint can re-show a node
  // an earlier one hid (matches resolveHidden's "?? hidden" cascade).
  if (ov.hidden !== undefined) parts.push(`display: ${ov.hidden ? "none" : "block"}`);
  // padding/margin overrides reuse the same A03 boundary (sanitizeSpacing / token
  // whitelist) as the base, via overrideSpacingDecl.
  if (ov.padding !== undefined) parts.push(overrideSpacingDecl("padding", ov.padding, tokens));
  if (ov.margin !== undefined) parts.push(overrideSpacingDecl("margin", ov.margin, tokens));
  if (ov.background !== undefined) parts.push(overrideBackgroundDecl(ov.background, tokens));
  return parts;
}

/** A stylesheet under construction: base rules + per-breakpoint override rules. */
interface CssAccum {
  base: string[];
  tablet: string[];
  mobile: string[];
  n: number;
}

function pushRules(
  acc: CssAccum,
  cls: string,
  node: PageNode,
  isRoot: boolean,
  tokens: DocumentTokens | undefined,
  inFlow: boolean,
  inGrid: boolean,
): void {
  acc.base.push(`.${cls} { ${baseDecls(node, isRoot, tokens, inFlow, inGrid).join("; ")}; }`);
  const t = overrideDecls(node, "tablet", tokens);
  if (t.length) acc.tablet.push(`.${cls} { ${t.join("; ")}; }`);
  const m = overrideDecls(node, "mobile", tokens);
  if (m.length) acc.mobile.push(`.${cls} { ${m.join("; ")}; }`);
}

/** A `:root` block declaring every defined token as a custom property
 * (`--color-*`, `--space-*`, `--font-*`), or null when there are none. Nodes
 * reference colors/spacing via var(); fonts apply at the root. Unsafe values are
 * dropped (same trust boundary as baseDecls) so a token like `red; } body { ... `
 * can't break out of the block. */
function rootTokenBlock(tokens: DocumentTokens | undefined): string | null {
  const decls: string[] = [];
  for (const [k, v] of Object.entries(tokens?.colors ?? {})) {
    const c = sanitizeColor(v);
    if (c !== null) decls.push(`${colorTokenVar(k)}: ${c};`);
  }
  for (const [k, v] of Object.entries(tokens?.spacing ?? {})) {
    const n = sanitizeSpacing(v);
    if (n !== null) decls.push(`${spacingTokenVar(k)}: ${n}px;`);
  }
  for (const [k, v] of Object.entries(tokens?.fonts ?? {})) {
    const f = sanitizeFontFamily(v);
    if (f !== null) decls.push(`${fontTokenVar(k)}: ${f};`);
  }
  if (!decls.length) return null;
  return `:root {\n${indentBlock(decls.join("\n"), 2)}\n}`;
}

/** Assemble the final stylesheet text: :root tokens, base rules, then tablet,
 * then mobile media blocks (mobile last so it wins at the narrowest width). */
function buildCss(acc: CssAccum, tokens: DocumentTokens | undefined): string {
  const root = rootTokenBlock(tokens);
  const blocks = root ? [root, acc.base.join("\n")] : [acc.base.join("\n")];
  if (acc.tablet.length)
    blocks.push(`@media (max-width: ${BP_WIDTH.tablet}px) {\n${indentBlock(acc.tablet.join("\n"), 2)}\n}`);
  if (acc.mobile.length)
    blocks.push(`@media (max-width: ${BP_WIDTH.mobile}px) {\n${indentBlock(acc.mobile.join("\n"), 2)}\n}`);
  return blocks.join("\n\n");
}

/**
 * Event-handler attributes for a node, e.g. ` onClick={() => { ... }}`.
 * Bindings that share a trigger are merged into one handler (run in order).
 */
function eventAttrs(node: PageNode): string {
  if (!node.events?.length) return "";
  const groups = new Map<string, { bodies: string[]; needsEvent: boolean }>();
  for (const ev of node.events) {
    const prop = TRIGGER_PROP[ev.trigger];
    const g = groups.get(prop) ?? { bodies: [], needsEvent: false };
    g.bodies.push(actionBody(ev));
    // Only pass the event arg when some action in the group declares it needs one.
    g.needsEvent = g.needsEvent || actionNeedsEvent(ev.action);
    groups.set(prop, g);
  }
  const attrs: string[] = [];
  for (const [prop, g] of groups) {
    attrs.push(` ${prop}={(${g.needsEvent ? "e" : ""}) => { ${g.bodies.join(" ")} }}`);
  }
  return attrs.join("");
}

/** Collect PascalCase JSX tags from generated body for the import header. */
function collectComponents(body: string): string[] {
  const names = new Set<string>();
  const re = /<([A-Z][A-Za-z0-9]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) names.add(m[1]);
  return [...names].sort();
}

/**
 * Render a node (and subtree) to JSX, wrapping each in a div that carries a
 * generated class. Layout/responsive styling lives in the stylesheet (acc) so
 * media queries can reflow it; only structure and events live in the JSX.
 */
function renderNode(
  doc: PageDocument,
  nodeId: string,
  isRoot: boolean,
  acc: CssAccum,
  visited: Set<string> = new Set(),
  inFlow = false,
  inGrid = false,
): string {
  // Guard against corrupted documents with cyclic children references.
  if (visited.has(nodeId)) return "";
  const node = doc.nodes[nodeId];
  if (!node) return "";
  visited.add(nodeId);

  const cls = `pg-${acc.n++}`;
  pushRules(acc, cls, node, isRoot, doc.meta.tokens, inFlow, inGrid);

  const def = getComponentDef(node.type);
  const isContainer = def?.isContainer ?? true;
  // A flex container flows its children (relative, wrapping) instead of placing
  // them absolutely — mirrors the canvas (NodeView).
  const flow = isContainer ? resolveFlow(node) : null;
  const grid = isContainer ? resolveGrid(node) : null;
  // Unknown type (imported JSON / swapped registry): keep the node and its
  // subtree with a placeholder comment instead of silently dropping them.
  // Treat unknown as a possible container so children are never lost.
  const childCodes = isContainer
    ? node.children
        .map((cid) => renderNode(doc, cid, false, acc, visited, Boolean(flow), Boolean(grid)))
        .filter(Boolean)
    : [];
  let childrenBlock = childCodes.join("\n");
  // Wrap flow children in a flex div (its own class) so they reflow on narrow
  // widths; the wrapper carries the layout while the node box stays positioned.
  if (flow && childrenBlock) {
    const fcls = `${cls}-c`;
    acc.base.push(`.${fcls} { ${flowDecls(flow).join("; ")}; }`);
    pushWrapperOverrideRules(acc, fcls, node, "flex");
    childrenBlock = `<div className="${fcls}">\n${indentBlock(childrenBlock, 2)}\n</div>`;
  } else if (grid && childrenBlock) {
    const fcls = `${cls}-c`;
    acc.base.push(`.${fcls} { ${gridDecls(grid).join("; ")}; }`);
    pushWrapperOverrideRules(acc, fcls, node, "grid");
    childrenBlock = `<div className="${fcls}">\n${indentBlock(childrenBlock, 2)}\n</div>`;
  }
  const inner = def
    ? def.toCode(node, indentBlock(childrenBlock, 2))
    : [`{/* unknown component: ${safeComment(node.type)} */}`, indentBlock(childrenBlock, 2)]
        .filter(Boolean)
        .join("\n");

  return `<div className="${cls}"${eventAttrs(node)}>\n${indentBlock(inner, 2)}\n</div>`;
}

/** Generate a React + TS component string for the page. */
export function generateCode(doc: PageDocument): string {
  const acc: CssAccum = { base: [], tablet: [], mobile: [], n: 0 };
  const body = renderNode(doc, doc.rootId, true, acc).replace(/\n[ \t]*\n/g, "\n");
  // The stylesheet goes inside a <style>{`...`}</style> template literal, so any
  // user value (e.g. node.background) carrying a backtick or ${ would break the
  // generated JSX. Escape both at this single boundary.
  const css = buildCss(acc, doc.meta.tokens).replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const component = [
    "export function Page() {",
    "  return (",
    "    <>",
    "      <style>{`",
    indentBlock(css, 6),
    "      `}</style>",
    indentBlock(body, 6),
    "    </>",
    "  );",
    "}",
  ].join("\n");
  const components = collectComponents(body);
  const header = components.length
    ? `import { ${components.join(", ")} } from "./components";\n\n`
    : "";
  return header + component;
}

/** Wrap generated code in a markdown ```tsx code block. */
export function generateCodeMarkdown(doc: PageDocument): string {
  return `## Generated Code\n\n\`\`\`tsx\n${generateCode(doc)}\n\`\`\`\n`;
}
