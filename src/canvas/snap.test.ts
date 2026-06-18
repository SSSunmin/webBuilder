import { describe, expect, it } from "vitest";
import { computeSnap, snapBox, type Bounds, type SnapBox } from "./snap";

const box = (x: number, y: number, w = 100, h = 40): SnapBox => ({ x, y, w, h });

describe("computeSnap", () => {
  it("returns no movement when nothing is within threshold", () => {
    const r = computeSnap(box(500, 500), [box(0, 0)], null);
    expect(r).toEqual({ dx: 0, dy: 0, vGuides: [], hGuides: [] });
  });

  it("snaps a left edge onto a sibling's left edge", () => {
    // moving left edge at 103, sibling left edge at 100 -> dx = -3
    const r = computeSnap(box(103, 300), [box(100, 0)], null);
    expect(r.dx).toBe(-3);
    expect(r.vGuides).toContain(100);
  });

  it("snaps to the inner bounds (padded container area)", () => {
    const bounds: Bounds = { x0: 20, y0: 20, x1: 400, y1: 400 };
    // moving left edge at 24 -> snaps to x0 = 20, dx = -4
    const r = computeSnap(box(24, 200), [], bounds);
    expect(r.dx).toBe(-4);
  });

  it("respects a sibling's margin when snapping edges", () => {
    // sibling right edge is 100, with right margin 10 the snap target is 110
    const sibling: SnapBox = { x: 0, y: 0, w: 100, h: 40, margin: 10 };
    const r = computeSnap(box(108, 0), [sibling], null);
    expect(r.dx).toBe(2); // 110 - 108
  });

  it("does not snap beyond the threshold", () => {
    const r = computeSnap(box(110, 300), [box(100, 0)], null, 6);
    expect(r.dx).toBe(0);
  });
});

describe("snapBox", () => {
  it("returns the snapped top-left position", () => {
    const pos = snapBox(box(103, 203), [box(100, 200)], null);
    expect(pos).toEqual({ x: 100, y: 200 });
  });
});
