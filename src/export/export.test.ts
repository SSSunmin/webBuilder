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

  it("reports borderRadius/padding/margin only when non-zero, with T/R/B/L for asymmetric", () => {
    const { childId } = buildDoc();
    const store = useEditorStore.getState();
    store.setNodeRadius(childId, 8);
    store.updateNodeSpacing(childId, {
      padding: { top: 8, right: 8, bottom: 8, left: 8 },
      margin: { top: 8, right: 16, bottom: 8, left: 16 },
    });
    const spec = generateSpec(useEditorStore.getState().document!);
    expect(spec).toContain("radius 8");
    expect(spec).toContain("pad 8");
    expect(spec).not.toContain("pad 8/");
    expect(spec).toContain("margin 8/16/8/16");
  });

  it("omits radius/pad/margin notations when all values are zero", () => {
    const { document } = buildDoc();
    const spec = generateSpec(document);
    expect(spec).not.toContain("radius");
    expect(spec).not.toContain("pad");
    expect(spec).not.toContain("margin");
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

  it("emits uniform padding as a number and asymmetric margin as a shorthand string", () => {
    const { childId } = buildDoc();
    useEditorStore.getState().updateNodeSpacing(childId, {
      padding: { top: 8, right: 8, bottom: 8, left: 8 },
      margin: { top: 8, right: 16, bottom: 24, left: 32 },
    });
    const code = generateCode(useEditorStore.getState().document!);
    expect(code).toContain("padding: 8");
    expect(code).toContain('margin: "8px 16px 24px 32px"');
  });

  it("keeps the root centering margin even when the root has a user margin", () => {
    const { document } = buildDoc();
    const rootId = document.rootId;
    useEditorStore.getState().updateNodeSpacing(rootId, {
      margin: { top: 12, right: 12, bottom: 12, left: 12 },
    });
    const code = generateCode(useEditorStore.getState().document!);
    expect(code).toContain('margin: "0 auto"');
    // The user's root margin must not leak into the generated code.
    expect(code).not.toContain("margin: 12");
  });

  it("omits padding and margin when all sides are zero", () => {
    const { childId } = buildDoc();
    useEditorStore.getState().updateNodeSpacing(childId, {
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    const code = generateCode(useEditorStore.getState().document!);
    expect(code).not.toContain("padding:");
    expect(code).not.toContain("margin: 0");
    expect(code).not.toContain('margin: "0px');
  });
});

describe("import header", () => {
  it("emits a sorted, deduped import for PascalCase components only", () => {
    const store = useEditorStore.getState();
    const doc = store.newDocument("Imports");
    useEditorStore.getState().addNode(doc.rootId, "Navbar");
    useEditorStore.getState().addNode(doc.rootId, "Button");
    useEditorStore.getState().addNode(doc.rootId, "Link"); // renders as <a>, lowercase
    const code = generateCode(useEditorStore.getState().document!);
    // Components are sorted and deduped; the root Layout is included too.
    expect(code).toContain('import { Button, Layout, Navbar } from "./components";');
    // The import header is the very first line.
    expect(code.startsWith("import {")).toBe(true);
    // Lowercase/HTML tags (<a>, <div>) are not imported.
    expect(code).not.toMatch(/import \{[^}]*\b(a|div)\b[^}]*\}/);
  });

  it("imports the root container component and excludes lowercase HTML tags", () => {
    const store = useEditorStore.getState();
    const doc = store.newDocument("Containers");
    useEditorStore.getState().addNode(doc.rootId, "Link"); // -> <a>
    const code = generateCode(useEditorStore.getState().document!);
    // The root Layout container is a PascalCase component, so it is imported.
    expect(code).toContain('import { Layout } from "./components";');
    // The lowercase <a> from Link is not added to the import list.
    expect(code).not.toMatch(/import \{[^}]*\ba\b[^}]*\}/);
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
