import { getComponentDef } from "../registry";
import type { PageDocument, PageNode } from "../types/page";

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

function renderNode(doc: PageDocument, nodeId: string, depth: number): string[] {
  const node = doc.nodes[nodeId];
  if (!node) return [];
  const def = getComponentDef(node.type);
  const indent = "  ".repeat(depth);
  const kind = def?.isContainer ? " (container)" : "";
  const summary = summarizeProps(node);
  const line = `${indent}- **${def?.label ?? node.type}**${kind}${
    summary ? ` — ${summary}` : ""
  }`;
  const lines = [line];
  for (const childId of node.children) {
    lines.push(...renderNode(doc, childId, depth + 1));
  }
  return lines;
}

/** Human/AI-readable markdown spec of the page (component tree + props). */
export function generateSpec(doc: PageDocument): string {
  const header = `# Page: ${doc.meta.name}`;
  const tree = renderNode(doc, doc.rootId, 0).join("\n");
  return `${header}\n\n${tree}\n`;
}
