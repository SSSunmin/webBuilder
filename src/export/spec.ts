import { getComponentDef } from "../registry";
import type { BreakpointId, DocumentTokens, PageDocument, PageNode, Sides } from "../types/page";
import {
  BREAKPOINTS,
  colorTokenKey,
  isColorTokenRef,
  isSpacingTokenRef,
  resolveColor,
  resolveFlow,
  resolveFrame,
  resolveHidden,
  spacingTokenKey,
  toSides,
} from "../types/page";
import { describeEvent } from "../types/events";

/** Breakpoints (excluding desktop base) that carry overrides, in order. */
const OVERRIDE_BREAKPOINTS = BREAKPOINTS.filter(
  (b) => b.id !== "desktop",
) as { id: Exclude<BreakpointId, "desktop">; label: string; width: number }[];

/**
 * Per-breakpoint override lines for a node, one indent level deeper than the
 * node line. Desktop (base) is not emitted; only tablet/mobile that actually
 * override. Hidden wins over a frame override.
 */
function overrideLines(node: PageNode, depth: number): string[] {
  const lines: string[] = [];
  const indent = "  ".repeat(depth + 1);
  for (const bp of OVERRIDE_BREAKPOINTS) {
    const ov = node.overrides?.[bp.id];
    if (!ov) continue;
    if (resolveHidden(node, bp.id)) {
      lines.push(`${indent}- ${bp.label}: 숨김`);
    } else if (ov.frame) {
      const f = resolveFrame(node, bp.id);
      lines.push(`${indent}- ${bp.label}: @(${f.x},${f.y}) ${f.w}×${f.h}`);
    }
  }
  return lines;
}

/** Event binding lines for a node, one indent level deeper than the node line. */
function eventLines(node: PageNode, depth: number): string[] {
  if (!node.events?.length) return [];
  const indent = "  ".repeat(depth + 1);
  return node.events.map((ev) => `${indent}- 이벤트: ${describeEvent(ev)}`);
}

/** Serialize a node's props (per its schema) into a "key: value" summary. */
function summarizeProps(node: PageNode): string {
  const def = getComponentDef(node.type);
  if (!def) return "";
  const parts: string[] = [];
  for (const schema of def.props) {
    const value = node.props[schema.key];
    if (value === undefined || value === null || value === "") continue;
    // iconSize is meaningless without an icon — skip the default-16 noise.
    if (schema.key === "iconSize" && !node.props.icon) continue;
    parts.push(
      typeof value === "string"
        ? `${schema.key}: "${value}"`
        : `${schema.key}: ${value}`,
    );
  }
  return parts.join(", ");
}

/** Compact spacing notation: omitted (null) when all zero, a number when
 * uniform, or a "T/R/B/L" string when asymmetric. */
function spacingSummary(sides: Sides): string | null {
  const { top, right, bottom, left } = sides;
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return null;
  if (top === right && right === bottom && bottom === left) return String(top);
  return `${top}/${right}/${bottom}/${left}`;
}

/** Describe a padding/margin value: a token reference with its resolved px (or
 * "미정의" when deleted), or the compact literal notation (null when all zero). */
function spacingField(
  value: Sides | string | undefined,
  tokens: DocumentTokens | undefined,
): string | null {
  if (isSpacingTokenRef(value)) {
    const key = spacingTokenKey(value);
    const px = tokens?.spacing?.[key];
    return `token ${key} (${typeof px === "number" ? `${px}px` : "미정의"})`;
  }
  return spacingSummary(toSides(value, tokens));
}

/** Describe a background: a literal color, or a token reference with its
 * resolved value (or "미정의" when the token no longer exists). */
function bgSummary(bg: string, tokens: DocumentTokens | undefined): string {
  if (!isColorTokenRef(bg)) return `bg ${bg}`;
  const resolved = resolveColor(bg, tokens);
  return `bg token ${colorTokenKey(bg)} (${resolved ?? "미정의"})`;
}

/** Describe a flex container's layout, e.g. "flex 가로, gap 8, 가운데", or null
 * when the node isn't a flex container. */
