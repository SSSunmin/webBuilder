import { describe, expect, it } from "vitest";
import {
  DEFAULT_SHADOW,
  ZERO_SIDES,
  colorTokenKey,
  colorTokenVar,
  documentFontFamily,
  isColorTokenRef,
  isSpacingTokenRef,
  isValidTokenKey,
  makeColorTokenRef,
  makeSpacingTokenRef,
  resolveBackground,
  resolveColor,
  resolveFrame,
  resolveFlow,
  resolveGrid,
  resolveHidden,
  resolvePadding,
  resolveMargin,
  resolveSpacing,
  sanitizeFontFamily,
  sanitizeSpacing,
  shadowCss,
  spacingTokenVar,
  toSides,
} from "./page";
import type { PageNode } from "./page";

/** Minimal node for resolveFlow tests (only layout fields matter). */
function flexNode(extra: Partial<PageNode> = {}): PageNode {
  return {
    id: "n",
    type: "Layout",
    props: {},
    children: [],
    frame: { x: 0, y: 0, w: 100, h: 100 },
    ...extra,
  };
}

describe("resolveFlow", () => {
  it("returns null when the node is not in flex mode (default = absolute)", () => {
    expect(resolveFlow(flexNode())).toBeNull();
    expect(resolveFlow(flexNode({ layout: "absolute" }))).toBeNull();
  });

  it("maps enum fields to CSS keywords and wraps so children reflow", () => {
    const flow = resolveFlow(
      flexNode({
        layout: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "center",
        justifyContent: "between",
      }),
    );
    expect(flow).toEqual({
      flexDirection: "column",
      flexWrap: "wrap",
      gap: 12,
      alignItems: "center",
      justifyContent: "space-between",
    });
  });

  it("defaults direction/align/justify and sanitizes gap (negative → 0)", () => {
    const flow = resolveFlow(flexNode({ layout: "flex", gap: -5 }))!;
    expect(flow.flexDirection).toBe("row");
    expect(flow.alignItems).toBe("flex-start");
    expect(flow.justifyContent).toBe("flex-start");
    expect(flow.gap).toBe(0);
  });

  it("falls back to flex-start for an unknown enum (never injects)", () => {
    const flow = resolveFlow(
      flexNode({
        layout: "flex",
        alignItems: "evil; }" as unknown as "center",
        justifyContent: "x" as unknown as "center",
      }),
    )!;
    expect(flow.alignItems).toBe("flex-start");
    expect(flow.justifyContent).toBe("flex-start");
  });

  it("returns null for a grid node so flex drag-reorder does not run", () => {
    expect(resolveFlow(flexNode({ layout: "grid" }))).toBeNull();
  });
});

describe("resolveGrid", () => {
  it("returns null when the node is not in grid mode", () => {
    expect(resolveGrid(flexNode())).toBeNull();
    expect(resolveGrid(flexNode({ layout: "flex" }))).toBeNull();
  });

  it("maps counts and shared alignment fields to CSS-ready values", () => {
    expect(
      resolveGrid(
        flexNode({
          layout: "grid",
          gridColumns: 3,
          gridRows: 2,
          gap: 8,
          alignItems: "center",
          justifyContent: "between",
        }),
      ),
    ).toEqual({
      columns: 3,
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gridTemplateRows: "repeat(2, minmax(0, 1fr))",
      gap: 8,
      alignItems: "center",
      justifyContent: "space-between",
    });
  });

  it("defaults missing, zero, and negative column counts to one safe column", () => {
    expect(resolveGrid(flexNode({ layout: "grid" }))!.gridTemplateColumns).toBe(
      "repeat(1, minmax(0, 1fr))",
    );
    expect(resolveGrid(flexNode({ layout: "grid", gridColumns: 0 }))!.gridTemplateColumns).toBe(
      "repeat(1, minmax(0, 1fr))",
    );
    expect(resolveGrid(flexNode({ layout: "grid", gridColumns: -3 }))!.gridTemplateColumns).toBe(
      "repeat(1, minmax(0, 1fr))",
    );
  });

  it("omits auto rows when row count is absent, zero, or negative", () => {
    expect(resolveGrid(flexNode({ layout: "grid" }))!.gridTemplateRows).toBeNull();
    expect(resolveGrid(flexNode({ layout: "grid", gridRows: 0 }))!.gridTemplateRows).toBeNull();
    expect(resolveGrid(flexNode({ layout: "grid", gridRows: -2 }))!.gridTemplateRows).toBeNull();
  });

  it("falls back for unknown alignment enums (never injects)", () => {
    const grid = resolveGrid(
      flexNode({
        layout: "grid",
        alignItems: "evil; }" as unknown as "center",
        justifyContent: "x" as unknown as "center",
      }),
    )!;
    expect(grid.alignItems).toBe("stretch");
    expect(grid.justifyContent).toBe("flex-start");
  });
});

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

