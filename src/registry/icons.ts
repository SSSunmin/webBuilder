/**
 * Predefined SVG icon set for components (e.g. a Button's leading icon).
 *
 * Each `svg` is the *inner* markup of a 24×24 stroke icon — it inherits color
 * via `stroke="currentColor"` on the wrapping <svg>, so an icon takes on the
 * button's text color. The markup is trusted (authored here), which is why
 * callers may render it with dangerouslySetInnerHTML.
 *
 * Shape is a registry on purpose: today the set is baked in, but once a backend
 * exists, user-uploaded icons can be merged into `iconDefs` (with sanitization)
 * without changing any consumer. Icon `name`s are stable identifiers and are
 * what gets emitted to exported code.
 */
export interface IconDef {
  /** Stable id, emitted to code export. */
  name: string;
  /** Human label for the picker. */
  label: string;
  /** Inner SVG markup of a 24×24 viewBox icon. */
  svg: string;
}

export const iconDefs: IconDef[] = [
  { name: "arrow-right", label: "오른쪽 화살표", svg: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>' },
  { name: "arrow-left", label: "왼쪽 화살표", svg: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>' },
  { name: "chevron-right", label: "꺾쇠", svg: '<path d="m9 18 6-6-6-6"/>' },
  { name: "check", label: "체크", svg: '<path d="M20 6 9 17l-5-5"/>' },
  { name: "plus", label: "더하기", svg: '<path d="M12 5v14"/><path d="M5 12h14"/>' },
  { name: "x", label: "닫기", svg: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>' },
  { name: "search", label: "검색", svg: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>' },
  { name: "download", label: "다운로드", svg: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>' },
  { name: "upload", label: "업로드", svg: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>' },
  { name: "star", label: "별", svg: '<path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.8 6.2 20.9l1.1-6.5L2.6 9.3l6.5-.9z"/>' },
  { name: "heart", label: "하트", svg: '<path d="M19 14c1.5-1.5 3-3.4 3-5.5A4.5 4.5 0 0 0 12 6 4.5 4.5 0 0 0 2 8.5C2 10.6 3.5 12.5 5 14l7 7z"/>' },
  { name: "user", label: "사용자", svg: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>' },
  { name: "mail", label: "메일", svg: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>' },
  { name: "settings", label: "설정", svg: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>' },
  { name: "trash", label: "삭제", svg: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m6 6 1 14h10l1-14"/>' },
  { name: "external-link", label: "새 창", svg: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>' },
  { name: "calendar", label: "달력", svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' },
  { name: "play", label: "재생", svg: '<path d="M6 4l14 8-14 8z"/>' },
];

/** Look up an icon by name. Returns undefined for "" (no icon) or unknown ids. */
export function getIcon(name: string): IconDef | undefined {
  return name ? iconDefs.find((i) => i.name === name) : undefined;
}
