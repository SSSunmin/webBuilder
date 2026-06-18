import { describe, expect, it } from "vitest";
import { ZERO_SIDES, toSides } from "./page";

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
