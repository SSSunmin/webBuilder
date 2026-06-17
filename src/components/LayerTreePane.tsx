import { getComponentDef } from "../registry";
import { useEditorStore } from "../store/editorStore";

function TreeRow({ nodeId, depth }: { nodeId: string; depth: number }) {
  const node = useEditorStore((s) => s.document?.nodes[nodeId]);
  const rootId = useEditorStore((s) => s.document?.rootId);
  const selected = useEditorStore((s) => s.selectedIds.includes(nodeId));
  const selectNode = useEditorStore((s) => s.selectNode);
  const removeNode = useEditorStore((s) => s.removeNode);

  if (!node) return null;
  const def = getComponentDef(node.type);

  return (
    <>
      <div
        onClick={(e) => selectNode(nodeId, e.shiftKey)}
        className={`group flex cursor-pointer items-center gap-1 rounded-chip py-1 pr-1 text-sm transition ${
          selected ? "bg-brand-pale text-brand" : "hover:bg-line2 text-ink2"
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <span className="flex-1 truncate font-medium">{def?.label ?? node.type}</span>
        {nodeId !== rootId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeNode(nodeId);
            }}
            className="opacity-0 transition group-hover:opacity-100 rounded px-1 text-error hover:bg-error/10"
            aria-label="삭제"
          >
            ×
          </button>
        )}
      </div>
      {node.children.map((cid) => (
        <TreeRow key={cid} nodeId={cid} depth={depth + 1} />
      ))}
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
          <TreeRow nodeId={rootId} depth={0} />
        ) : (
          <p className="px-2 py-4 text-sm text-muted">문서 없음</p>
        )}
      </div>
    </section>
  );
}
