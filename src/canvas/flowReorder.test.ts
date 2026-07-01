import { describe, expect, it } from "vitest";
import { resolveFlowDrop } from "./flowReorder";
import type { PageNode } from "../types/page";

function node(
  id: string,
  type: string,
  children: string[] = [],
  extra: Partial<PageNode> = {},
): PageNode {
  return { id, type, props: {}, children, frame: { x: 0, y: 0, w: 100, h: 40 }, ...extra };
}

function tree(): Record<string, PageNode> {
  return {
    root: node("root", "Layout", ["p", "target", "leafParent"]),
    p: node("p", "Layout", ["a", "b", "c"], { layout: "flex" }),
    a: node("a", "Card", ["nested"]),
    nested: node("nested", "Card"),
    b: node("b", "Card"),
    c: node("c", "Card"),
    target: node("target", "Card"),
    leafParent: node("leafParent", "Card", ["leaf"]),
    leaf: node("leaf", "Text"),
  };
}

describe("resolveFlowDrop", () => {
  it("returns null when there is no over target", () => {
    expect(resolveFlowDrop(tree(), "a", undefined)).toBeNull();
  });

  it("returns null when dropped over itself", () => {
    expect(resolveFlowDrop(tree(), "a", "a")).toBeNull();
  });

  it("reorders after a later sibling", () => {
    expect(resolveFlowDrop(tree(), "a", "c")).toEqual({
      kind: "reorder",
      id: "a",
      refId: "c",
      side: "after",
    });
  });

  it("reorders before an earlier sibling", () => {
    expect(resolveFlowDrop(tree(), "c", "a")).toEqual({
      kind: "reorder",
      id: "c",
      refId: "a",
      side: "before",
    });
  });

  it("reparents into a different container", () => {
    expect(resolveFlowDrop(tree(), "a", "target")).toEqual({
      kind: "reparent",
      id: "a",
      parentId: "target",
    });
  });

  it("returns null over a non-container in a different parent", () => {
    expect(resolveFlowDrop(tree(), "a", "leaf")).toBeNull();
  });

  it("returns null over a descendant of the active node", () => {
    expect(resolveFlowDrop(tree(), "a", "nested")).toBeNull();
  });
});
