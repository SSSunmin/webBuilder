import { beforeEach, describe, expect, it } from "vitest";
import { getBlockDef, getComponentDef, listBlocks } from "../registry";
import { makeSpacingTokenRef, resolveFrame, resolveHidden, makeColorTokenRef, resolveBackground } from "../types/page";
import { findParentChild, useEditorStore } from "./editorStore";

const store = () => useEditorStore.getState();

/** Add a node to root and force its frame to a known rectangle. */
function addAt(x: number, y: number, w: number, h: number): string {
  const rootId = store().document!.rootId;
  const id = store().addNode(rootId, "Card")!;
  store().updateNodeFrame(id, { x, y, w, h });
  return id;
}

beforeEach(() => {
  useEditorStore.getState().newDocument("test");
});

describe("addNode", () => {
  it("adds a child to a container and selects it", () => {
    const rootId = store().document!.rootId;
    const id = store().addNode(rootId, "Card");
    expect(id).not.toBeNull();
    expect(store().document!.nodes[rootId].children).toContain(id);
    expect(store().selectedIds).toEqual([id]);
  });

  it("refuses to add into a non-container node", () => {
    const rootId = store().document!.rootId;
    const heading = store().addNode(rootId, "Heading")!;
    expect(store().addNode(heading, "Text")).toBeNull();
  });
});

describe("alignNodes", () => {
  it("aligns left edges to the minimum x", () => {
    const a = addAt(10, 0, 100, 40);
    const b = addAt(50, 60, 100, 40);
    store().alignNodes([a, b], "left");
    expect(store().document!.nodes[a].frame.x).toBe(10);
    expect(store().document!.nodes[b].frame.x).toBe(10);
  });

  it("is a no-op with fewer than two nodes", () => {
    const a = addAt(10, 0, 100, 40);
    store().alignNodes([a], "left");
    expect(store().document!.nodes[a].frame.x).toBe(10);
  });

  it("is a no-op when nodes span different parents", () => {
    const rootId = store().document!.rootId;
    const card = store().addNode(rootId, "Card")!;
    // `a` lives in root; `b` lives inside the card → different parents.
    const a = addAt(10, 0, 100, 40);
    const b = store().addNode(card, "Card")!;
    store().updateNodeFrame(b, { x: 50, y: 60, w: 100, h: 40 });
    store().alignNodes([a, b], "left");
    expect(store().document!.nodes[a].frame.x).toBe(10);
    expect(store().document!.nodes[b].frame.x).toBe(50);
  });
});

describe("distributeNodes", () => {
  it("evenly spaces centers between the first and last (equal sizes)", () => {
    const a = addAt(0, 0, 100, 40);
    const b = addAt(120, 0, 100, 40);
    const c = addAt(500, 0, 100, 40);
    store().distributeNodes([a, b, c], "h");
    const ctr = (id: string) => {
      const f = store().document!.nodes[id].frame;
      return f.x + f.w / 2;
    };
    expect(ctr(b) - ctr(a)).toBe(ctr(c) - ctr(b));
  });

  it("evens out centers (not edge gaps) when sizes differ; first & last stay put", () => {
    const a = addAt(0, 0, 40, 40); // center 20
    const b = addAt(200, 0, 200, 40); // center 300 (the wide one — will move)
    const c = addAt(400, 0, 40, 40); // center 420
    store().distributeNodes([a, b, c], "h");
    const fr = (id: string) => store().document!.nodes[id].frame;
    const ctr = (id: string) => fr(id).x + fr(id).w / 2;
    // Anchors unchanged.
    expect(fr(a).x).toBe(0);
    expect(fr(c).x).toBe(400);
    // Centers equally spaced (the wide middle box centers on the midpoint).
    expect(ctr(b)).toBe(220);
    expect(ctr(b) - ctr(a)).toBe(ctr(c) - ctr(b));
  });

  it("is a no-op with fewer than three nodes", () => {
    const a = addAt(0, 0, 40, 40);
    const b = addAt(300, 0, 40, 40);
    store().distributeNodes([a, b], "h");
    expect(store().document!.nodes[b].frame.x).toBe(300);
  });

  it("is a no-op when nodes span different parents", () => {
    const rootId = store().document!.rootId;
    const card = store().addNode(rootId, "Card")!;
    const a = addAt(0, 0, 40, 40);
    const c = addAt(400, 0, 40, 40);
    // `b` lives in the card → different parent than `a`/`c`.
    const b = store().addNode(card, "Card")!;
    store().updateNodeFrame(b, { x: 200, y: 0, w: 200, h: 40 });
    store().distributeNodes([a, b, c], "h");
    expect(store().document!.nodes[a].frame.x).toBe(0);
    expect(store().document!.nodes[b].frame.x).toBe(200);
    expect(store().document!.nodes[c].frame.x).toBe(400);
  });
});

describe("reorderNode", () => {
  it("swaps a node forward/backward among its siblings", () => {
    const rootId = store().document!.rootId;
    const a = store().addNode(rootId, "Card")!;
    const b = store().addNode(rootId, "Card")!;
    const c = store().addNode(rootId, "Card")!;
    expect(store().document!.nodes[rootId].children).toEqual([a, b, c]);

    store().reorderNode(a, "forward");
    expect(store().document!.nodes[rootId].children).toEqual([b, a, c]);

    store().reorderNode(a, "backward");
    expect(store().document!.nodes[rootId].children).toEqual([a, b, c]);
  });

  it("is a no-op at the ends", () => {
    const rootId = store().document!.rootId;
    const a = store().addNode(rootId, "Card")!;
    const b = store().addNode(rootId, "Card")!;
    store().reorderNode(a, "backward"); // already first
    expect(store().document!.nodes[rootId].children).toEqual([a, b]);
    store().reorderNode(b, "forward"); // already last
    expect(store().document!.nodes[rootId].children).toEqual([a, b]);
  });
});

