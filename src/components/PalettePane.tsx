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

export function PalettePane() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  // Match on both the display label and the registry key/type.
  const match = (label: string, key: string) =>
    !q || label.toLowerCase().includes(q) || key.toLowerCase().includes(q);

  const groups = groupByCategory(
    listComponents().filter((d) => match(d.label, d.type)),
  );
  const blocks = listBlocks().filter((b) => match(b.label, b.key));
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
      </div>
      <div className="flex-1 overflow-auto p-3">
        {empty && (
          <p className="px-1 py-6 text-center text-xs text-muted">
            "{query.trim()}"에 맞는 컴포넌트가 없습니다.
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
        {groups.map(([category, items]) => (
          <div key={category} className="mb-4 last:mb-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              {category}
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
