import { useEffect } from "react";
import { useEditorStore } from "../store/editorStore";
import { AlignToolbar } from "./AlignToolbar";
import { NodeView } from "./NodeView";

export function CanvasPane() {
  const rootId = useEditorStore((s) => s.document?.rootId);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const selectNode = useEditorStore((s) => s.selectNode);
  const removeNode = useEditorStore((s) => s.removeNode);
  const moveNodeBy = useEditorStore((s) => s.moveNodeBy);

  const single = selectedIds.length === 1 ? selectedIds[0] : null;
  const singleType = useEditorStore((s) =>
    single ? s.document?.nodes[single]?.type : undefined,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selectedIds.length === 0) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) {
        return;
      }
      const movable = selectedIds.filter((id) => id !== rootId);
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        movable.forEach((id) => removeNode(id));
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const d = moves[e.key];
      if (d && movable.length) {
        e.preventDefault();
        movable.forEach((id) => moveNodeBy(id, d[0], d[1], `nudge:${movable.join(",")}`));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, rootId, removeNode, moveNodeBy]);

  return (
    <main className="flex min-h-[520px] flex-col rounded-card border border-line bg-white shadow-card lg:min-h-0">
      <div className="flex min-h-[44px] items-center justify-between gap-2 border-b border-line px-4 py-2">
        <p className="text-sm font-semibold text-ink2">캔버스</p>
        {selectedIds.length >= 2 ? (
          <AlignToolbar />
        ) : single && single !== rootId ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-chip bg-brand-pale px-2 py-1 font-medium text-brand">
              {singleType}
            </span>
            <button
              onClick={() => removeNode(single)}
              className="rounded-chip px-2 py-1 text-error hover:bg-error/10"
            >
              삭제
            </button>
          </div>
        ) : null}
      </div>
      <div
        className="flex-1 overflow-auto bg-line2/50 p-6"
        onClick={() => selectNode(null)}
      >
        {rootId ? (
          <NodeView nodeId={rootId} />
        ) : (
          <p className="text-sm text-muted">문서를 불러오는 중…</p>
        )}
      </div>
    </main>
  );
}