describe("moveNodeInto", () => {
  it("moves a node to be the last child of a different container", () => {
    const rootId = store().document!.rootId;
    const source = store().addNode(rootId, "Card")!;
    const target = store().addNode(rootId, "Card")!;
    const moved = store().addNode(source, "Heading")!;
    const existing = store().addNode(target, "Text")!;

    store().moveNodeInto(moved, target);

    expect(store().document!.nodes[source].children).toEqual([]);
    expect(store().document!.nodes[target].children).toEqual([existing, moved]);
  });

  it("refuses when target is not a container", () => {
    const rootId = store().document!.rootId;
    const source = store().addNode(rootId, "Card")!;
    const target = store().addNode(rootId, "Heading")!;
    const moved = store().addNode(source, "Text")!;

    store().moveNodeInto(moved, target);

    expect(store().document!.nodes[source].children).toEqual([moved]);
    expect(store().document!.nodes[target].children).toEqual([]);
  });

  it("refuses moving root", () => {
    const rootId = store().document!.rootId;
    const target = store().addNode(rootId, "Card")!;

    store().moveNodeInto(rootId, target);

    expect(store().document!.nodes[rootId].children).toEqual([target]);
    expect(store().document!.nodes[target].children).toEqual([]);
  });

  it("refuses moving into own descendant", () => {
    const rootId = store().document!.rootId;
    const parent = store().addNode(rootId, "Card")!;
    const child = store().addNode(parent, "Card")!;

    store().moveNodeInto(parent, child);

    expect(store().document!.nodes[rootId].children).toEqual([parent]);
    expect(store().document!.nodes[parent].children).toEqual([child]);
    expect(store().document!.nodes[child].children).toEqual([]);
  });
});

describe("moveNodeAdjacent", () => {
  it("places a node before and after a sibling", () => {
    const rootId = store().document!.rootId;
    const a = store().addNode(rootId, "Card")!;
    const b = store().addNode(rootId, "Card")!;
    const c = store().addNode(rootId, "Card")!;

    store().moveNodeAdjacent(c, a, "before");
    expect(store().document!.nodes[rootId].children).toEqual([c, a, b]);

    store().moveNodeAdjacent(c, b, "after");
    expect(store().document!.nodes[rootId].children).toEqual([a, b, c]);
  });

  it("reorders within the same parent", () => {
    const rootId = store().document!.rootId;
    const a = store().addNode(rootId, "Card")!;
    const b = store().addNode(rootId, "Card")!;
    const c = store().addNode(rootId, "Card")!;

    store().moveNodeAdjacent(a, c, "after");

    expect(store().document!.nodes[rootId].children).toEqual([b, c, a]);
  });

  it("refuses moving adjacent to a ref inside the moved node's own subtree", () => {
    const rootId = store().document!.rootId;
    const parent = store().addNode(rootId, "Card")!;
    const sibling = store().addNode(rootId, "Card")!;
    const child = store().addNode(parent, "Card")!;

    store().moveNodeAdjacent(parent, child, "before");

    expect(store().document!.nodes[rootId].children).toEqual([parent, sibling]);
    expect(store().document!.nodes[parent].children).toEqual([child]);
  });
});

describe("addBlock", () => {
  it("inserts a section container with the block's children and selects it", () => {
    const rootId = store().document!.rootId;
    const sectionId = store().addBlock(rootId, "hero");

    expect(sectionId).not.toBeNull();
    const section = store().document!.nodes[sectionId!];
    // The section is a container appended to root and is now selected.
    expect(getComponentDef(section.type)?.isContainer).toBe(true);
    expect(store().document!.nodes[rootId].children).toContain(sectionId);
    expect(store().selectedIds).toEqual([sectionId]);

    // Children match the block spec (types + order) and live in the document.
    const block = getBlockDef("hero")!;
    expect(section.children).toHaveLength(block.children.length);
    const childTypes = section.children.map((c) => store().document!.nodes[c].type);
    expect(childTypes).toEqual(block.children.map((c) => c.type));
  });

  it("applies child prop overrides from the block spec", () => {
    const rootId = store().document!.rootId;
    const sectionId = store().addBlock(rootId, "footer")!;
    const firstChildId = store().document!.nodes[sectionId].children[0];
    expect(store().document!.nodes[firstChildId].props.color).toBe("#ffffff");
  });

  it("is one undo step (removes the whole section and its children)", () => {
    const rootId = store().document!.rootId;
    const before = Object.keys(store().document!.nodes).length;
    const sectionId = store().addBlock(rootId, "hero")!;
    expect(Object.keys(store().document!.nodes).length).toBeGreaterThan(before);

    store().undo();
    expect(store().document!.nodes[sectionId]).toBeUndefined();
    expect(Object.keys(store().document!.nodes).length).toBe(before);
    expect(store().document!.nodes[rootId].children).not.toContain(sectionId);
  });

  it("refuses a non-container parent and an unknown block key", () => {
    const rootId = store().document!.rootId;
    const heading = store().addNode(rootId, "Heading")!;
    expect(store().addBlock(heading, "hero")).toBeNull();
    expect(store().addBlock(rootId, "does-not-exist")).toBeNull();
  });
});

describe("block registry integrity", () => {
  it("every block uses registered, container section types and registered children", () => {
    for (const block of listBlocks()) {
      const sectionDef = getComponentDef(block.section.type);
      expect(sectionDef, `section type ${block.section.type}`).toBeDefined();
      expect(sectionDef!.isContainer).toBe(true);
      for (const child of block.children) {
        expect(getComponentDef(child.type), `child type ${child.type}`).toBeDefined();
      }
    }
  });
});

