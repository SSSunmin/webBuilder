import { resolveColor, sanitizeColor } from "../types/page";
import type { DocumentTokens, PageDocument, PageNode } from "../types/page";

/**
 * Build a lightweight SVG wireframe thumbnail from a document's node tree.
 *
 * No DOM capture, no dependencies: nodes are absolutely positioned boxes, so we
 * walk the tree accumulating each parent's offset and emit one <rect> per node.
 * Nodes with a background are filled; the rest are drawn as faint outlines so
 * the page structure stays recognizable. Uses the desktop base frame (ignores
 * breakpoint overrides) and returns a `data:image/svg+xml` URI usable in <img>.
 */
export function generateThumbnail(doc: PageDocument): string {
  const root = doc.nodes[doc.rootId];
  if (!root) return "";

  const w = Math.max(1, Math.round(root.frame.w));
  const h = Math.max(1, Math.round(root.frame.h));

  const tokens = doc.meta.tokens;
  const rects: string[] = [rectFor(root, 0, 0, true, tokens)];
  const seen = new Set<string>([root.id]);

  const walk = (node: PageNode, ox: number, oy: number): void => {
    for (const cid of node.children) {
      const child = doc.nodes[cid];
      if (!child || seen.has(cid)) continue; // skip missing refs / cycles
      seen.add(cid);
      // ponytail: children of a flex container (node.layout === "flex") are laid
      // out by flow, so their frame.x/y is stale — the thumbnail draws them at
      // those coords, an approximation. Acceptable for a tiny home-card preview;
      // upgrade path = replicate the flex flow here (or render off-DOM) if it
      // ever reads as clearly wrong.
      const x = ox + child.frame.x;
      const y = oy + child.frame.y;
      rects.push(rectFor(child, x, y, false, tokens));
      walk(child, x, y);
    }
  };
  walk(root, 0, 0);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ` +
    `preserveAspectRatio="xMidYMid meet">${rects.join("")}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Render a single node box. Filled when it has a background; otherwise a
 * faint wireframe outline. The root falls back to white so the page reads as a
 * sheet rather than a transparent void. */
function rectFor(
  node: PageNode,
  x: number,
  y: number,
  isRoot: boolean,
  tokens: DocumentTokens | undefined,
): string {
  const { w, h } = node.frame;
  const radius = node.borderRadius ? Math.max(0, Math.round(node.borderRadius)) : 0;
  const rx = radius ? ` rx="${radius}"` : "";
  const base = `x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.max(
    0,
    Math.round(w),
  )}" height="${Math.max(0, Math.round(h))}"${rx}`;

  const fill = sanitizeColor(resolveColor(node.background, tokens));
  if (fill) return `<rect ${base} fill="${fill}"/>`;
  if (isRoot) return `<rect ${base} fill="#ffffff"/>`;
  return `<rect ${base} fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>`;
}
