import { getComponentDef } from "../registry";
import type { BreakpointId, DocumentTokens, PageDocument, PageNode, Sides } from "../types/page";
import {
  BREAKPOINTS,
  colorTokenKey,
  colorTokenVar,
  fontTokenVar,
  isColorTokenRef,
  isSpacingTokenRef,
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

/** Base (desktop) CSS declarations for a node's frame + box styling. */
function baseDecls(node: PageNode, isRoot: boolean, tokens: DocumentTokens | undefined): string[] {
  const f = node.frame;
  const parts = isRoot
    ? ["position: relative", `width: ${f.w}px`, `height: ${f.h}px`, "margin: 0 auto"]
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
 * CSS declarations for a node's override at a breakpoint (only the changed
 * fields). Emitted inside a max-width media query so the cascade matches
 * resolveFrame/resolveHidden (desktop base → tablet → mobile).
 */
function overrideDecls(node: PageNode, bp: Exclude<BreakpointId, "desktop">): string[] {
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
): void {
  acc.base.push(`.${cls} { ${baseDecls(node, isRoot, tokens).join("; ")}; }`);
  const t = overrideDecls(node, "tablet");
  if (t.length) acc.tablet.push(`.${cls} { ${t.join("; ")}; }`);
  const m = overrideDecls(node, "mobile");
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
): string {
  // Guard against corrupted documents with cyclic children references.
  if (visited.has(nodeId)) return "";
  const node = doc.nodes[nodeId];
  if (!node) return "";
  visited.add(nodeId);

  const cls = `pg-${acc.n++}`;
  pushRules(acc, cls, node, isRoot, doc.meta.tokens);

  const def = getComponentDef(node.type);
  // Unknown type (imported JSON / swapped registry): keep the node and its
  // subtree with a placeholder comment instead of silently dropping them.
  // Treat unknown as a possible container so children are never lost.
  const childCodes = (def?.isContainer ?? true)
    ? node.children.map((cid) => renderNode(doc, cid, false, acc, visited)).filter(Boolean)
    : [];
  const childrenBlock = childCodes.join("\n");
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