describe("duplicateNode", () => {
  it("clones a node right after the original with an offset and selects it", () => {
    const rootId = store().document!.rootId;
    const a = store().addNode(rootId, "Heading")!;
    store().updateNodeFrame(a, { x: 10, y: 20 });

    const dup = store().duplicateNode(a);
    expect(dup).not.toBeNull();
    expect(dup).not.toBe(a);
    expect(store().document!.nodes[rootId].children).toEqual([a, dup]);

    const orig = store().document!.nodes[a];
    const copy = store().document!.nodes[dup!];
    expect(copy.type).toBe("Heading");
    expect(copy.frame).toEqual({ ...orig.frame, x: orig.frame.x + 16, y: orig.frame.y + 16 });
    expect(store().selectedIds).toEqual([dup]);
  });

  it("deep-clones a container subtree with fresh, independent ids", () => {
    const rootId = store().document!.rootId;
    const card = store().addNode(rootId, "Card")!;
    const child = store().addNode(card, "Text")!;
    const before = Object.keys(store().document!.nodes).length;

    const dup = store().duplicateNode(card)!;
    expect(Object.keys(store().document!.nodes).length).toBe(before + 2);

    const copyChildId = store().document!.nodes[dup].children[0];
    expect(copyChildId).not.toBe(child);

    // Editing the clone's child must not affect the original subtree.
    store().updateNodeProps(copyChildId, { content: "변경됨" });
    expect(store().document!.nodes[child].props.content).not.toBe("변경됨");
  });

  it("refuses the root and is one undo step", () => {
    const rootId = store().document!.rootId;
    expect(store().duplicateNode(rootId)).toBeNull();

    const card = store().addNode(rootId, "Card")!;
    store().addNode(card, "Text");
    const before = Object.keys(store().document!.nodes).length;

    const dup = store().duplicateNode(card)!;
    expect(Object.keys(store().document!.nodes).length).toBe(before + 2);

    store().undo();
    expect(store().document!.nodes[dup]).toBeUndefined();
    expect(Object.keys(store().document!.nodes).length).toBe(before);
  });
});

describe("undo / redo", () => {
  it("reverts and re-applies the last change", () => {
    const id = addAt(0, 0, 100, 40);
    store().moveNodeBy(id, 30, 40, "move");
    expect(store().document!.nodes[id].frame.x).toBe(30);

    store().undo();
    expect(store().document!.nodes[id].frame.x).toBe(0);

    store().redo();
    expect(store().document!.nodes[id].frame.x).toBe(30);
  });

  it("coalesces same-tag patches into one undo step", () => {
    const id = addAt(0, 0, 100, 40);
    const past0 = store().past.length;
    store().updateNodeFrame(id, { w: 110 }, "resize");
    store().updateNodeFrame(id, { w: 120 }, "resize");
    // Same tag, no selection change in between → one snapshot.
    expect(store().past.length).toBe(past0 + 1);
  });

  it("starts a new undo session when selection changes between same-tag patches", () => {
    const a = addAt(0, 0, 100, 40);
    const b = addAt(0, 0, 100, 40);
    const past0 = store().past.length;
    store().updateNodeFrame(a, { w: 110 }, "resize");
    store().selectNode(b);
    store().updateNodeFrame(a, { w: 120 }, "resize");
    // selectNode resets lastTag → two separate snapshots despite the same tag.
    expect(store().past.length).toBe(past0 + 2);
  });
});

describe("activeBreakpoint", () => {
  it("starts at desktop and switches via setBreakpoint", () => {
    expect(store().activeBreakpoint).toBe("desktop");
    store().setBreakpoint("mobile");
    expect(store().activeBreakpoint).toBe("mobile");
  });

  it("does not change desktop base-frame editing (desktop stays the source of truth)", () => {
    // Regression guard: on desktop, frame edits still write the base frame and
    // never create overrides.
    const id = addAt(0, 0, 100, 40);
    store().updateNodeFrame(id, { x: 30, w: 120 });
    expect(store().document!.nodes[id].frame).toEqual({ x: 30, y: 0, w: 120, h: 40 });
    expect(store().document!.nodes[id].overrides).toBeUndefined();
  });
});

describe("breakpoint-aware frame writes", () => {
  describe("desktop regression", () => {
    it("updateNodeFrame / moveNodeBy write the base frame and create no overrides", () => {
      const id = addAt(0, 0, 100, 40);
      store().updateNodeFrame(id, { w: 200 });
      store().moveNodeBy(id, 10, 20, "move");
      const node = store().document!.nodes[id];
      expect(node.frame).toEqual({ x: 10, y: 20, w: 200, h: 40 });
      expect(node.overrides).toBeUndefined();
    });

    it("alignNodes / distributeNodes write the base frame and create no overrides", () => {
      const a = addAt(10, 0, 100, 40);
      const b = addAt(50, 60, 100, 40);
      const c = addAt(500, 200, 100, 40);
      store().alignNodes([a, b, c], "left");
      expect(store().document!.nodes[a].frame.x).toBe(10);
      expect(store().document!.nodes[b].frame.x).toBe(10);
      store().distributeNodes([a, b, c], "v");
      for (const id of [a, b, c]) {
        expect(store().document!.nodes[id].overrides).toBeUndefined();
      }
    });
  });

  describe("override recording at a breakpoint", () => {
    it("updateNodeFrame writes overrides[bp].frame and leaves the base frame alone", () => {
      const id = addAt(0, 0, 100, 40);
      store().setBreakpoint("mobile");
      store().updateNodeFrame(id, { w: 200 });
      const node = store().document!.nodes[id];
      expect(node.frame.w).toBe(100); // base unchanged
      expect(node.overrides!.mobile!.frame!.w).toBe(200);
      expect(resolveFrame(node, "mobile").w).toBe(200);
      expect(resolveFrame(node, "desktop").w).toBe(100);
    });

    it("moveNodeBy moves from the resolved position into overrides[bp].frame", () => {
      const id = addAt(0, 0, 100, 40);
      store().setBreakpoint("mobile");
      // Seed an existing mobile position so we can prove the move is resolved-based.
      store().updateNodeFrame(id, { x: 50, y: 50 });
      store().moveNodeBy(id, 10, 20, "move");
      const node = store().document!.nodes[id];
      expect(node.frame.x).toBe(0); // base x untouched
      expect(node.frame.y).toBe(0);
      expect(node.overrides!.mobile!.frame!.x).toBe(60); // 50 + 10
      expect(node.overrides!.mobile!.frame!.y).toBe(70); // 50 + 20
    });

    it("alignNodes records only the changed axis as a sparse override", () => {
      const a = addAt(10, 0, 100, 40);
      const b = addAt(50, 60, 120, 40);
      store().setBreakpoint("mobile");
      store().alignNodes([a, b], "left");
      const bNode = store().document!.nodes[b];
      // Only x is overridden; w/h/y still inherit from base.
      expect(bNode.overrides!.mobile!.frame).toEqual({ x: 10 });
      expect(bNode.frame.x).toBe(50); // base x unchanged
      expect(resolveFrame(bNode, "mobile")).toEqual({ x: 10, y: 60, w: 120, h: 40 });
    });
  });

  describe("setNodeHidden / resetOverride", () => {
    it("toggles hidden at a breakpoint and resetOverride restores inheritance", () => {
      const id = addAt(0, 0, 100, 40);
      store().setNodeHidden(id, "tablet", true);
      let node = store().document!.nodes[id];
      expect(resolveHidden(node, "tablet")).toBe(true);
      expect(resolveHidden(node, "desktop")).toBe(false);

      store().resetOverride(id, "tablet");
      node = store().document!.nodes[id];
      expect(resolveHidden(node, "tablet")).toBe(false);
      expect(node.overrides?.tablet).toBeUndefined();
    });

    it("setNodeHidden preserves a sibling frame override; desktop is a no-op", () => {
      const id = addAt(0, 0, 100, 40);
      store().setBreakpoint("tablet");
      store().updateNodeFrame(id, { w: 200 });
      store().setNodeHidden(id, "tablet", true);
      const node = store().document!.nodes[id];
      expect(node.overrides!.tablet).toEqual({ frame: { w: 200 }, hidden: true });

      store().setNodeHidden(id, "desktop", true); // no-op
      expect(resolveHidden(store().document!.nodes[id], "desktop")).toBe(false);
    });

    it("resetOverride is a no-op on desktop", () => {
      const id = addAt(0, 0, 100, 40);
      store().setBreakpoint("tablet");
      store().updateNodeFrame(id, { w: 200 });
      store().resetOverride(id, "desktop");
      expect(store().document!.nodes[id].overrides!.tablet!.frame!.w).toBe(200);
    });
  });
});

