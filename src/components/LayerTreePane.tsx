import { getComponentDef } from "../registry";
import { useEditorStore } from "../store/editorStore";

function TreeRow({
  nodeId,
  depth,
  canForward,
  canBackward,
}: {
  nodeId: string;
  depth: number;
  canForward: boolean;
  canBackward: boolean;
}) {
  const node = useEditorStore((s) => s.document?.nodes[nodeId]);
  const rootId = useEditorStore((s) => s.document?.rootId);
  const selected = useEditorStore((s) => s.selectedIds.includes(nodeId));
  const selectNode = useEditorStore((s) => s.selectNode);
  const removeNode = useEditorStore((s) => s.removeNode);
  const reorderNode = useEditorStore((s) => s.reorderNode);

  if (!node) return null;
  const def = getComponentDef(node.type);
  const isRoot = nodeId === rootId;
  // Show front-most (last in array) at the top, like design tools.
  const display = [...node.children].reverse();

  return (
    <>
      <div
        onClick={(e) => selectNode(nodeId, e.shiftKey)}
        className={`group flex cursor-pointer items-center gap-0.5 rounded-chip py-1 pr-1 text-sm transition ${
          selected ? "bg-brand-pale text-brand" : "hover:bg-line2 text-ink2"
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <span className="flex-1 truncate font-medium">{def?.label ?? node.type}</span>
        {!isRoot && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                reorderNode(nodeId, "forward");
              }}
              disabled={!canForward}
              title="앞으로"
              className="rounded px-1 text-muted hover:bg-line2 hover:text-ink disabled:opacity-25"
            >
              ↑
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                reorderNode(nodeId, "backward");
              }}
              disabled={!canBackward}
              title="뒤로"
              className="rounded px-1 text-muted hover:bg-line2 hover:text-ink disabled:opacity-25"
            >
              ↓
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeNode(nodeId);
              }}
              className="rounded px-1 text-error opacity-0 transition hover:bg-error/10 group-hover:opacity-100"
              aria-label="삭제"
            >
              ×
            </button>
          </>
        )}
      </div>
      {display.map((cid) => {
        const idx = node.children.indexOf(cid);
        return (
          <TreeRow
            key={cid}
            nodeId={cid}
            depth={depth + 1}
            canForward={idx < node.children.length - 1}
            canBackward={idx > 0}
          />
        );
      })}
    </>
  );
}

export function LayerTreePane() {
  const rootId = useEditorStore((s) => s.document?.rootId);
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-card border border-line bg-white shadow-card">
      <h2 className="border-b border-line px-4 py-2 text-sm font-semibold">레이어</h2>
      <div className="flex-1 overflow-auto p-2">
        {rootId ? (
          <TreeRow nodeId={rootId} depth={0} canForward={false} canBackward={false} />
        ) : (
          <p className="px-2 py-4 text-sm text-muted">문서 없음</p>
        )}
      </div>
    </section>
  );
}
