import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "../store/editorStore";
import { generateSpec } from "./spec";
import { generateCode } from "./code";

/** Build a fresh document with one heading inside the root layout. */
function buildDoc() {
  const store = useEditorStore.getState();
  const doc = store.newDocument("My Page");
  const childId = useEditorStore.getState().addNode(doc.rootId, "Heading");
  return { document: useEditorStore.getState().document!, childId: childId! };
}

beforeEach(() => {
  useEditorStore.getState().newDocument("reset");
});

describe("generateSpec", () => {
  it("includes the page name as a header", () => {
    const { document } = buildDoc();
    const spec = generateSpec(document);
    expect(spec).toContain("# Page: My Page");
  });

  it("marks containers and lists child nodes", () => {
    const { document } = buildDoc();
    const spec = generateSpec(document);
    expect(spec).toContain("(container)"); // root Layout
    expect(spec).toContain("Heading");
  });

  it("reports a node's background color when present", () => {
    const { childId } = buildDoc();
    useEditorStore.getState().setNodeBackground(childId, "#ff0000");
    const spec = generateSpec(useEditorStore.getState().document!);
    expect(spec).toContain("bg #ff0000");
  });
});

describe("generateCode", () => {
  it("emits a Page component wrapped in positioned divs", () => {
    const { document } = buildDoc();
    const code = generateCode(document);
    expect(code).toContain("export function Page()");
    expect(code).toContain('position: "relative"'); // root frame
    expect(code).toContain('position: "absolute"'); // child frame
  });

  it("inlines the background color into the style literal", () => {
    const { childId } = buildDoc();
    useEditorStore.getState().setNodeBackground(childId, "#123456");
    const code = generateCode(useEditorStore.getState().document!);
    expect(code).toContain('background: "#123456"');
  });

  it("emits Text props as attributes, consistent with other components", () => {
    const store = useEditorStore.getState();
    const doc = store.newDocument("Text Page");
    const textId = useEditorStore.getState().addNode(doc.rootId, "Text")!;
    useEditorStore.getState().updateNodeProps(textId, {
      size: "lg",
      weight: "bold",
      content: "안녕",
    });
    const code = generateCode(useEditorStore.getState().document!);
    expect(code).toContain('size="lg"');
    expect(code).toContain('weight="bold"');
    // No longer leaks the internal enum values as a className.
    expect(code).not.toContain('className="lg bold"');
    // Child text content is preserved.
    expect(code).toContain(">안녕</Text>");
  });

  it("inlines a Text color as an inline style", () => {
    const store = useEditorStore.getState();
    const doc = store.newDocument("Text Color");
    const textId = useEditorStore.getState().addNode(doc.rootId, "Text")!;
    useEditorStore.getState().updateNodeProps(textId, { color: "#ff0000" });
    const code = generateCode(useEditorStore.getState().document!);
    expect(code).toContain('style={{ color: "#ff0000" }}');
  });
});

describe("cyclic children defense", () => {
  /** Build a document whose two nodes reference each other as children. */
  function cyclicDoc() {
    const store = useEditorStore.getState();
    const doc = store.newDocument("Cyclic");
    const a = useEditorStore.getState().addNode(doc.rootId, "Card")!;
    const b = useEditorStore.getState().addNode(a, "Card")!;
    const d = useEditorStore.getState().document!;
    // Corrupt the tree: b points back to a (a → b → a → ...).
    return {
      ...d,
      nodes: {
        ...d.nodes,
        [b]: { ...d.nodes[b], children: [a] },
      },
    };
  }

  it("generateCode does not throw on cyclic children", () => {
    expect(() => generateCode(cyclicDoc())).not.toThrow();
  });

  it("generateSpec does not throw on cyclic children", () => {
    expect(() => generateSpec(cyclicDoc())).not.toThrow();
  });
});