describe("duplicateNode overrides", () => {
  it("deep-clones per-breakpoint overrides independently", () => {
    const rootId = store().document!.rootId;
    const a = store().addNode(rootId, "Card")!;
    // Seed an override directly on the node (Stage A has no action for this yet).
    useEditorStore.setState((s) => ({
      document: {
        ...s.document!,
        nodes: {
          ...s.document!.nodes,
          [a]: { ...s.document!.nodes[a], overrides: { tablet: { frame: { w: 200 }, hidden: true } } },
        },
      },
    }));

    const dup = store().duplicateNode(a)!;
    const copy = store().document!.nodes[dup];
    expect(copy.overrides).toEqual({ tablet: { frame: { w: 200 }, hidden: true } });
    // Mutating the clone's nested frame must not touch the original.
    expect(copy.overrides!.tablet!.frame).not.toBe(
      store().document!.nodes[a].overrides!.tablet!.frame,
    );
  });
});

describe("node events", () => {
  it("adds a default click binding and edits its fields", () => {
    const id = addAt(0, 0, 100, 40);
    store().addNodeEvent(id);
    let events = store().document!.nodes[id].events!;
    expect(events).toHaveLength(1);
    expect(events[0].trigger).toBe("click");
    expect(events[0].action).toBe("custom");

    store().updateNodeEvent(id, events[0].id, { action: "navigate", target: "/pricing" });
    events = store().document!.nodes[id].events!;
    expect(events[0]).toMatchObject({ action: "navigate", target: "/pricing" });
  });

  it("removes a binding by id, leaving the others", () => {
    const id = addAt(0, 0, 100, 40);
    store().addNodeEvent(id);
    store().addNodeEvent(id);
    const [first, second] = store().document!.nodes[id].events!;
    store().removeNodeEvent(id, first.id);
    const events = store().document!.nodes[id].events!;
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe(second.id);
  });

  it("each add is its own undo step", () => {
    const id = addAt(0, 0, 100, 40);
    const past0 = store().past.length;
    store().addNodeEvent(id);
    store().addNodeEvent(id);
    expect(store().past.length).toBe(past0 + 2);
    store().undo();
    expect(store().document!.nodes[id].events).toHaveLength(1);
  });

  it("duplicateNode deep-clones events so edits don't leak to the original", () => {
    const rootId = store().document!.rootId;
    const a = store().addNode(rootId, "Card")!;
    store().addNodeEvent(a);
    const evId = store().document!.nodes[a].events![0].id;

    const dup = store().duplicateNode(a)!;
    const copyEvId = store().document!.nodes[dup].events![0].id;
    // The clone's binding gets a fresh id (no collision with the original).
    expect(copyEvId).not.toBe(evId);
    store().updateNodeEvent(dup, copyEvId, { target: "변경됨" });

    expect(store().document!.nodes[a].events![0].target).not.toBe("변경됨");
    expect(store().document!.nodes[a].events![0].id).toBe(evId);
  });
});

describe("updateNodeSpacing", () => {
  it("merges per-side padding without dropping other sides", () => {
    const id = addAt(0, 0, 100, 40);
    store().updateNodeSpacing(id, { padding: { left: 12 } });
    store().updateNodeSpacing(id, { padding: { top: 8 } });
    expect(store().document!.nodes[id].padding).toEqual({
      top: 8,
      right: 0,
      bottom: 0,
      left: 12,
    });
  });

  it("editing a side converts a token-ref padding to explicit per-side numbers", () => {
    const id = addAt(0, 0, 100, 40);
    store().setSpacingToken("md", 16);
    store().setNodeSpacingValue(id, "padding", makeSpacingTokenRef("md"));
    // Editing one side resolves the token (16 all round) then overrides top.
    store().updateNodeSpacing(id, { padding: { top: 4 } });
    expect(store().document!.nodes[id].padding).toEqual({
      top: 4,
      right: 16,
      bottom: 16,
      left: 16,
    });
  });
});

