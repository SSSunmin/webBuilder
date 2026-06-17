import { useEffect } from "react";
import { useEditorStore } from "../store/editorStore";
import { NodeView } from "./NodeView";

export function CanvasPane() {
  const rootId = useEditorStore((s) => s.document?.rootId);
  const selectedId = useEditorStore((s) => s.selectedId);
  const selectedType = useEditorStore((s) =>
    s.selectedId ? s.document?.nodes[s.selectedId]?.type : undefined,
  );
  const selectNode = useEditorStore((s) => s.selectNode);
  const removeNode = useEditorStore((s) => s.removeNode);
  const moveNodeBy = useEditorStore((s) => s.moveNodeBy);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeNode(selectedId);
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
      if (d && selectedId !== rootId) {
        e.preventDefault();
        moveNodeBy(selectedId, d[0], d[1], `nudge:${selectedId}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, rootId, removeNode, moveNodeBy]);

  const deletable = selectedId && selectedId !== rootId;

  return (
    <main className="flex min-h-[520px] flex-col rounded-card border border-line bg-white shadow-card lg:min-h-0">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <p className="text-sm font-semibold text-ink2">캔버스</p>
        {deletable && (
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-chip bg-brand-pale px-2 py-1 font-medium text-brand">
              {selectedType}
            </span>
            <button
              onClick={() => selectedId && removeNode(selectedId)}
              className="rounded-chip px-2 py-1 text-error hover:bg-error/10"
            >
              삭제
            </button>
          </div>
        )}
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
