import { useDraggable } from "@dnd-kit/core";
import { listComponents } from "../registry";
import type { ComponentDef } from "../types/component";

function PaletteItem({ type, label }: { type: string; label: string }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { kind: "palette", type },
  });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`h-9 cursor-grab rounded-button border border-line bg-line2 px-3 text-left text-sm font-medium text-ink2 transition hover:border-brand-lightest hover:bg-brand-pale active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
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
  const groups = groupByCategory(listComponents());
  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-card border border-line bg-white shadow-card">
      <div className="border-b border-line px-4 py-2">
        <h2 className="text-sm font-semibold">팔레트</h2>
        <p className="mt-0.5 text-xs text-muted">드래그해서 캔버스에 추가</p>
      </div>
      <div className="flex-1 overflow-auto p-3">
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