describe("design tokens", () => {
  it("ignores invalid token keys for fonts and spacing", () => {
    store().setFontToken("1bad", "Inter"); // must start with a letter
    store().setSpacingToken("with space", 8);
    const tokens = store().document!.meta.tokens;
    expect(tokens?.fonts).toBeUndefined();
    expect(tokens?.spacing).toBeUndefined();
  });

  it("removing a spacing token leaves a referencing node's ref dangling (node survives)", () => {
    const id = addAt(0, 0, 100, 40);
    store().setSpacingToken("md", 16);
    store().setNodeSpacingValue(id, "padding", makeSpacingTokenRef("md"));
    store().removeSpacingToken("md");
    expect(store().document!.meta.tokens?.spacing?.md).toBeUndefined();
    expect(store().document!.nodes[id].padding).toBe(makeSpacingTokenRef("md")); // ref preserved
  });

  it("duplicateNode copies a token-ref padding as-is (no string spread)", () => {
    const id = addAt(0, 0, 100, 40);
    store().setSpacingToken("md", 16);
    store().setNodeSpacingValue(id, "padding", makeSpacingTokenRef("md"));
    const dup = store().duplicateNode(id)!;
    expect(store().document!.nodes[dup].padding).toBe(makeSpacingTokenRef("md"));
  });
});

describe("node shadow", () => {
  it("creates a default shadow then merges partial updates", () => {
    const id = addAt(0, 0, 100, 40);
    store().updateNodeShadow(id, {});
    expect(store().document!.nodes[id].boxShadow).toMatchObject({ y: 4, blur: 12 });
    store().updateNodeShadow(id, { y: 10, opacity: 0.5 });
    const sh = store().document!.nodes[id].boxShadow!;
    expect(sh.y).toBe(10);
    expect(sh.opacity).toBe(0.5);
    expect(sh.blur).toBe(12); // untouched fields keep their value
  });

  it("clearNodeShadow removes the shadow", () => {
    const id = addAt(0, 0, 100, 40);
    store().updateNodeShadow(id, { blur: 20 });
    store().clearNodeShadow(id);
    expect(store().document!.nodes[id].boxShadow).toBeUndefined();
  });
});

describe("findParentChild", () => {
  /** Build a Card parent with one child Card; returns [parentId, childId]. */
  const makeParentChild = (): [string, string] => {
    const rootId = store().document!.rootId;
    const parent = store().addNode(rootId, "Card")!;
    store().updateNodeFrame(parent, { x: 0, y: 0, w: 400, h: 300 });
    const child = store().addNode(parent, "Card")!;
    store().updateNodeFrame(child, { x: 0, y: 0, w: 100, h: 80 });
    return [parent, child];
  };

  it("detects a parent selected together with its direct child", () => {
    const [parent, child] = makeParentChild();
    expect(findParentChild(store().document!.nodes, [parent, child])).toEqual({
      parentId: parent,
      childIds: [child],
    });
  });

  it("returns null for a siblings-only selection", () => {
    const a = addAt(0, 0, 100, 40);
    const b = addAt(120, 0, 100, 40);
    expect(findParentChild(store().document!.nodes, [a, b])).toBeNull();
  });

  it("returns null when the other id is not a direct child", () => {
    const [parent] = makeParentChild();
    const sibling = addAt(0, 0, 50, 50); // child of root, not of parent
    expect(findParentChild(store().document!.nodes, [parent, sibling])).toBeNull();
  });
});

describe("centerInParent", () => {
  const makeParentChild = (): [string, string] => {
    const rootId = store().document!.rootId;
    const parent = store().addNode(rootId, "Card")!;
    store().updateNodeFrame(parent, { x: 0, y: 0, w: 400, h: 300 });
    const child = store().addNode(parent, "Card")!;
    store().updateNodeFrame(child, { x: 5, y: 7, w: 100, h: 80 });
    return [parent, child];
  };

  it("centers a child horizontally within the parent box, leaving y untouched", () => {
    const [parent, child] = makeParentChild();
    store().centerInParent([parent, child], "h");
    const f = store().document!.nodes[child].frame;
    expect(f.x).toBe(150); // (400 - 100) / 2
    expect(f.y).toBe(7);
  });

  it("centers a child vertically within the parent box, leaving x untouched", () => {
    const [parent, child] = makeParentChild();
    store().centerInParent([parent, child], "v");
    const f = store().document!.nodes[child].frame;
    expect(f.y).toBe(110); // (300 - 80) / 2
    expect(f.x).toBe(5);
  });

  it("is a no-op when the selection is not a parent+child shape", () => {
    const a = addAt(10, 10, 100, 40);
    const b = addAt(200, 10, 100, 40);
    store().centerInParent([a, b], "h");
    expect(store().document!.nodes[a].frame.x).toBe(10);
    expect(store().document!.nodes[b].frame.x).toBe(200);
  });
});

