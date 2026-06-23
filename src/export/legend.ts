import { getComponentDef } from "../registry";
import type { ComponentDef, PropSchema } from "../types/component";
import type { PageDocument, PageNode } from "../types/page";

/**
 * Component types used in the document, in stable pre-order (root first), each
 * listed once. Cyclic children are guarded so a corrupted tree can't loop.
 */
function usedTypes(doc: PageDocument): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  const visited = new Set<string>();
  const walk = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const node = doc.nodes[id];
    if (!node) return;
    if (!seen.has(node.type)) {
      seen.add(node.type);
      order.push(node.type);
    }
    for (const childId of node.children) walk(childId);
  };
  walk(doc.rootId);
  return order;
}

const CONTROL_LABELS: Record<PropSchema["control"], string> = {
  text: "문자열",
  number: "숫자",
  select: "선택",
  boolean: "불리언",
  color: "색상",
  icon: "아이콘 이름(문자열)",
};

/** Escape characters that would break a markdown table cell. */
function escapeCell(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/`/g, "\\`");
}

/** Human-readable type column for a prop ("선택(a \| b)" for selects). */
function controlLabel(p: PropSchema): string {
  if (p.control === "select" && p.options?.length) {
    return `선택(${p.options.map(escapeCell).join(" \\| ")})`;
  }
  return CONTROL_LABELS[p.control];
}

function formatDefault(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  return typeof value === "string" ? `"${escapeCell(value)}"` : String(value);
}

/** A node carrying each prop's schema default, for a representative toCode call. */
function sampleNode(def: ComponentDef): PageNode {
  const props: Record<string, unknown> = {};
  for (const p of def.props) props[p.key] = p.default;
  return {
    id: "_sample",
    type: def.type,
    props,
    children: [],
    frame: { x: 0, y: 0, w: def.defaultSize.w, h: def.defaultSize.h },
  };
}

/** One-line representative JSX so the receiver knows each component's contract. */
function codeShape(def: ComponentDef): string {
  const shape = def.toCode(sampleNode(def), def.isContainer ? " …" : "");
  // Collapse to a single line; containers become `<Tag> … </Tag>`.
  return shape.replace(/\s*\n\s*/g, " ").trim();
}

function legendEntry(def: ComponentDef): string {
  const kind = def.isContainer
    ? "컨테이너 — 자식 요소를 가질 수 있습니다."
    : "리프 — 자식이 없습니다.";
  const parts = [`### ${def.label} (\`${def.type}\`)`, kind];
  if (def.props.length) {
    parts.push(
      [
        "",
        "| 속성 | 설명 | 타입 | 기본값 |",
        "|------|------|------|--------|",
        ...def.props.map(
          (p) =>
            `| \`${escapeCell(p.key)}\` | ${escapeCell(p.label)} | ${controlLabel(p)} | ${formatDefault(p.default)} |`,
        ),
      ].join("\n"),
    );
  }
  parts.push("", `코드 형태: \`${codeShape(def)}\``);
  return parts.join("\n");
}

/** Provider-neutral reading guide (references the sections that follow). */
function preamble(doc: PageDocument): string {
  return [
    `> 이 문서는 노코드 빌더로 조립한 페이지 **${doc.meta.name}**의 구현 명세입니다. 특정 프레임워크나 코드베이스에 묶이지 않으며, 이 문서만으로 임의의 LLM이나 개발자가 페이지를 구현할 수 있도록 자기완결적으로 작성되었습니다.`,
    ">",
    "> **읽는 법**",
    "> - 페이지는 **고정 폭 루트** 안에서 각 요소를 **절대 위치(px)**로 배치합니다. `@(x,y) w×h`는 부모 좌상단 기준 (x,y) 위치와 w×h(px) 크기입니다(루트는 크기만 표기).",
    "> - 목록의 들여쓰기는 부모-자식 중첩입니다. `(container)`로 표시된 요소만 자식을 가집니다.",
    "> - `태블릿:`/`모바일:` 줄은 해당 폭의 반응형 오버라이드입니다(데스크톱이 기본값). `숨김`은 그 폭에서 렌더하지 않음을 뜻합니다.",
    "> - `이벤트:` 줄은 사용자 상호작용 바인딩입니다(예: 클릭 → 페이지 이동).",
    "> - 색상은 CSS 색상값, 간격(pad/margin)은 px, `T/R/B/L`은 상/우/하/좌 개별값입니다.",
    "> - 아래 **사용 컴포넌트**는 이 페이지가 쓰는 컴포넌트의 의미·속성·코드 형태입니다. 코드 블록의 `import ... from \"./components\"`는 예시 경로이며, 받는 환경의 컴포넌트로 대체하거나 명세대로 새로 구현하세요.",
  ].join("\n");
}

/**
 * Portable, provider-neutral context prepended to every export: a reading guide
 * plus a per-page legend (meaning, props, and code shape) for the component
 * types this page actually uses. Makes the export self-contained outside this
 * codebase — any LLM or developer can implement the page from it alone.
 */
export function generateContext(doc: PageDocument): string {
  const entries = usedTypes(doc)
    .map(getComponentDef)
    .filter((def): def is ComponentDef => Boolean(def))
    .map(legendEntry);
  // A well-formed doc always has its registered root, so this is empty only for
  // a corrupted document referencing unknown types; omit the empty section then.
  const legend = entries.length
    ? `\n\n## 사용 컴포넌트\n\n${entries.join("\n\n")}\n`
    : "\n";
  return `${preamble(doc)}${legend}`;
}
