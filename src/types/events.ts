/**
 * Event/action binding model. A node can carry a list of {@link EventBinding}s
 * that connect a user interaction (trigger) to an intended action. These drive
 * the inspector's "이벤트 · 액션" section, the MD spec description, and the
 * event-handler attributes emitted by code export.
 */

/** A user interaction that can fire an action. */
export type EventTrigger = "click" | "submit" | "change" | "hover";

/** What happens when the trigger fires. */
export type ActionType = "navigate" | "openUrl" | "submit" | "scrollTo" | "custom";

export interface EventBinding {
  id: string;
  trigger: EventTrigger;
  action: ActionType;
  /** url / route / anchor id / free-form note, depending on `action`. */
  target?: string;
}

/** Triggers in inspector display order, with Korean labels. */
export const EVENT_TRIGGERS: { id: EventTrigger; label: string }[] = [
  { id: "click", label: "클릭" },
  { id: "submit", label: "제출" },
  { id: "change", label: "값 변경" },
  { id: "hover", label: "마우스 오버" },
];

/** Actions in inspector display order; `targetLabel` is the target field hint. */
export const ACTION_TYPES: { id: ActionType; label: string; targetLabel: string }[] = [
  { id: "navigate", label: "페이지 이동", targetLabel: "경로 (예: /pricing)" },
  { id: "openUrl", label: "링크 열기", targetLabel: "URL (예: https://…)" },
  { id: "submit", label: "폼 제출", targetLabel: "엔드포인트 (선택)" },
  { id: "scrollTo", label: "스크롤 이동", targetLabel: "앵커 id (예: #features)" },
  { id: "custom", label: "직접 설명", targetLabel: "동작 설명" },
];

/** React event-handler prop name for a trigger (used by code export). */
export const TRIGGER_PROP: Record<EventTrigger, string> = {
  click: "onClick",
  submit: "onSubmit",
  change: "onChange",
  hover: "onMouseEnter",
};

export function triggerLabel(id: EventTrigger): string {
  return EVENT_TRIGGERS.find((t) => t.id === id)?.label ?? id;
}

export function actionLabel(id: ActionType): string {
  return ACTION_TYPES.find((a) => a.id === id)?.label ?? id;
}

/** One-line human description of a binding, for the MD spec. */
export function describeEvent(ev: EventBinding): string {
  const head = `${triggerLabel(ev.trigger)} → ${actionLabel(ev.action)}`;
  return ev.target ? `${head}: ${ev.target}` : head;
}

/** Actions whose generated handler needs the event arg (e.g. preventDefault). */
const ACTIONS_NEEDING_EVENT: ReadonlySet<ActionType> = new Set<ActionType>(["submit"]);

export function actionNeedsEvent(action: ActionType): boolean {
  return ACTIONS_NEEDING_EVENT.has(action);
}

/** Break the comment-closing sequence so user text embedded in a JS comment
 * can't terminate it early (and inject code into the exported source). */
export function safeComment(s: string): string {
  return s.replace(/\*\//g, "* /");
}

/** Handler-body statement(s) for an action, for code export. */
export function actionBody(ev: EventBinding): string {
  // String-literal targets go through JSON.stringify (safe inside a JS string);
  // comment targets go through safeComment (JSON.stringify does NOT escape */).
  const t = ev.target ?? "";
  switch (ev.action) {
    case "navigate":
      return `window.location.href = ${JSON.stringify(t || "/")};`;
    case "openUrl":
      return `window.open(${JSON.stringify(t || "#")}, "_blank");`;
    case "submit":
      // Handler sits on the wrapper div, so the <form> (if any) is a descendant.
      // querySelector returns null when there's no form; `?? undefined` turns that
      // into an omitted constructor arg (per WebIDL: an optional arg passed
      // `undefined` is treated as not provided → empty FormData, no throw). Passing
      // `null` would throw, so the `?? undefined` matters. Single statement, so it
      // stays safe when merged with sibling bindings on the same trigger.
      return `e.preventDefault(); fetch(${JSON.stringify(
        t || "/api/submit",
      )}, { method: "POST", body: new FormData(e.currentTarget.querySelector("form") ?? undefined) });`;
    case "scrollTo":
      return `document.querySelector(${JSON.stringify(
        t || "#top",
      )})?.scrollIntoView({ behavior: "smooth" });`;
    case "custom":
      // Free-form intent can't be synthesized into working logic; emit a no-op
      // handler carrying the description for the implementer to fill in.
      return `/* 직접 구현: ${safeComment(t) || "사용자 정의 동작"} */`;
    default:
      // Unreachable for valid data; guards documents parsed from storage/API.
      return `/* TODO: unknown action */`;
  }
}
