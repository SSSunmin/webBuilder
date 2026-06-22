import { getComponentDef } from "../registry";
import type { PageDocument, PageNode, Sides } from "../types/page";
import { toSides } from "../types/page";

/** Serialize a node's props (per its schema) into a "key: value" summary. */
function summarizeProps(node: PageNode): string {
  const def = getComponentDef(node.type);
  if (!def) return "";
  const parts: string[] = [];
  for (const schema of def.props) {
    const value = node.props[schema.key];
    if (value === undefined || value === null || value === "") continue;
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

function frameSummary(node: PageNode, isRoot: boolean): string {
  const f = node.frame;
  const size = `${f.w}×${f.h}`;
  const pos = isRoot ? size : `@(${f.x},${f.y}) ${size}`;
  const parts = [node.background ? `${pos}, bg ${node.background}` : pos];
  if (node.borderRadius) parts.push(`radius ${node.borderRadius}`);
  const pad = spacingSummary(toSides(node.padding));
  if (pad !== null) parts.push(`pad ${pad}`);
  const margin = spacingSummary(toSides(node.margin));
  if (margin !== null) parts.push(`margin ${margin}`);
  return parts.join(", ");
}

function renderNode(
  doc: PageDocument,
  nodeId: string,
  depth: number,
  isRoot: boolean,
  visited: Set<string> = new Set(),
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
  )}${summary ? ` — ${summary}` : ""}`;
  const lines = [line];
  for (const childId of node.children) {
    lines.push(...renderNode(doc, childId, depth + 1, false, visited));
  }
  return lines;
}

/** Human/AI-readable markdown spec of the page (tree + position/size + props). */
export function generateSpec(doc: PageDocument): string {
  const header = `# Page: ${doc.meta.name}`;
  const tree = renderNode(doc, doc.rootId, 0, true).join("\n");
  return `${header}\n\n${tree}\n`;
}
