import { Fragment } from "react";
import type { ReactNode } from "react";
import { getComponentDef } from "../registry";
import { useEditorStore } from "../store/editorStore";
import type { PageDocument } from "../types/page";

/** Render the page cleanly (no selection/drag chrome) for preview. */
function renderPreview(doc: PageDocument, nodeId: string): ReactNode {
  const node = doc.nodes[nodeId];
  if (!node) return null;
  const def = getComponentDef(node.type);
  if (!def) return null;
  const children = def.isContainer
    ? node.children.map((cid) => (
        <Fragment key={cid}>{renderPreview(doc, cid)}</Fragment>
      ))
    : undefined;
  return def.render(node.props, children);
}

export function PreviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditorStore((s) => s.document);
  if (!open || !doc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink/40 p-4"
      onClick={onClose}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden rounded-card bg-white shadow-cardHover">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-semibold text-ink">미리보기 · {doc.meta.name}</h2>
          <button
            onClick={onClose}
            className="h-9 rounded-button border border-line bg-white px-4 text-sm font-medium text-muted hover:bg-line2"
          >
            닫기
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
          {renderPreview(doc, doc.rootId)}
        </div>
      </div>
    </div>
  );
}
