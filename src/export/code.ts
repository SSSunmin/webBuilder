import { getComponentDef } from "../registry";
import type { PageDocument, PageNode } from "../types/page";

function indentBlock(code: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return code
    .split("\n")
    .map((l) => (l.length ? pad + l : l))
    .join("\n");
}

/** Inline style literal for a node's frame + background. */
function frameStyle(node: PageNode, isRoot: boolean): string {
  const f = node.frame;
  const parts = isRoot
    ? [`position: "relative"`, `width: ${f.w}`, `height: ${f.h}`, `margin: "0 auto"`]
    : [
        `position: "absolute"`,
        `left: ${f.x}`,
        `top: ${f.y}`,
        `width: ${f.w}`,
        `height: ${f.h}`,
      ];
  if (node.background) parts.push(`background: "${node.background}"`);
  if (typeof node.borderRadius === "number")
    parts.push(`borderRadius: ${node.borderRadius}`);
  return `{{ ${parts.join(", ")} }}`;
}

/** Render a node (and subtree) to JSX, wrapping each in a positioned div. */
function renderNode(
  doc: PageDocument,
  nodeId: string,
  isRoot: boolean,
  visited: Set<string> = new Set(),
): string {
  // Guard against corrupted documents with cyclic children references.
  if (visited.has(nodeId)) return "";
  const node = doc.nodes[nodeId];
  if (!node) return "";
  const def = getComponentDef(node.type);
  if (!def) return "";

  visited.add(nodeId);
  const childCodes = def.isContainer
    ? node.children.map((cid) => renderNode(doc, cid, false, visited)).filter(Boolean)
    : [];
  const childrenBlock = childCodes.join("\n");
  const inner = def.toCode(node, indentBlock(childrenBlock, 2));

  return `<div style=${frameStyle(node, isRoot)}>\n${indentBlock(inner, 2)}\n</div>`;
}

/** Generate a React + TS component string for the page. */
export function generateCode(doc: PageDocument): string {
  const body = renderNode(doc, doc.rootId, true).replace(/\n[ \t]*\n/g, "\n");
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
