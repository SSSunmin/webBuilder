import { describe, expect, it } from "vitest";
import { actionBody, describeEvent } from "./events";
import type { EventBinding } from "./events";

function ev(partial: Partial<EventBinding>): EventBinding {
  return { id: "e1", trigger: "click", action: "custom", ...partial };
}

describe("describeEvent", () => {
  it("renders trigger → action with a target", () => {
    expect(describeEvent(ev({ trigger: "click", action: "navigate", target: "/pricing" }))).toBe(
      "클릭 → 페이지 이동: /pricing",
    );
  });

  it("omits the target part when absent", () => {
    expect(describeEvent(ev({ trigger: "submit", action: "submit" }))).toBe("제출 → 폼 제출");
  });
});

describe("actionBody", () => {
  it("navigates via window.location with a quoted target", () => {
    expect(actionBody(ev({ action: "navigate", target: "/home" }))).toContain(
      'window.location.href = "/home";',
    );
  });

  it("opens a url in a new tab", () => {
    expect(actionBody(ev({ action: "openUrl", target: "https://x.com" }))).toContain(
      'window.open("https://x.com", "_blank");',
    );
  });

  it("submit prevents default and fetches the endpoint with the form's data", () => {
    const out = actionBody(ev({ action: "submit", target: "/api/contact" }));
    expect(out).toContain("e.preventDefault()");
    expect(out).toContain('fetch("/api/contact", { method: "POST"');
    expect(out).toContain('new FormData(e.currentTarget.querySelector("form") ?? undefined)');
  });

  it("submit falls back to /api/submit when no endpoint is given", () => {
    expect(actionBody(ev({ action: "submit" }))).toContain('fetch("/api/submit"');
  });

  it("scrolls to an anchor selector", () => {
    expect(actionBody(ev({ action: "scrollTo", target: "#features" }))).toContain(
      'document.querySelector("#features")',
    );
  });

  it("emits a no-op comment carrying the description for custom actions", () => {
    expect(actionBody(ev({ action: "custom", target: "open modal" }))).toBe(
      "/* 직접 구현: open modal */",
    );
  });

  it("neutralizes */ in custom targets so user text can't close the JS comment", () => {
    const out = actionBody(ev({ action: "custom", target: "*/ alert(1); /*" }));
    // The raw closing sequence must not survive; the comment stays well-formed.
    expect(out).not.toContain("*/ alert");
    expect(out.startsWith("/* 직접 구현:")).toBe(true);
    expect(out.endsWith("*/")).toBe(true);
  });

  it("escapes quotes in a submit endpoint so it can't break out of the string", () => {
    // JSON.stringify keeps the endpoint a single well-formed string literal.
    const out = actionBody(ev({ action: "submit", target: 'a"b' }));
    expect(out).toContain('fetch("a\\"b"');
  });

  it("falls back to a safe default when the target is empty", () => {
    expect(actionBody(ev({ action: "navigate", target: "" }))).toContain('"/"');
    expect(actionBody(ev({ action: "custom" }))).toBe("/* 직접 구현: 사용자 정의 동작 */");
  });
});
