import { describe, expect, it } from "vitest";
import { generateThumbnail } from "./generateThumbnail";
import type { PageDocument, PageNode } from "../types/page";

function node(id: string, partial: Partial<PageNode> = {}): PageNode {
  return {
    id,
    type: "Box",
    props: {},
    children: [],
    frame: { x: 0, y: 0, w: 100, h: 100 },
    ...partial,
  };
}

function doc(nodes: PageNode[], rootId = nodes[0]?.id): PageDocument {
  return {
    id: "doc1",
    version: 1,
    rootId,
    nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
    meta: { name: "t", createdAt: "", updatedAt: "" },
  };
}

/** Decode the SVG payload out of the data URI for assertions. */
function svgOf(uri: string): string {
  return decodeURIComponent(uri.replace(/^data:image\/svg\+xml,/, ""));
}

describe("generateThumbnail", () => {
  it("returns empty string when the root node is missing", () => {
    expect(generateThumbnail(doc([], "ghost"))).toBe("");
  });

  it("emits an SVG data URI with a viewBox sized to the root frame", () => {
    const uri = generateThumbnail(
      doc([node("root", { frame: { x: 0, y: 0, w: 1280, h: 720 } })]),
    );
    expect(uri.startsWith("data:image/svg+xml,")).toBe(true);
    expect(svgOf(uri)).toContain('viewBox="0 0 1280 720"');
  });

  it("fills the root with white when it has no background", () => {
    const svg = svgOf(generateThumbnail(doc([node("root")])));
    expect(svg).toContain('fill="#ffffff"');
  });

  it("accumulates parent offsets to absolute coordinates", () => {
    const root = node("root", {
      frame: { x: 0, y: 0, w: 400, h: 400 },
      children: ["a"],
    });
    const a = node("a", {
      frame: { x: 10, y: 20, w: 50, h: 50 },
      children: ["b"],
      background: "#ff0000",
    });
    const b = node("b", { frame: { x: 5, y: 7, w: 10, h: 10 }, background: "blue" });
    const svg = svgOf(generateThumbnail(doc([root, a, b])));
    // a is at (10,20); b nests under a → (15,27)
    expect(svg).toContain('x="10" y="20"');
    expect(svg).toContain('x="15" y="27"');
  });

  it("fills nodes that have a background and outlines those without", () => {
    const root = node("root", { children: ["a", "b"] });
    const a = node("a", { frame: { x: 0, y: 0, w: 20, h: 20 }, background: "#00ff00" });
    const b = node("b", { frame: { x: 0, y: 30, w: 20, h: 20 } });
    const svg = svgOf(generateThumbnail(doc([root, a, b])));
    expect(svg).toContain('fill="#00ff00"');
    expect(svg).toContain('stroke="#e2e8f0"');
  });

  it("emits rx for rounded corners", () => {
    const root = node("root", { children: ["a"] });
    const a = node("a", { borderRadius: 8, background: "#123456" });
    expect(svgOf(generateThumbnail(doc([root, a])))).toContain('rx="8"');
  });

  it("drops colors that could break the SVG attribute", () => {
    const root = node("root", { children: ["a"] });
    const a = node("a", { background: '"><script>' });
    const svg = svgOf(generateThumbnail(doc([root, a])));
    expect(svg).not.toContain("<script>");
  });

  it("accepts a bare color keyword as a fill", () => {
    const root = node("root", { children: ["a"] });
    const a = node("a", { background: "red" });
    expect(svgOf(generateThumbnail(doc([root, a])))).toContain('fill="red"');
  });

  it("never emits a negative rx for a negative borderRadius", () => {
    const root = node("root", { children: ["a"] });
    const a = node("a", { borderRadius: -8, background: "#123456" });
    const svg = svgOf(generateThumbnail(doc([root, a])));
    expect(svg).not.toContain('rx="-');
  });

  it("ignores missing child references without throwing", () => {
    const root = node("root", { children: ["gone"] });
    expect(() => generateThumbnail(doc([root]))).not.toThrow();
  });

  it("does not loop forever on a cyclic tree", () => {
    const root = node("root", { children: ["a"] });
    const a = node("a", { children: ["root"] });
    expect(() => generateThumbnail(doc([root, a]))).not.toThrow();
  });
});