describe("B1: per-breakpoint padding/margin overrides (store)", () => {
  // 5. tablet에서 updateNodeSpacing → overrides.tablet.padding이 완전한 Sides, base 불변
  it("updateNodeSpacing at tablet writes a complete Sides into overrides[tablet].padding, leaving base untouched", () => {
    const id = addAt(0, 0, 100, 40);
    // base padding을 먼저 설정
    store().updateNodeSpacing(id, { padding: { top: 4, right: 4, bottom: 4, left: 4 } });
    const basePadding = store().document!.nodes[id].padding;

    store().setBreakpoint("tablet");
    store().updateNodeSpacing(id, { padding: { top: 8 } });

    const node = store().document!.nodes[id];
    // base 불변
    expect(node.padding).toEqual(basePadding);
    // override.tablet.padding은 resolved-at-tablet을 seed로 한 완전한 Sides
    const ov = node.overrides?.tablet?.padding;
    expect(typeof ov).toBe("object"); // Sides, not undefined/string
    expect((ov as { top: number }).top).toBe(8);
    // 나머지 3면은 base에서 seed된 값(4)을 가져야 함
    expect((ov as { right: number }).right).toBe(4);
    expect((ov as { bottom: number }).bottom).toBe(4);
    expect((ov as { left: number }).left).toBe(4);
  });

  // 6. desktop에서 updateNodeSpacing → base에 쓰고 override 미생성 (회귀)
  it("updateNodeSpacing at desktop writes base only, creates no overrides (regression)", () => {
    const id = addAt(0, 0, 100, 40);
    // desktop이 기본값이지만 명시적으로 설정
    store().setBreakpoint("desktop");
    store().updateNodeSpacing(id, { padding: { top: 12 } });

    const node = store().document!.nodes[id];
    expect((node.padding as { top: number }).top).toBe(12);
    expect(node.overrides?.tablet?.padding).toBeUndefined();
    expect(node.overrides?.mobile?.padding).toBeUndefined();
  });

  // 7. setNodeSpacingValue @tablet → override.tablet.padding이 token-ref, base 불변
  it("setNodeSpacingValue at tablet stores token-ref in override, leaves base unchanged", () => {
    const id = addAt(0, 0, 100, 40);
    store().setSpacingToken("md", 16);
    // base에 먼저 Sides 세팅
    store().updateNodeSpacing(id, { padding: { top: 4, right: 4, bottom: 4, left: 4 } });
    const baseBefore = store().document!.nodes[id].padding;

    store().setBreakpoint("tablet");
    store().setNodeSpacingValue(id, "padding", makeSpacingTokenRef("md"));

    const node = store().document!.nodes[id];
    // base 불변
    expect(node.padding).toEqual(baseBefore);
    // override.tablet.padding은 token-ref
    expect(node.overrides?.tablet?.padding).toBe(makeSpacingTokenRef("md"));
  });

  // 8. clearOverrideField → 필드 제거; 다른 필드 없으면 overrides.tablet 통째 삭제
  it("clearOverrideField removes the field and drops the whole bp override when empty", () => {
    const id = addAt(0, 0, 100, 40);
    store().setBreakpoint("tablet");
    store().updateNodeSpacing(id, { padding: { top: 8 } });

    // override.tablet.padding이 존재함을 확인
    expect(store().document!.nodes[id].overrides?.tablet?.padding).toBeDefined();

    store().setBreakpoint("desktop");
    store().clearOverrideField(id, "tablet", "padding");

    const node = store().document!.nodes[id];
    // padding 필드 제거됨
    expect(node.overrides?.tablet?.padding).toBeUndefined();
    // tablet override가 빈 객체가 됐으므로 통째 삭제
    expect(node.overrides?.tablet).toBeUndefined();
  });

  it("clearOverrideField keeps sibling fields in the same bp override", () => {
    const id = addAt(0, 0, 100, 40);
    store().setBreakpoint("tablet");
    store().updateNodeSpacing(id, { padding: { top: 8 } });
    store().updateNodeSpacing(id, { margin: { top: 4 } });

    // 두 필드 모두 존재 확인
    expect(store().document!.nodes[id].overrides?.tablet?.padding).toBeDefined();
    expect(store().document!.nodes[id].overrides?.tablet?.margin).toBeDefined();

    store().clearOverrideField(id, "tablet", "padding");

    const node = store().document!.nodes[id];
    // padding만 제거, margin 잔존, tablet 오버라이드 자체는 살아있음
    expect(node.overrides?.tablet?.padding).toBeUndefined();
    expect(node.overrides?.tablet?.margin).toBeDefined();
    expect(node.overrides?.tablet).toBeDefined();
  });

  it("clearOverrideField is a no-op on desktop", () => {
    const id = addAt(0, 0, 100, 40);
    store().setBreakpoint("tablet");
    store().updateNodeSpacing(id, { padding: { top: 8 } });
    const before = store().document!.nodes[id].overrides?.tablet?.padding;

    store().clearOverrideField(id, "desktop", "padding");

    // desktop은 no-op, tablet override 보존
    expect(store().document!.nodes[id].overrides?.tablet?.padding).toEqual(before);
  });

  // 9. duplicateNode로 tablet padding override 가진 노드 복제 → 깊은 복사 (독립)
  it("duplicateNode deep-clones tablet padding override (mutation isolation)", () => {
    const rootId = store().document!.rootId;
    const a = store().addNode(rootId, "Card")!;
    store().setBreakpoint("tablet");
    store().updateNodeSpacing(a, { padding: { top: 8, right: 8, bottom: 8, left: 8 } });
    store().setBreakpoint("desktop");

    const dup = store().duplicateNode(a)!;
    // 클론의 override 변경 → 원본 미오염
    store().setBreakpoint("tablet");
    store().updateNodeSpacing(dup, { padding: { top: 99 } });
    store().setBreakpoint("desktop");

    const origPad = store().document!.nodes[a].overrides?.tablet?.padding as { top: number };
    const dupPad = store().document!.nodes[dup].overrides?.tablet?.padding as { top: number };

    expect(origPad.top).toBe(8);       // 원본 불변
    expect(dupPad.top).toBe(99);       // 클론은 변경됨
    // 두 객체는 다른 참조
    expect(origPad).not.toBe(dupPad);
  });

  // 10. tablet padding override 후 undo → 원복
  it("undo restores state before tablet padding override", () => {
    const id = addAt(0, 0, 100, 40);
    store().setBreakpoint("tablet");
    store().updateNodeSpacing(id, { padding: { top: 8 } });

    // override 기록됨
    expect(store().document!.nodes[id].overrides?.tablet?.padding).toBeDefined();

    store().undo();

    // undo 후 tablet padding override 없음
    const node = store().document!.nodes[id];
    expect(node.overrides?.tablet?.padding).toBeUndefined();
  });
});

