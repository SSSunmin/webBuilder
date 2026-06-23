import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "../store/editorStore";
import { generateContext } from "./legend";
import { generateMarkdown } from "./index";

beforeEach(() => {
  useEditorStore.getState().newDocument("reset");
});

/** Fresh document with one node of `type` inside the root layout. */
function docWith(type: string) {
  const store = useEditorStore.getState();
  const doc = store.newDocument("My Page");
  useEditorStore.getState().addNode(doc.rootId, type);
  return useEditorStore.getState().document!;
}

describe("generateContext", () => {
  it("includes a provider-neutral reading guide with the page name", () => {
    const ctx = generateContext(docWith("Button"));
    expect(ctx).toContain("**My Page**");
    expect(ctx).toContain("> **읽는 법**");
    // Provider-neutral: no specific assistant is named.
    expect(ctx).not.toMatch(/claude/i);
  });

  it("lists a legend section for each used component, by label and type", () => {
    const ctx = generateContext(docWith("Button"));
    expect(ctx).toContain("## 사용 컴포넌트");
    expect(ctx).toContain("### Layout (`Layout`)"); // root container
    expect(ctx).toContain("### Button (`Button`)");
  });

  it("documents a component's props (key, control, default) in a table", () => {
    const ctx = generateContext(docWith("Button"));
    expect(ctx).toContain("| `text` |");
    expect(ctx).toContain("| `variant` |");
    // Select options are rendered with escaped pipes.
    expect(ctx).toContain("선택(primary \\| ghost \\| soft)");
    expect(ctx).toContain('"무료로 체험하기"'); // default value
  });

  it("shows a representative code shape per component", () => {
    const ctx = generateContext(docWith("Button"));
    expect(ctx).toContain('코드 형태: `<Button variant="primary">무료로 체험하기</Button>`');
    // Containers collapse to a single line with a children placeholder.
    expect(ctx).toContain("코드 형태: `<Layout> … </Layout>`");
  });

  it("describes containers vs leaves", () => {
    const ctx = generateContext(docWith("Button"));
    expect(ctx).toContain("컨테이너 — 자식 요소를 가질 수 있습니다.");
    expect(ctx).toContain("리프 — 자식이 없습니다.");
  });

  it("lists only the types the page actually uses", () => {
    const ctx = generateContext(docWith("Button"));
    expect(ctx).not.toContain("### Input (`Input`)");
    expect(ctx).not.toContain("### Chart (`Chart`)");
  });

  it("lists each type once even when used multiple times", () => {
    const store = useEditorStore.getState();
    const doc = store.newDocument("Repeat");
    useEditorStore.getState().addNode(doc.rootId, "Button");
    useEditorStore.getState().addNode(doc.rootId, "Button");
    const ctx = generateContext(useEditorStore.getState().document!);
    expect(ctx.match(/### Button \(`Button`\)/g)?.length).toBe(1);
  });
});

describe("generateMarkdown portable context", () => {
  it("prefixes the context before the body in every mode", () => {
    const doc = docWith("Button");
    for (const mode of ["spec", "code", "both"] as const) {
      const md = generateMarkdown(doc, mode);
      expect(md.startsWith("> 이 문서는")).toBe(true);
      // The portable context (legend) must precede the body's first divider.
      const ctxPos = md.indexOf("## 사용 컴포넌트");
      const dividerPos = md.indexOf("\n---\n");
      expect(ctxPos).toBeGreaterThan(-1);
      expect(ctxPos).toBeLessThan(dividerPos);
    }
  });

  it("spec mode still contains the page tree, code mode the code block", () => {
    const doc = docWith("Button");
    expect(generateMarkdown(doc, "spec")).toContain("# Page: My Page");
    expect(generateMarkdown(doc, "code")).toContain("```tsx");
    const both = generateMarkdown(doc, "both");
    expect(both).toContain("# Page: My Page");
    expect(both).toContain("```tsx");
  });
});
