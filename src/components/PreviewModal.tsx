import type { CSSProperties, ReactNode } from "react";
import { getComponentDef } from "../registry";
import { useEditorStore } from "../store/editorStore";
import {
  BREAKPOINTS,
  documentFontFamily,
  resolveColor,
  resolveFrame,
  resolveHidden,
  shadowCss,
} from "../types/page";
import type { BreakpointId, PageDocument } from "../types/page";

/**
 * Render the page cleanly (no editor chrome) for the active breakpoint, matching
 * what the canvas (NodeView) shows: resolved frame, radius, shadow, and hidden
 * nodes dropped from the output.
 */
function renderNode(
  doc: PageDocument,
  nodeId: string,
  isRoot: boolean,
  bp: BreakpointId,
): ReactNode {
  const node = doc.nodes[nodeId];
  if (!node) return null;
  const def = getComponentDef(node.type);
  if (!def) return null;
  // A node hidden at this breakpoint is not part of the rendered page.
  if (resolveHidden(node, bp)) return null;

  const frame = resolveFrame(node, bp);
  const children = def.isContainer
    ? node.children.map((cid) => renderNode(doc, cid, false, bp))
    : undefined;

  // Non-desktop narrows the root to the device width (mirrors NodeView).
  const rootWidth =
    bp === "desktop" ? frame.w : BREAKPOINTS.find((b) => b.id === bp)!.width;
  const boxShadow = shadowCss(node.boxShadow);
  const background = resolveColor(node.background, doc.meta.tokens);

  const style: CSSProperties = isRoot
    ? {
        position: "relative",
        width: rootWidth,
        height: frame.h,
        margin: "0 auto",
        background,
        borderRadius: node.borderRadius,
        boxShadow,
        fontFamily: documentFontFamily(doc.meta.tokens),
      }
    : {
        position: "absolute",
        left: frame.x,
        top: frame.y,
        width: frame.w,
        height: frame.h,
        background,
        borderRadius: node.borderRadius,
        boxShadow,
      };

  return (
    <div key={nodeId} style={style}>
      {def.render(node.props, children)}
    </div>
  );
}

export function PreviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditorStore((s) => s.document);
  const bp = useEditorStore((s) => s.activeBreakpoint);
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
          {renderNode(doc, doc.rootId, true, bp)}
        </div>
      </div>
    </div>
  );
}
