import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { listBlocks, listComponents } from "../registry";
import type { ComponentDef } from "../types/component";

const itemCls = (isDragging: boolean) =>
  `h-9 cursor-grab rounded-button border border-line bg-line2 px-3 text-left text-sm font-medium text-ink2 transition hover:border-brand-lightest hover:bg-brand-pale active:cursor-grabbing ${
    isDragging ? "opacity-40" : ""
  }`;

function PaletteItem({ type, label }: { type: string; label: string }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { kind: "palette", type },
  });
  return (
    <button ref={setNodeRef} {...attributes} {...listeners} className={itemCls(isDragging)}>
      {label}
    </button>
  );
}

function BlockItem({ blockKey, label }: { blockKey: string; label: string }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `block:${blockKey}`,
    data: { kind: "block", blockKey },
  });
  return (
    <button ref={setNodeRef} {...attributes} {...listeners} className={itemCls(isDragging)}>
      {label}
    </button>
  );
}

// Korean search aliases keyed by component type / block key. Palette labels are
// English, so without these "버튼" wouldn't match "Button". Add a line here when
// registering a new component/block (missing = English-only search for it).
const KO_ALIASES: Record<string, string> = {
  Layout: "레이아웃 컨테이너 박스 영역",
  Card: "카드",
  Section: "섹션 구역",
  Sidebar: "사이드바 측면 메뉴",
  Navbar: "네비게이션 내비 메뉴바 상단바",
  Heading: "제목 헤딩 머리글 타이틀",
  Text: "텍스트 본문 문단 글",
  Button: "버튼 단추",
  Link: "링크 연결",
  Badge: "배지 뱃지 라벨",
  Avatar: "아바타 프로필 사진",
  TagList: "태그 목록 태그리스트",
  Image: "이미지 그림 사진",
  Divider: "구분선 선",
  Stat: "통계 지표 수치 스탯",
  ProgressBar: "진행바 프로그레스 게이지",
  Chart: "차트 그래프",
  Form: "폼 양식 입력폼",
  Input: "입력 인풋 필드 입력창",
  header: "헤더 머리말 상단",
  hero: "히어로 대문 배너 메인",
  footer: "푸터 바닥글 하단",
};

function groupByCategory(defs: ComponentDef[]): [string, ComponentDef[]][] {
  const order: string[] = [];
  const map = new Map<string, ComponentDef[]>();
  for (const def of defs) {
    if (!map.has(def.category)) {
      map.set(def.category, []);
      order.push(def.category);
    }
    map.get(def.category)!.push(def);
  }
  return order.map((c) => [c, map.get(c)!]);
}

// Pseudo-category for blocks, kept separate from component categories so the
// chip filter can scope to blocks alone.
const BLOCKS_CATEGORY = "블록";

const chipCls = (active: boolean) =>
  `h-7 shrink-0 rounded-full border px-2.5 text-xs font-medium transition ${
    active
      ? "border-brand bg-brand text-white"
      : "border-line bg-line2 text-ink2 hover:border-brand-lightest hover:bg-brand-pale"
  }`;

export function PalettePane() {
  const [query, setQuery] = useState("");
  // null = 전체 (no category filter). Otherwise a component category or BLOCKS_CATEGORY.
  const [category, setCategory] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  // Match on the display label, the registry key/type, and Korean aliases.
  const match = (label: string, key: string) =>
    !q ||
    label.toLowerCase().includes(q) ||
    key.toLowerCase().includes(q) ||
    (KO_ALIASES[key]?.includes(q) ?? false);

  const allComponents = listComponents();
  // Category chips derived from the registry (registry order) so newly
  // registered components surface here without touching this file. Drop any
  // component category that collides with the blocks pseudo-category so the
  // "블록" chip never appears twice.
  const categories = [
    ...new Set(allComponents.map((d) => d.category).filter((c) => c !== BLOCKS_CATEGORY)),
    BLOCKS_CATEGORY,
  ];

  const showComponents = category !== BLOCKS_CATEGORY;
  const showBlocks = category === null || category === BLOCKS_CATEGORY;

  const groups = groupByCategory(
    allComponents.filter(
      (d) =>
        showComponents &&
        (category === null || d.category === category) &&
        match(d.label, d.type),
    ),
  );
  const blocks = showBlocks
    ? listBlocks().filter((b) => match(b.label, b.key))
    : [];
  const empty = blocks.length === 0 && groups.length === 0;

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="border-b border-line px-4 py-2">
        <h2 className="text-sm font-semibold">팔레트</h2>
        <p className="mt-0.5 text-xs text-muted">드래그해서 캔버스에 추가</p>
      </div>
      <div className="border-b border-line px-3 py-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="컴포넌트 검색"
          className="h-8 w-full rounded-button border border-line bg-line2 px-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-lightest focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <div role="group" aria-label="카테고리 필터" className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
            className={chipCls(category === null)}
          >
            전체
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={chipCls(category === c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {empty && (
          <p className="px-1 py-6 text-center text-xs text-muted">
            {query.trim()
              ? `"${query.trim()}"에 맞는 컴포넌트가 없습니다.`
              : "이 카테고리에 항목이 없습니다."}
          </p>
        )}
        {blocks.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              블록
            </p>
            <div className="grid gap-2">
              {blocks.map((b) => (
                <BlockItem key={b.key} blockKey={b.key} label={b.label} />
              ))}
            </div>
          </div>
        )}
        {groups.map(([cat, items]) => (
          <div key={cat} className="mb-4 last:mb-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {cat}
            </p>
            <div className="grid gap-2">
              {items.map((d) => (
                <PaletteItem key={d.type} type={d.type} label={d.label} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