describe("B2: per-breakpoint background overrides (store)", () => {
  // setNodeBackground@tablet → overrides.tablet.background에 기록, node.background(base) 불변
  it("setNodeBackground at tablet writes overrides[tablet].background, leaves base unchanged", () => {
    const id = addAt(0, 0, 100, 40);
    // base background 먼저 설정 (desktop에서)
    store().setNodeBackground(id, "#ffffff");
    const baseBg = store().document!.nodes[id].background;

    store().setBreakpoint("tablet");
    store().setNodeBackground(id, "#0000ff");

    const node = store().document!.nodes[id];
    // base 불변
    expect(node.background).toBe(baseBg);
    // override.tablet.background 기록됨
    expect(node.overrides?.tablet?.background).toBe("#0000ff");
    // resolveBackground로 확인
    expect(resolveBackground(node, "desktop")).toBe("#ffffff");
    expect(resolveBackground(node, "tablet")).toBe("#0000ff");
    expect(resolveBackground(node, "mobile")).toBe("#0000ff"); // tablet 상속
  });

  // setNodeBackground@desktop → base에 기록, override 미생성 (회귀)
  it("setNodeBackground at desktop writes base only, creates no overrides (regression)", () => {
    const id = addAt(0, 0, 100, 40);
    store().setBreakpoint("desktop");
    store().setNodeBackground(id, "#123456");

    const node = store().document!.nodes[id];
    expect(node.background).toBe("#123456");
    expect(node.overrides?.tablet?.background).toBeUndefined();
    expect(node.overrides?.mobile?.background).toBeUndefined();
  });

  // clearOverrideField(id, "tablet", "background") → 필드 제거, 다른 필드 없으면 overrides.tablet 통째 삭제
  it("clearOverrideField removes background field and drops the whole bp override when empty", () => {
    const id = addAt(0, 0, 100, 40);
    store().setBreakpoint("tablet");
    store().setNodeBackground(id, "#0000ff");

    // override.tablet.background 존재 확인
    expect(store().document!.nodes[id].overrides?.tablet?.background).toBeDefined();

    store().setBreakpoint("desktop");
    store().clearOverrideField(id, "tablet", "background");

    const node = store().document!.nodes[id];
    // background 필드 제거됨
    expect(node.overrides?.tablet?.background).toBeUndefined();
    // tablet override가 빈 객체가 됐으므로 통째 삭제
    expect(node.overrides?.tablet).toBeUndefined();
  });

  // clearOverrideField: background만 제거하고 sibling 필드(padding 등)는 보존
  it("clearOverrideField keeps sibling fields in the same bp override", () => {
    const id = addAt(0, 0, 100, 40);
    store().setBreakpoint("tablet");
    store().setNodeBackground(id, "#0000ff");
    store().updateNodeSpacing(id, { padding: { top: 8, right: 8, bottom: 8, left: 8 } });

    // 두 필드 모두 존재 확인
    expect(store().document!.nodes[id].overrides?.tablet?.background).toBeDefined();
    expect(store().document!.nodes[id].overrides?.tablet?.padding).toBeDefined();

    store().clearOverrideField(id, "tablet", "background");

    const node = store().document!.nodes[id];
    // background만 제거, padding 잔존, tablet 오버라이드 자체는 살아있음
    expect(node.overrides?.tablet?.background).toBeUndefined();
    expect(node.overrides?.tablet?.padding).toBeDefined();
    expect(node.overrides?.tablet).toBeDefined();
  });

  // duplicateNode → tablet background override 복제 (독립)
  it("duplicateNode deep-clones tablet background override (mutation isolation)", () => {
    const rootId = store().document!.rootId;
    const a = store().addNode(rootId, "Card")!;
    store().setBreakpoint("tablet");
    store().setNodeBackground(a, "#aabbcc");
    store().setBreakpoint("desktop");

    const dup = store().duplicateNode(a)!;

    // 클론의 override 변경 → 원본 미오염
    store().setBreakpoint("tablet");
    store().setNodeBackground(dup, "#112233");
    store().setBreakpoint("desktop");

    const origBg = store().document!.nodes[a].overrides?.tablet?.background;
    const dupBg = store().document!.nodes[dup].overrides?.tablet?.background;

    expect(origBg).toBe("#aabbcc");  // 원본 불변
    expect(dupBg).toBe("#112233");   // 클론은 변경됨
  });

  // token ref를 tablet background override로 사용
  it("setNodeBackground at tablet stores a color-token-ref in the override, leaving base unchanged", () => {
    const id = addAt(0, 0, 100, 40);
    store().setColorToken("brand", "#3b82f6");
    const ref = makeColorTokenRef("brand");

    // Card의 defaultBackground는 "#ffffff" — 기록해 둔다
    const baseBefore = store().document!.nodes[id].background;

    store().setBreakpoint("tablet");
    store().setNodeBackground(id, ref);

    const node = store().document!.nodes[id];
    // override.tablet.background는 token-ref
    expect(node.overrides?.tablet?.background).toBe(ref);
    // base는 tablet 편집으로 변경되지 않아야 함
    expect(node.background).toBe(baseBefore);
  });
});

