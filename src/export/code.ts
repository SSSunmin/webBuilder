import { getComponentDef } from "../registry";
import type { PageDocument } from "../types/page";

/** Render a node (and its subtree) to a JSX string via the registry toCode(). */
function renderNode(doc: PageDocument, nodeId: string): string {
  const node = doc.nodes[nodeId];
  if (!node) return "";
  const def = getComponentDef(node.type);
  if (!def) return "";

  const childCodes = node.children
    .map((childId) => renderNode(doc, childId))
    .filter(Boolean);
  const childrenBlock = childCodes.join("\n");
  const indented = childrenBlock
    ? childrenBlock
        .split("\n")
        .map((l) => "  " + l)
        .join("\n")
    : "";

  return def.toCode(node, indented);
}

function indentBlock(code: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return code
    .split("\n")
    .map((l) => (l.length ? pad + l : l))
    .join("\n");
}

/** Generate a React + TS component string for the page. */
export function generateCode(doc: PageDocument): string {
  const body = renderNode(doc, doc.rootId)
    // collapse blank lines left by empty containers
    .replace(/\n[ \t]*\n/g, "\n");
  return [
    "export function Page() {",
    "  return (",
    indentBlock(body, 4),
    "  );",
    "}",
  ].join("\n");
}

/** Wrap generated code in a markdown ```tsx code block. */
export function generateCodeMarkdown(doc: PageDocument): string {
  return `## Generated Code\n\n\`\`\`tsx\n${generateCode(doc)}\n\`\`\`\n`;
}
