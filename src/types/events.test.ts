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

  it("prevents default for submit (so code export can pass the event arg)", () => {
    expect(actionBody(ev({ action: "submit" }))).toContain("e.preventDefault()");
  });

  it("scrolls to an anchor selector", () => {
    expect(actionBody(ev({ action: "scrollTo", target: "#features" }))).toContain(
      'document.querySelector("#features")',
    );
  });

  it("emits a TODO comment carrying the description for custom actions", () => {
    expect(actionBody(ev({ action: "custom", target: "open modal" }))).toBe("/* TODO: open modal */");
  });

  it("neutralizes */ in comment targets so user text can't close the JS comment", () => {
    const out = actionBody(ev({ action: "custom", target: "*/ alert(1); /*" }));
    // The raw closing sequence must not survive; the comment stays well-formed.
    expect(out).not.toContain("*/ alert");
    expect(out.startsWith("/* TODO:")).toBe(true);
    expect(out.endsWith("*/")).toBe(true);
    // And the same for the submit branch's trailing comment.
    const sub = actionBody(ev({ action: "submit", target: "*/x" }));
    expect(sub).not.toContain("*/x");
  });

  it("falls back to a safe default when the target is empty", () => {
    expect(actionBody(ev({ action: "navigate", target: "" }))).toContain('"/"');
    expect(actionBody(ev({ action: "custom" }))).toBe("/* TODO: action */");
  });
});
