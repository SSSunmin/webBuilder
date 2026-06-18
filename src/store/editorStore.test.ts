import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "./editorStore";

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
});

describe("distributeNodes", () => {
  it("spreads three nodes to equal horizontal gaps", () => {
    const a = addAt(0, 0, 100, 40);
    const b = addAt(120, 0, 100, 40);
    const c = addAt(500, 0, 100, 40);
    store().distributeNodes([a, b, c], "h");
    const fx = (id: string) => store().document!.nodes[id].frame.x;
    const gap1 = fx(b) - (fx(a) + 100);
    const gap2 = fx(c) - (fx(b) + 100);
    expect(gap1).toBe(gap2);
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
});
