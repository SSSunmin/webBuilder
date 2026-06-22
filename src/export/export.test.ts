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

  it("emits a resolved tablet line for a node with a tablet frame override", () => {
    const { document, childId } = buildDoc();
    const doc = {
      ...document,
      nodes: {
        ...document.nodes,
        [childId]: {
          ...document.nodes[childId],
          overrides: { tablet: { frame: { x: 10, w: 200 } } },
        },
      },
    };
    const spec = generateSpec(doc);
    expect(spec).toMatch(/태블릿: @\(10,\d+\) 200×\d+/);
  });

  it("emits a hidden line for a node hidden at mobile", () => {
    const { document, childId } = buildDoc();
    const doc = {
      ...document,
      nodes: {
        ...document.nodes,
        [childId]: {
          ...document.nodes[childId],
          overrides: { mobile: { hidden: true } },
        },
      },
    };
    const spec = generateSpec(doc);
    expect(spec).toContain("모바일: 숨김");
  });

  it("adds no breakpoint lines for a node without overrides (no regression)", () => {
    const { document } = buildDoc();
    const spec = generateSpec(document);
    expect(spec).not.toContain("태블릿:");
    expect(spec).not.toContain("모바일:");
  });

  it("emits tablet then mobile lines, in order, when both override", () => {
    const { document, childId } = buildDoc();
    const doc = {
      ...document,
      nodes: {
        ...document.nodes,
        [childId]: {
          ...document.nodes[childId],
          overrides: {
            tablet: { frame: { x: 10, w: 200 } },
            mobile: { hidden: true },
          },
        },
      },
    };
    const spec = generateSpec(doc);
    expect(spec).toContain("태블릿:");
    expect(spec).toContain("모바일: 숨김");
    expect(spec.indexOf("태블릿:")).toBeLessThan(spec.indexOf("모바일: 숨김"));
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

describe("event bindings", () => {
  /** Add a Button to root with one event binding and return its id. */
  function buildWithEvent(action: string, target?: string) {
    const store = useEditorStore.getState();
    const doc = store.newDocument("Events");
    const id = useEditorStore.getState().addNode(doc.rootId, "Button")!;
    useEditorStore.getState().addNodeEvent(id);
    const evId = useEditorStore.getState().document!.nodes[id].events![0].id;
    useEditorStore.getState().updateNodeEvent(id, evId, {
      action: action as never,
      ...(target !== undefined ? { target } : {}),
    });
    return id;
  }

  it("spec lists an event line under the node", () => {
    buildWithEvent("navigate", "/pricing");
    const spec = generateSpec(useEditorStore.getState().document!);
    expect(spec).toContain("이벤트: 클릭 → 페이지 이동: /pricing");
  });

  it("code emits an onClick handler on the wrapper div", () => {
    buildWithEvent("navigate", "/pricing");
    const code = generateCode(useEditorStore.getState().document!);
    expect(code).toContain('onClick={() => { window.location.href = "/pricing"; }}');
  });

  it("passes the event arg only when a body needs it (submit → preventDefault)", () => {
    const store = useEditorStore.getState();
    const doc = store.newDocument("Submit");
    const id = useEditorStore.getState().addNode(doc.rootId, "Button")!;
    useEditorStore.getState().addNodeEvent(id);
    const evId = useEditorStore.getState().document!.nodes[id].events![0].id;
    useEditorStore.getState().updateNodeEvent(id, evId, { trigger: "submit", action: "submit" });
    const code = generateCode(useEditorStore.getState().document!);
    expect(code).toContain("onSubmit={(e) => { e.preventDefault();");
  });

  it("merges multiple bindings on the same trigger into one handler", () => {
    const store = useEditorStore.getState();
    const doc = store.newDocument("Multi");
    const id = useEditorStore.getState().addNode(doc.rootId, "Button")!;
    const add = () => {
      useEditorStore.getState().addNodeEvent(id);
      return useEditorStore.getState().document!.nodes[id].events!.at(-1)!.id;
    };
    useEditorStore.getState().updateNodeEvent(id, add(), { action: "openUrl", target: "https://a" });
    useEditorStore.getState().updateNodeEvent(id, add(), { action: "scrollTo", target: "#b" });
    const code = generateCode(useEditorStore.getState().document!);
    // One onClick handler containing both statements.
    expect((code.match(/onClick=/g) ?? []).length).toBe(1);
    expect(code).toContain('window.open("https://a"');
    expect(code).toContain('document.querySelector("#b")');
  });

  it("adds no handler attributes when a node has no events (no regression)", () => {
    const store = useEditorStore.getState();
    const doc = store.newDocument("None");
    useEditorStore.getState().addNode(doc.rootId, "Button");
    const code = generateCode(useEditorStore.getState().document!);
    expect(code).not.toContain("onClick=");
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

describe("Button icon & hover export", () => {
  function buttonWith(props: Record<string, unknown>) {
    const store = useEditorStore.getState();
    const doc = store.newDocument("Btn");
    const id = useEditorStore.getState().addNode(doc.rootId, "Button")!;
    useEditorStore.getState().updateNodeProps(id, props);
    return generateCode(useEditorStore.getState().document!);
  }

  it("emits icon and iconSize props when an icon is set", () => {
    const code = buttonWith({ icon: "search", iconSize: 20 });
    expect(code).toContain('icon="search"');
    expect(code).toContain("iconSize={20}");
  });

  it("omits icon props when no icon is selected", () => {
    const code = buttonWith({ icon: "", iconSize: 16 });
    expect(code).not.toContain("icon=");
    expect(code).not.toContain("iconSize=");
  });

  it("emits hover color props when set", () => {
    const code = buttonWith({ hoverBg: "#ff0000", hoverText: "#ffffff" });
    expect(code).toContain('hoverBg="#ff0000"');
    expect(code).toContain('hoverText="#ffffff"');
  });
});

describe("boxShadow export", () => {
  it("emits a CSS box-shadow built from the node's pixel shadow spec", () => {
    const store = useEditorStore.getState();
    const doc = store.newDocument("Shadow");
    const id = useEditorStore.getState().addNode(doc.rootId, "Card")!;
    useEditorStore.getState().updateNodeShadow(id, {}); // default: 0,4,12,0 #000 0.15
    const code = generateCode(useEditorStore.getState().document!);
    expect(code).toContain("boxShadow:");
    expect(code).toContain("0px 4px 12px 0px rgba(0, 0, 0, 0.15)");
  });

  it("omits boxShadow when none is set", () => {
    const store = useEditorStore.getState();
    const doc = store.newDocument("NoShadow");
    useEditorStore.getState().addNode(doc.rootId, "Card");
    const code = generateCode(useEditorStore.getState().document!);
    expect(code).not.toContain("boxShadow:");
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