describe("spacing tokens", () => {
  it("round-trips a ref through make/is/key/var", () => {
    const ref = makeSpacingTokenRef("md");
    expect(ref).toBe("token:md");
    expect(isSpacingTokenRef(ref)).toBe(true);
    expect(isSpacingTokenRef({ top: 0, right: 0, bottom: 0, left: 0 })).toBe(false);
    expect(isSpacingTokenRef(undefined)).toBe(false);
    expect(spacingTokenVar("md")).toBe("--space-md");
  });

  it("resolves a ref to its px value; non-refs and dangling refs to undefined", () => {
    const tokens = { spacing: { md: 16 } };
    expect(resolveSpacing(makeSpacingTokenRef("md"), tokens)).toBe(16);
    expect(resolveSpacing(makeSpacingTokenRef("gone"), tokens)).toBeUndefined();
    expect(resolveSpacing({ top: 8, right: 8, bottom: 8, left: 8 }, tokens)).toBeUndefined();
    expect(resolveSpacing(makeSpacingTokenRef("md"), undefined)).toBeUndefined();
  });

  it("toSides expands a token ref uniformly, dangling → zero", () => {
    const tokens = { spacing: { md: 16 } };
    expect(toSides(makeSpacingTokenRef("md"), tokens)).toEqual({
      top: 16,
      right: 16,
      bottom: 16,
      left: 16,
    });
    expect(toSides(makeSpacingTokenRef("gone"), tokens)).toEqual(ZERO_SIDES);
    expect(toSides(makeSpacingTokenRef("md"))).toEqual(ZERO_SIDES); // no tokens passed
  });
});

describe("font tokens", () => {
  it("documentFontFamily returns the sanitized body font, or undefined", () => {
    expect(documentFontFamily({ fonts: { body: "Pretendard, sans-serif" } })).toBe(
      "Pretendard, sans-serif",
    );
    expect(documentFontFamily({ fonts: {} })).toBeUndefined();
    expect(documentFontFamily(undefined)).toBeUndefined();
    // An unsafe body value is dropped, not applied.
    expect(documentFontFamily({ fonts: { body: "x; } body { display:none" } })).toBeUndefined();
  });
});

