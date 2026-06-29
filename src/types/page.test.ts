import { describe, expect, it } from "vitest";
import {
  DEFAULT_SHADOW,
  ZERO_SIDES,
  colorTokenKey,
  colorTokenVar,
  isColorTokenRef,
  isValidTokenKey,
  makeColorTokenRef,
  resolveColor,
  resolveFrame,
  resolveHidden,
  shadowCss,
  toSides,
} from "./page";
import type { PageNode } from "./page";

describe("shadowCss", () => {
  it("returns undefined for no shadow", () => {
    expect(shadowCss(undefined)).toBeUndefined();
  });

  it("builds a CSS box-shadow with rgba from hex + opacity", () => {
    expect(shadowCss(DEFAULT_SHADOW)).toBe("0px 4px 12px 0px rgba(0, 0, 0, 0.15)");
  });

  it("expands shorthand hex and applies offsets/spread", () => {
    expect(
      shadowCss({ x: 2, y: 3, blur: 5, spread: 1, color: "#f00", opacity: 1 }),
    ).toBe("2px 3px 5px 1px rgba(255, 0, 0, 1)");
  });

  it("clamps opacity and floors blur at zero", () => {
    expect(
      shadowCss({ x: 0, y: 0, blur: -5, spread: 0, color: "#000000", opacity: 2 }),
    ).toBe("0px 0px 0px 0px rgba(0, 0, 0, 1)");
  });

  it("falls back to black on an invalid/empty hex and drops alpha from 8-digit hex", () => {
    const base = { x: 0, y: 0, blur: 0, spread: 0, opacity: 1 };
    expect(shadowCss({ ...base, color: "" })).toContain("rgba(0, 0, 0, 1)");
    expect(shadowCss({ ...base, color: "#gg0000" })).toContain("rgba(0, 0, 0, 1)");
    expect(shadowCss({ ...base, color: "#ff000080" })).toContain("rgba(255, 0, 0, 1)");
  });
});

describe("color tokens", () => {
  it("validates token keys as CSS-identifier-like", () => {
    expect(isValidTokenKey("brand")).toBe(true);
    expect(isValidTokenKey("brand-500")).toBe(true);
    expect(isValidTokenKey("1brand")).toBe(false); // must start with a letter
    expect(isValidTokenKey("brand color")).toBe(false); // no spaces
    expect(isValidTokenKey("")).toBe(false);
  });

  it("round-trips a ref through make/is/key", () => {
    const ref = makeColorTokenRef("brand");
    expect(ref).toBe("token:brand");
    expect(isColorTokenRef(ref)).toBe(true);
    expect(isColorTokenRef("#ff0000")).toBe(false);
    expect(isColorTokenRef(undefined)).toBe(false);
    expect(colorTokenKey(ref)).toBe("brand");
  });

  it("maps a key to a CSS custom property name", () => {
    expect(colorTokenVar("brand")).toBe("--color-brand");
  });

  it("resolves a ref to its token value, passes literals through", () => {
    const tokens = { colors: { brand: "#3b82f6" } };
    expect(resolveColor(makeColorTokenRef("brand"), tokens)).toBe("#3b82f6");
    expect(resolveColor("#ff0000", tokens)).toBe("#ff0000");
    expect(resolveColor(undefined, tokens)).toBeUndefined();
  });

  it("resolves a dangling ref (deleted token) to undefined", () => {
    expect(resolveColor(makeColorTokenRef("gone"), { colors: {} })).toBeUndefined();
    expect(resolveColor(makeColorTokenRef("brand"), undefined)).toBeUndefined();
  });
});

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
