import type { CSSProperties, ReactNode } from "react";
import { getComponentDef } from "../registry";
import { useEditorStore } from "../store/editorStore";
import type { PageDocument } from "../types/page";

/** Render the page cleanly (no editor chrome) with absolute positioning. */
function renderNode(doc: PageDocument, nodeId: string, isRoot: boolean): ReactNode {
  const node = doc.nodes[nodeId];
  if (!node) return null;
  const def = getComponentDef(node.type);
  if (!def) return null;

  const children = def.isContainer
    ? node.children.map((cid) => renderNode(doc, cid, false))
    : undefined;

  const style: CSSProperties = isRoot
    ? {
        position: "relative",
        width: node.frame.w,
        height: node.frame.h,
        margin: "0 auto",
        background: node.background,
      }
    : {
        position: "absolute",
        left: node.frame.x,
        top: node.frame.y,
        width: node.frame.w,
        height: node.frame.h,
        background: node.background,
      };

  return (
    <div key={nodeId} style={style}>
      {def.render(node.props, children)}
    </div>
  );
}

export function PreviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditorStore((s) => s.document);
  if (!open || !doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/40 p-4" onClick={onClose}>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-card bg-white shadow-cardHover">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-semibold text-ink">미리보기 · {doc.meta.name}</h2>
          <button
            onClick={onClose}
            className="h-9 rounded-button border border-line bg-white px-4 text-sm font-medium text-muted hover:bg-line2"
          >
            닫기
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-line2/40 p-6" onClick={(e) => e.stopPropagation()}>
          {renderNode(doc, doc.rootId, true)}
        </div>
      </div>
    </div>
  );
}