describe("token sanitizers (A03 trust boundary)", () => {
  it("sanitizeFontFamily allows font stacks, rejects CSS-breakout chars", () => {
    expect(sanitizeFontFamily('Pretendard, "Helvetica Neue", sans-serif')).toBe(
      'Pretendard, "Helvetica Neue", sans-serif',
    );
    expect(sanitizeFontFamily("Inter")).toBe("Inter");
    expect(sanitizeFontFamily("red; } body { color: red")).toBeNull();
    expect(sanitizeFontFamily("url(evil)")).toBeNull();
    expect(sanitizeFontFamily("")).toBeNull();
    expect(sanitizeFontFamily(undefined)).toBeNull();
  });

  it("sanitizeSpacing coerces to a non-negative integer, else null", () => {
    expect(sanitizeSpacing(16)).toBe(16);
    expect(sanitizeSpacing(7.6)).toBe(8);
    expect(sanitizeSpacing(-4)).toBe(0);
    expect(sanitizeSpacing(Number.NaN)).toBeNull();
    expect(sanitizeSpacing(undefined)).toBeNull();
    expect(sanitizeSpacing("16" as never)).toBeNull();
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

// --- B1: resolvePadding / resolveMargin ---

/** Helper: node with explicit base padding and optional overrides. */
function paddingNode(
  base: PageNode["padding"],
  overrides?: PageNode["overrides"],
): PageNode {
  return {
    id: "p",
    type: "Card",
    props: {},
    children: [],
    frame: { x: 0, y: 0, w: 100, h: 100 },
    padding: base,
    overrides,
  };
}

function marginNode(
  base: PageNode["margin"],
  overrides?: PageNode["overrides"],
): PageNode {
  return {
    id: "m",
    type: "Card",
    props: {},
    children: [],
    frame: { x: 0, y: 0, w: 100, h: 100 },
    margin: base,
    overrides,
  };
}

describe("resolvePadding", () => {
  // 1. 오버라이드 없음 → 모든 BP에서 base 반환
  it("returns base padding for all breakpoints when no overrides exist", () => {
    const base = { top: 10, right: 10, bottom: 10, left: 10 };
    const node = paddingNode(base);
    expect(resolvePadding(node, "desktop")).toEqual(base);
    expect(resolvePadding(node, "tablet")).toEqual(base);
    expect(resolvePadding(node, "mobile")).toEqual(base);
  });

  // 2. tablet override → tablet에서 그 값, mobile에서도 상속
  it("tablet override cascades into mobile (inheritance)", () => {
    const base = { top: 10, right: 10, bottom: 10, left: 10 };
    const tabletVal = { top: 20, right: 20, bottom: 20, left: 20 };
    const node = paddingNode(base, { tablet: { padding: tabletVal } });

    expect(resolvePadding(node, "desktop")).toEqual(base);      // base 불변
    expect(resolvePadding(node, "tablet")).toEqual(tabletVal);  // override 적용
    expect(resolvePadding(node, "mobile")).toEqual(tabletVal);  // tablet 값 상속
  });

  // 3. mobile override → mobile에서 mobile 값이 승 (tablet보다 우선)
  it("mobile override wins over tablet at mobile breakpoint", () => {
    const base = { top: 10, right: 10, bottom: 10, left: 10 };
    const tabletVal = { top: 20, right: 20, bottom: 20, left: 20 };
    const mobileVal = { top: 5, right: 5, bottom: 5, left: 5 };
    const node = paddingNode(base, {
      tablet: { padding: tabletVal },
      mobile: { padding: mobileVal },
    });

    expect(resolvePadding(node, "tablet")).toEqual(tabletVal);
    expect(resolvePadding(node, "mobile")).toEqual(mobileVal);  // mobile 값이 승
  });

  // 4. 통째 교체: base {10,...}, tablet override {20,...} → tablet에서 20 (병합 아님)
  it("tablet override is a complete replacement, not a per-side merge", () => {
    const base = { top: 10, right: 10, bottom: 10, left: 10 };
    const tabletVal = { top: 20, right: 30, bottom: 40, left: 50 };
    const node = paddingNode(base, { tablet: { padding: tabletVal } });

    // 통째 치환이므로 base의 10이 남으면 안 됨
    const resolved = resolvePadding(node, "tablet");
    expect(resolved).toEqual(tabletVal);
    expect(resolved).not.toEqual(base);
  });

  // token-ref override → 그대로 반환
  it("returns a token-ref override as-is", () => {
    const ref = makeSpacingTokenRef("md");
    const node = paddingNode(undefined, { tablet: { padding: ref } });
    expect(resolvePadding(node, "tablet")).toBe(ref);
    expect(resolvePadding(node, "mobile")).toBe(ref); // 상속
  });

  // desktop은 항상 base (override가 있어도 desktop에는 영향 없음)
  it("desktop always returns the base value regardless of overrides", () => {
    const base = { top: 8, right: 8, bottom: 8, left: 8 };
    const node = paddingNode(base, {
      tablet: { padding: { top: 99, right: 99, bottom: 99, left: 99 } },
    });
    expect(resolvePadding(node, "desktop")).toEqual(base);
  });
});

describe("resolveMargin", () => {
  // 대칭 케이스: resolvePadding과 동일한 논리, margin 필드로 검증

  it("returns base margin for all breakpoints when no overrides exist", () => {
    const base = { top: 4, right: 8, bottom: 4, left: 8 };
    const node = marginNode(base);
    expect(resolveMargin(node, "desktop")).toEqual(base);
    expect(resolveMargin(node, "tablet")).toEqual(base);
    expect(resolveMargin(node, "mobile")).toEqual(base);
  });

  it("tablet margin override cascades into mobile", () => {
    const base = { top: 4, right: 4, bottom: 4, left: 4 };
    const tabletVal = { top: 16, right: 16, bottom: 16, left: 16 };
    const node = marginNode(base, { tablet: { margin: tabletVal } });

    expect(resolveMargin(node, "tablet")).toEqual(tabletVal);
    expect(resolveMargin(node, "mobile")).toEqual(tabletVal); // tablet 상속
  });

  it("mobile margin override wins over tablet", () => {
    const tabletVal = { top: 16, right: 16, bottom: 16, left: 16 };
    const mobileVal = { top: 0, right: 0, bottom: 0, left: 0 };
    const node = marginNode(undefined, {
      tablet: { margin: tabletVal },
      mobile: { margin: mobileVal },
    });

    expect(resolveMargin(node, "tablet")).toEqual(tabletVal);
    expect(resolveMargin(node, "mobile")).toEqual(mobileVal);
  });

  it("desktop always returns the base margin regardless of overrides", () => {
    const base = { top: 2, right: 2, bottom: 2, left: 2 };
    const node = marginNode(base, {
      tablet: { margin: { top: 99, right: 99, bottom: 99, left: 99 } },
    });
    expect(resolveMargin(node, "desktop")).toEqual(base);
  });
});

// --- B2: resolveBackground ---

/** Helper: node with explicit base background and optional overrides. */
function bgNode(
  base: PageNode["background"],
  overrides?: PageNode["overrides"],
): PageNode {
  return {
    id: "bg",
    type: "Card",
    props: {},
    children: [],
    frame: { x: 0, y: 0, w: 100, h: 100 },
    background: base,
    overrides,
  };
}

describe("resolveBackground", () => {
  // 1. 오버라이드 없음 → 모든 BP에서 base 반환
  it("returns base background for all breakpoints when no overrides exist", () => {
    const node = bgNode("#ff0000");
    expect(resolveBackground(node, "desktop")).toBe("#ff0000");
    expect(resolveBackground(node, "tablet")).toBe("#ff0000");
    expect(resolveBackground(node, "mobile")).toBe("#ff0000");
  });

  // 2. tablet override → tablet에서 적용, mobile에서 상속, base/desktop 불변
  it("tablet override applies at tablet and cascades into mobile; desktop stays at base", () => {
    const node = bgNode("#ffffff", { tablet: { background: "#0000ff" } });
    expect(resolveBackground(node, "desktop")).toBe("#ffffff"); // base 불변
    expect(resolveBackground(node, "tablet")).toBe("#0000ff"); // override 적용
    expect(resolveBackground(node, "mobile")).toBe("#0000ff"); // tablet 상속
  });

  // 3. mobile override → mobile에서 mobile 값이 승
  it("mobile override wins over tablet cascade at mobile breakpoint", () => {
    const node = bgNode("#ffffff", {
      tablet: { background: "#0000ff" },
      mobile: { background: "#00ff00" },
    });
    expect(resolveBackground(node, "tablet")).toBe("#0000ff");
    expect(resolveBackground(node, "mobile")).toBe("#00ff00"); // mobile 값이 승
  });

  // 4. token ref override → 통째 교체로 보존 (resolveColor 없이 raw ref 반환)
  it("returns a color-token-ref override as-is (whole-value replace)", () => {
    const ref = makeColorTokenRef("brand");
    const node = bgNode("#ffffff", { tablet: { background: ref } });
    expect(resolveBackground(node, "tablet")).toBe(ref);
    expect(resolveBackground(node, "mobile")).toBe(ref); // tablet 상속
  });

  // 5. desktop은 항상 base (override가 있어도 desktop에는 영향 없음)
  it("desktop always returns the base value regardless of tablet/mobile overrides", () => {
    const node = bgNode("#aabbcc", {
      tablet: { background: "#111111" },
      mobile: { background: "#222222" },
    });
    expect(resolveBackground(node, "desktop")).toBe("#aabbcc");
  });

  // 6. base가 undefined일 때도 override 없으면 undefined 반환
  it("returns undefined when base is absent and no overrides exist", () => {
    const node = bgNode(undefined);
    expect(resolveBackground(node, "desktop")).toBeUndefined();
    expect(resolveBackground(node, "tablet")).toBeUndefined();
    expect(resolveBackground(node, "mobile")).toBeUndefined();
  });

  // 7. mobile-only override → tablet에서는 base, mobile에서만 override
  it("mobile-only override does not affect tablet (tablet stays at base)", () => {
    const node = bgNode("#ffffff", { mobile: { background: "#999999" } });
    expect(resolveBackground(node, "tablet")).toBe("#ffffff"); // base 유지
    expect(resolveBackground(node, "mobile")).toBe("#999999"); // mobile override
  });
});
