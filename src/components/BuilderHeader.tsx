import { useState } from "react";
import { Link } from "react-router-dom";
import { storage } from "../storage";
import { useEditorStore } from "../store/editorStore";
import { ExportModal } from "./ExportModal";
import { PreviewModal } from "./PreviewModal";

type BuilderHeaderProps = {
  projectId: string;
};

type SaveState = "idle" | "saving" | "saved";

const iconBtn =
  "flex h-9 w-9 items-center justify-center rounded-button border border-line bg-white text-base text-muted hover:bg-line2 disabled:opacity-40";

export function BuilderHeader({ projectId }: BuilderHeaderProps) {
  const document = useEditorStore((s) => s.document);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [exportOpen, setExportOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const projectName = document?.meta.name ?? projectId;

  const handleSave = async () => {
    if (!document) return;
    setSaveState("saving");
    await storage.save(document);
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 1500);
  };

  return (
    <header className="flex min-h-14 items-center justify-between border-b border-line bg-white px-4 shadow-pane">
      <div className="flex min-w-0 items-center gap-4">
        <Link
          to="/"
          className="text-sm font-semibold text-brand hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
        >
          webBuilder
        </Link>
        <div className="min-w-0 border-l border-line pl-4">
          <p className="truncate text-sm font-medium text-ink2">{projectName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="실행 취소 (Ctrl+Z)"
          className={iconBtn}
        >
          ↶
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="다시 실행 (Ctrl+Shift+Z)"
          className={iconBtn}
        >
          ↷
        </button>
        <button
          onClick={() => setPreviewOpen(true)}
          disabled={!document}
          className="h-9 rounded-button border border-line bg-white px-3 text-sm font-medium text-muted hover:bg-line2 disabled:opacity-50"
        >
          미리보기
        </button>
        <button
          onClick={handleSave}
          disabled={!document || saveState === "saving"}
          className="h-9 rounded-button border border-line bg-white px-3 text-sm font-medium text-muted hover:bg-line2 disabled:opacity-50"
        >
          {saveState === "saving" ? "저장 중…" : saveState === "saved" ? "저장됨 ✓" : "저장"}
        </button>
        <button
          onClick={() => setExportOpen(true)}
          disabled={!document}
          className="h-9 rounded-button bg-brand px-3 text-sm font-semibold text-white shadow-card hover:bg-brand-dark disabled:opacity-50"
        >
          Export
        </button>
      </div>
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </header>
  );
}
