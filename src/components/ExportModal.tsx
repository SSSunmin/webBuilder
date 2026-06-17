import { useMemo, useState } from "react";
import { EXPORT_MODE_LABELS, generateMarkdown } from "../export";
import type { ExportMode } from "../export";
import { useEditorStore } from "../store/editorStore";

const MODES: ExportMode[] = ["spec", "code", "both"];

function slugify(name: string): string {
  return name.trim().replace(/\s+/g, "-").replace(/[^\w가-힣-]/g, "") || "page";
}

export function ExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditorStore((s) => s.document);
  const [mode, setMode] = useState<ExportMode>("both");
  const [copied, setCopied] = useState(false);

  const markdown = useMemo(
    () => (doc ? generateMarkdown(doc, mode) : ""),
    [doc, mode],
  );

  if (!open || !doc) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(doc.meta.name)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-card border border-line bg-white shadow-cardHover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-semibold text-ink">Markdown 내보내기</h2>
          <div className="inline-flex rounded-button border border-line p-0.5">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-[8px] px-3 py-1 text-sm font-medium transition ${
                  mode === m ? "bg-brand text-white" : "text-muted hover:text-ink"
                }`}
              >
                {EXPORT_MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <pre className="flex-1 overflow-auto bg-line2/40 p-4 text-xs leading-5 text-ink2">
          {markdown}
        </pre>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <button
            onClick={onClose}
            className="h-9 rounded-button border border-line bg-white px-4 text-sm font-medium text-muted hover:bg-line2"
          >
            닫기
          </button>
          <button
            onClick={handleCopy}
            className="h-9 rounded-button border border-line bg-white px-4 text-sm font-medium text-brand hover:bg-brand-pale"
          >
            {copied ? "복사됨 ✓" : "복사"}
          </button>
          <button
            onClick={handleDownload}
            className="h-9 rounded-button bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            .md 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}
