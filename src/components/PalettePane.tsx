import { useDraggable } from "@dnd-kit/core";
import { listComponents } from "../registry";

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
      className={`h-10 cursor-grab rounded-button border border-line bg-line2 px-3 text-left text-sm font-medium text-ink2 transition hover:border-brand-lightest hover:bg-brand-pale active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {label}
    </button>
  );
}

export function PalettePane() {
  const items = listComponents();
  return (
    <aside className="rounded-card border border-line bg-white p-4 shadow-card">
      <h2 className="text-sm font-semibold">팔레트</h2>
      <p className="mt-1 text-xs text-muted">드래그해서 캔버스에 추가</p>
      <div className="mt-3 grid gap-2">
        {items.map((d) => (
          <PaletteItem key={d.type} type={d.type} label={d.label} />
        ))}
      </div>
    </aside>
  );
}