describe("setNodeLayout", () => {
  it("sets flex mode and options on a container", () => {
    const rootId = store().document!.rootId;
    store().setNodeLayout(rootId, {
      layout: "flex",
      flexDirection: "column",
      gap: 16,
      justifyContent: "center",
      alignItems: "stretch",
    });
    const node = store().document!.nodes[rootId];
    expect(node.layout).toBe("flex");
    expect(node.flexDirection).toBe("column");
    expect(node.gap).toBe(16);
    expect(node.justifyContent).toBe("center");
    expect(node.alignItems).toBe("stretch");
  });

  it("sets grid mode and keeps grid options on a container", () => {
    const rootId = store().document!.rootId;
    store().setNodeLayout(rootId, { layout: "grid", gridColumns: 3 });
    const node = store().document!.nodes[rootId];
    expect(node.layout).toBe("grid");
    expect(node.gridColumns).toBe(3);
  });

  it("drops the layout field when switched back to absolute (canonical = absent)", () => {
    const rootId = store().document!.rootId;
    store().setNodeLayout(rootId, { layout: "flex", gap: 8 });
    store().setNodeLayout(rootId, { layout: "absolute" });
    const node = store().document!.nodes[rootId];
    expect(node.layout).toBeUndefined();
    // Flex options are kept so toggling back restores the prior setup.
    expect(node.gap).toBe(8);
  });

  it("drops grid layout when switched back to absolute but keeps grid options", () => {
    const rootId = store().document!.rootId;
    store().setNodeLayout(rootId, { layout: "grid", gridColumns: 3 });
    store().setNodeLayout(rootId, { layout: "absolute" });
    const node = store().document!.nodes[rootId];
    expect(node.layout).toBeUndefined();
    expect(node.gridColumns).toBe(3);
  });

  it("still switches flex back to absolute unchanged", () => {
    const rootId = store().document!.rootId;
    store().setNodeLayout(rootId, { layout: "flex", flexDirection: "column" });
    store().setNodeLayout(rootId, { layout: "absolute" });
    const node = store().document!.nodes[rootId];
    expect(node.layout).toBeUndefined();
    expect(node.flexDirection).toBe("column");
  });

  it("is recorded as an undoable step", () => {
    const rootId = store().document!.rootId;
    store().setNodeLayout(rootId, { layout: "flex" });
    expect(store().document!.nodes[rootId].layout).toBe("flex");
    store().undo();
    expect(store().document!.nodes[rootId].layout).toBeUndefined();
  });

  it("writes gap edits at tablet to overrides without changing base", () => {
    const rootId = store().document!.rootId;
    store().setNodeLayout(rootId, { layout: "flex", gap: 4 });
    store().setBreakpoint("tablet");
    store().setNodeLayout(rootId, { gap: 12 });
    const node = store().document!.nodes[rootId];
    expect(node.gap).toBe(4);
    expect(node.overrides?.tablet?.gap).toBe(12);
  });

  it("writes flexDirection edits at mobile to overrides", () => {
    const rootId = store().document!.rootId;
    store().setNodeLayout(rootId, { layout: "flex", flexDirection: "row" });
    store().setBreakpoint("mobile");
    store().setNodeLayout(rootId, { flexDirection: "column" });
    const node = store().document!.nodes[rootId];
    expect(node.flexDirection).toBe("row");
    expect(node.overrides?.mobile?.flexDirection).toBe("column");
  });

  it("writes gridColumns edits at tablet to overrides", () => {
    const rootId = store().document!.rootId;
    store().setNodeLayout(rootId, { layout: "grid", gridColumns: 3 });
    store().setBreakpoint("tablet");
    store().setNodeLayout(rootId, { gridColumns: 2 });
    const node = store().document!.nodes[rootId];
    expect(node.gridColumns).toBe(3);
    expect(node.overrides?.tablet?.gridColumns).toBe(2);
  });

  it("desktop parameter edits still write base", () => {
    const rootId = store().document!.rootId;
    store().setNodeLayout(rootId, { layout: "flex", gap: 10 });
    const node = store().document!.nodes[rootId];
    expect(node.gap).toBe(10);
    expect(node.overrides).toBeUndefined();
  });

  it("ignores a mode change at a breakpoint on an absolute base (C-3: no wrapper to swap)", () => {
    const rootId = store().document!.rootId; // root base is absolute (no layout field)
    store().setBreakpoint("tablet");
    store().setNodeLayout(rootId, { layout: "grid" });
    const node = store().document!.nodes[rootId];
    // absolute has no wrapper div, so a per-bp mode swap is impossible → fully ignored.
    expect(node.layout).toBeUndefined();
    expect(node.overrides?.tablet).toBeUndefined();
  });

  // --- C-3: flex↔grid layout MODE swap per breakpoint ---
  it("swaps a flex base to grid at tablet via an override, base mode unchanged", () => {
    const rootId = store().document!.rootId;
    store().setNodeLayout(rootId, { layout: "flex", gap: 4 });
    store().setBreakpoint("tablet");
    store().setNodeLayout(rootId, { layout: "grid" });
    const node = store().document!.nodes[rootId];
    expect(node.layout).toBe("flex"); // base mode stays flex
    expect(node.overrides?.tablet?.layout).toBe("grid"); // swap recorded at tablet
  });

  it("routes a desktop mode change to base, not an override (regression)", () => {
    const rootId = store().document!.rootId;
    store().setNodeLayout(rootId, { layout: "flex" });
    store().setNodeLayout(rootId, { layout: "grid" });
    const node = store().document!.nodes[rootId];
    expect(node.layout).toBe("grid");
    expect(node.overrides).toBeUndefined();
  });

  it("clearOverrideField removes a layout swap and drops the empty bp override", () => {
    const rootId = store().document!.rootId;
    store().setNodeLayout(rootId, { layout: "flex" });
    store().setBreakpoint("tablet");
    store().setNodeLayout(rootId, { layout: "grid" });
    store().clearOverrideField(rootId, "tablet", "layout");
    const node = store().document!.nodes[rootId];
    expect(node.layout).toBe("flex");
    expect(node.overrides?.tablet).toBeUndefined();
  });

  it("resetOverride removes a layout swap along with the rest of the bp override", () => {
    const rootId = store().document!.rootId;
    store().setNodeLayout(rootId, { layout: "flex" });
    store().setBreakpoint("tablet");
    store().setNodeLayout(rootId, { layout: "grid", gridColumns: 2 });
    store().resetOverride(rootId, "tablet");
    const node = store().document!.nodes[rootId];
    expect(node.overrides?.tablet).toBeUndefined();
    expect(node.layout).toBe("flex");
  });

  it("duplicateNode copies a layout-mode swap override", () => {
    const id = addAt(0, 0, 100, 100);
    store().setNodeLayout(id, { layout: "flex" });
    store().setBreakpoint("tablet");
    store().setNodeLayout(id, { layout: "grid" });
    const dup = store().duplicateNode(id)!;
    expect(store().document!.nodes[dup].overrides?.tablet?.layout).toBe("grid");
  });

  it("clearOverrideField removes a layout override and drops the empty bp override", () => {
    const rootId = store().document!.rootId;
    store().setNodeLayout(rootId, { layout: "flex", gap: 4 });
    store().setBreakpoint("tablet");
    store().setNodeLayout(rootId, { gap: 12 });
    store().clearOverrideField(rootId, "tablet", "gap");
    expect(store().document!.nodes[rootId].overrides?.tablet).toBeUndefined();
  });

  it("duplicateNode copies layout overrides", () => {
    const id = addAt(0, 0, 100, 100);
    store().setNodeLayout(id, { layout: "flex", gap: 4 });
    store().setBreakpoint("tablet");
    store().setNodeLayout(id, { gap: 12, flexDirection: "column" });
    const dup = store().duplicateNode(id)!;
    expect(store().document!.nodes[dup].overrides?.tablet?.gap).toBe(12);
    expect(store().document!.nodes[dup].overrides?.tablet?.flexDirection).toBe("column");
  });
});
