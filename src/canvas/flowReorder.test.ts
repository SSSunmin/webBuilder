import { describe, expect, it } from "vitest";
import { flowDropSide, resolveFlowDrag } from "./flowReorder";
import type { FlowRect } from "./flowReorder";
import type { PageNode } from "../types/page";

function node(
  id: string,
  type: string,
  children: string[] = [],
  extra: Partial<PageNode> = {},
): PageNode {
  return { id, type, props: {}, children, frame: { x: 0, y: 0, w: 100, h: 40 }, ...extra };
}

/** root → [ flex parent "p" with cards a,b ] + [ separate container "o" ]. */
function flexTree(): Record<string, PageNode> {
  return {
    root: node("root", "Layout", ["p", "o"]),
    p: node("p", "Layout", ["a", "b"], { layout: "flex", flexDirection: "row" }),
    a: node("a", "Card"),
    b: node("b", "Card"),
    o: node("o", "Card"),
  };
}

const R = (x: number, y: number, w = 10, h = 10): FlowRect => ({ x, y, w, h });

describe("flowDropSide", () => {
  it("row: before when active center is left of over center, after when right", () => {
    expect(flowDropSide(R(0, 0), R(100, 0), "row")).toBe("before");
    expect(flowDropSide(R(200, 0), R(100, 0), "row")).toBe("after");
  });

  it("column: before when active center is above over center, after when below", () => {
    expect(flowDropSide(R(0, 0), R(0, 100), "column")).toBe("before");
    expect(flowDropSide(R(0, 200), R(0, 100), "column")).toBe("after");
  });
});

describe("resolveFlowDrag", () => {
  it("returns null when the dragged node is not in a flex container", () => {
    const nodes = flexTree(); // "o" is a child of root (absolute), not a flex parent
    expect(resolveFlowDrag(nodes, "o", "p", R(0, 0), R(0, 0))).toBeNull();
  });

  it("reorders a sibling within the same flex parent, side from the rects", () => {
    const nodes = flexTree();
    expect(resolveFlowDrag(nodes, "a", "b", R(200, 0), R(100, 0))).toEqual({
      kind: "reorder",
      id: "a",
      refId: "b",
      side: "after",
    });
    expect(resolveFlowDrag(nodes, "a", "b", R(0, 0), R(100, 0))).toEqual({
      kind: "reorder",
      id: "a",
      refId: "b",
      side: "before",
    });
  });

  it("returns null when dropped over itself", () => {
    const nodes = flexTree();
    expect(resolveFlowDrag(nodes, "a", "a", R(0, 0), R(0, 0))).toBeNull();
  });

  it("returns null for a sibling reorder when rects are missing", () => {
    const nodes = flexTree();
    expect(resolveFlowDrag(nodes, "a", "b", null, null)).toBeNull();
  });

  it("reparents (append) when dropped over a different container", () => {
    const nodes = flexTree();
    expect(resolveFlowDrag(nodes, "a", "o", R(0, 0), R(0, 0))).toEqual({
      kind: "reparent",
      id: "a",
      parentId: "o",
    });
  });

  it("returns null over a non-container in a different parent", () => {
    const nodes = flexTree();
    nodes.o.children = ["t"];
    nodes.t = node("t", "Text"); // Text is not a container
    expect(resolveFlowDrag(nodes, "a", "t", R(0, 0), R(0, 0))).toBeNull();
  });

  it("returns null when there is no over target", () => {
    const nodes = flexTree();
    expect(resolveFlowDrag(nodes, "a", undefined, R(0, 0), R(0, 0))).toBeNull();
  });
});
