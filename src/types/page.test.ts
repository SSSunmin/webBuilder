import { describe, expect, it } from "vitest";
import { ZERO_SIDES, resolveFrame, resolveHidden, toSides } from "./page";
import type { PageNode } from "./page";

/** Minimal node with a base frame and optional overrides for resolver tests. */
function makeNode(overrides?: PageNode["overrides"]): PageNode {
  return {
    id: "n1",
    type: "Card",
    props: {},
    children: [],
    frame: { x: 0, y: 0, w: 100, h: 50 },
    overrides,
  };
}

describe("toSides", () => {
  it("returns zero sides for null/undefined", () => {
    expect(toSides(undefined)).toEqual(ZERO_SIDES);
    expect(toSides(null)).toEqual(ZERO_SIDES);
  });

  it("expands a uniform number to all four sides", () => {
    expect(toSides(8)).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
  });

  it("passes through an explicit Sides object", () => {
    const sides = { top: 1, right: 2, bottom: 3, left: 4 };
    expect(toSides(sides)).toEqual(sides);
  });

  it("defaults missing fields of a partial Sides to 0", () => {
    expect(toSides({ top: 5 } as never)).toEqual({
      top: 5,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });
});

describe("resolveFrame", () => {
  it("returns the base frame unchanged for desktop", () => {
    const node = makeNode({ tablet: { frame: { w: 200 } } });
    expect(resolveFrame(node, "desktop")).toEqual({ x: 0, y: 0, w: 100, h: 50 });
  });

  it("merges a partial tablet override onto the base", () => {
    const node = makeNode({ tablet: { frame: { w: 200, h: 80 } } });
    expect(resolveFrame(node, "tablet")).toEqual({ x: 0, y: 0, w: 200, h: 80 });
  });

  it("cascades tablet then mobile (each contributes different fields)", () => {
    const node = makeNode({
      tablet: { frame: { w: 200 } },
      mobile: { frame: { x: 9 } },
    });
    // mobile sees the tablet width AND its own x.
    expect(resolveFrame(node, "mobile")).toEqual({ x: 9, y: 0, w: 200, h: 50 });
  });

  it("lets mobile override a value tablet already changed", () => {
    const node = makeNode({
      tablet: { frame: { w: 200 } },
      mobile: { frame: { w: 50 } },
    });
    expect(resolveFrame(node, "mobile")).toEqual({ x: 0, y: 0, w: 50, h: 50 });
  });

  it("returns the base frame for every breakpoint when no overrides exist", () => {
    const node = makeNode();
    const base = { x: 0, y: 0, w: 100, h: 50 };
    expect(resolveFrame(node, "desktop")).toEqual(base);
    expect(resolveFrame(node, "tablet")).toEqual(base);
    expect(resolveFrame(node, "mobile")).toEqual(base);
  });
});

describe("resolveHidden", () => {
  it("is false at every breakpoint with no overrides", () => {
    const node = makeNode();
    expect(resolveHidden(node, "desktop")).toBe(false);
    expect(resolveHidden(node, "tablet")).toBe(false);
    expect(resolveHidden(node, "mobile")).toBe(false);
  });

  it("hides tablet and mobile when tablet sets hidden=true", () => {
    const node = makeNode({ tablet: { hidden: true } });
    expect(resolveHidden(node, "desktop")).toBe(false);
    expect(resolveHidden(node, "tablet")).toBe(true);
    expect(resolveHidden(node, "mobile")).toBe(true);
  });

  it("lets mobile re-show a node hidden by tablet", () => {
    const node = makeNode({ tablet: { hidden: true }, mobile: { hidden: false } });
    expect(resolveHidden(node, "tablet")).toBe(true);
    expect(resolveHidden(node, "mobile")).toBe(false);
  });
});