function flowSummary(node: PageNode): string | null {
  const flow = resolveFlow(node);
  if (!flow) return null;
  const parts = [`flex ${flow.flexDirection === "column" ? "세로" : "가로"}`];
  if (flow.gap) parts.push(`gap ${flow.gap}`);
  if (flow.justifyContent !== "flex-start") parts.push(`정렬 ${flow.justifyContent}`);
  if (flow.alignItems !== "flex-start") parts.push(`교차 ${flow.alignItems}`);
  return parts.join(", ");
}

/** Position/size summary. A node whose parent flows (inFlow) has no meaningful
 * x/y, so only its size is shown. */
function frameSummary(
  node: PageNode,
  isRoot: boolean,
  tokens: DocumentTokens | undefined,
  inFlow: boolean,
): string {
  const f = node.frame;
  const size = `${f.w}×${f.h}`;
  const pos = isRoot || inFlow ? size : `@(${f.x},${f.y}) ${size}`;
  const parts = [node.background ? `${pos}, ${bgSummary(node.background, tokens)}` : pos];
  const flow = flowSummary(node);
  if (flow) parts.push(flow);
  if (node.borderRadius) parts.push(`radius ${node.borderRadius}`);
  if (node.boxShadow) {
    const sh = node.boxShadow;
    const pct = Math.round(Math.max(0, Math.min(1, sh.opacity)) * 100); // match shadowCss clamp
    parts.push(`shadow ${sh.x}/${sh.y}/${sh.blur}/${sh.spread} ${sh.color} ${pct}%`);
  }
  const pad = spacingField(node.padding, tokens);
  if (pad !== null) parts.push(`pad ${pad}`);
  const margin = spacingField(node.margin, tokens);
  if (margin !== null) parts.push(`margin ${margin}`);
  return parts.join(", ");
}

function renderNode(
  doc: PageDocument,
  nodeId: string,
  depth: number,
  isRoot: boolean,
  visited: Set<string> = new Set(),
  inFlow = false,
): string[] {
  // Guard against corrupted documents with cyclic children references.
  if (visited.has(nodeId)) return [];
  const node = doc.nodes[nodeId];
  if (!node) return [];
  visited.add(nodeId);
  const def = getComponentDef(node.type);
  const indent = "  ".repeat(depth);
  const kind = def?.isContainer ? " (container)" : "";
  const summary = summarizeProps(node);
  const line = `${indent}- **${def?.label ?? node.type}**${kind} — ${frameSummary(
    node,
    isRoot,
    doc.meta.tokens,
    inFlow,
  )}${summary ? ` — ${summary}` : ""}`;
  const lines = [line, ...overrideLines(node, depth), ...eventLines(node, depth)];
  // Children of a flex container flow, so they report size only (no x/y).
  const childInFlow = Boolean(def?.isContainer && resolveFlow(node));
  for (const childId of node.children) {
    lines.push(...renderNode(doc, childId, depth + 1, false, visited, childInFlow));
  }
  return lines;
}

/** "디자인 토큰" sections for the defined color/font/spacing tokens, or "" when
 * none. Each key AND value is wrapped in a code span so markdown metacharacters
 * in a user-supplied token can't inject links/formatting into the spec. */
function tokensSection(tokens: DocumentTokens | undefined): string {
  const block = (title: string, entries: [string, string][]): string =>
    entries.length
      ? `## 디자인 토큰 (${title})\n\n${entries
          .map(([k, v]) => `- \`${k}\`: \`${v}\``)
          .join("\n")}`
      : "";
  const blocks = [
    block("색상", Object.entries(tokens?.colors ?? {})),
    block("글꼴", Object.entries(tokens?.fonts ?? {})),
    block("간격", Object.entries(tokens?.spacing ?? {}).map(([k, v]) => [k, `${v}px`])),
  ].filter(Boolean);
  return blocks.length ? `\n${blocks.join("\n\n")}\n` : "";
}

/** Human/AI-readable markdown spec of the page (tree + position/size + props). */
export function generateSpec(doc: PageDocument): string {
  const header = `# Page: ${doc.meta.name}`;
  const tree = renderNode(doc, doc.rootId, 0, true).join("\n");
  return `${header}\n${tokensSection(doc.meta.tokens)}\n${tree}\n`;
}
