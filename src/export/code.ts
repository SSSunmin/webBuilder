import { getComponentDef } from "../registry";
import type { PageDocument, PageNode, Sides } from "../types/page";
import { toSides } from "../types/page";

function indentBlock(code: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return code
    .split("\n")
    .map((l) => (l.length ? pad + l : l))
    .join("\n");
}

/** Format a Sides as a CSS style value: omitted (null) when all zero, a number
 * when uniform (React adds px), or a "top right bottom left" px shorthand. */
function spacingValue(sides: Sides): string | null {
  const { top, right, bottom, left } = sides;
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return null;
  if (top === right && right === bottom && bottom === left) return String(top);
  return `"${top}px ${right}px ${bottom}px ${left}px"`;
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
  const padding = spacingValue(toSides(node.padding));
  if (padding !== null) parts.push(`padding: ${padding}`);
  // Root keeps its "0 auto" centering margin; user margin applies elsewhere.
  if (!isRoot) {
    const margin = spacingValue(toSides(node.margin));
    if (margin !== null) parts.push(`margin: ${margin}`);
  }
  return `{{ ${parts.join(", ")} }}`;
}

/** Collect PascalCase JSX tags from generated body for the import header. */
function collectComponents(body: string): string[] {
  const names = new Set<string>();
  const re = /<([A-Z][A-Za-z0-9]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) names.add(m[1]);
  return [...names].sort();
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
  const component = [
    "export function Page() {",
    "  return (",
    indentBlock(body, 4),
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
