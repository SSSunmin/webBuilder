import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Active, DragEndEvent, DragMoveEvent, DragOverEvent, Over } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useState } from "react";
import { getComponentDef } from "../registry";
import { useEditorStore } from "../store/editorStore";
import { resolveHidden } from "../types/page";
import type { PageNode } from "../types/page";

type DropZone = "before" | "after" | "inside";
type DropIntent = { overId: string; zone: DropZone } | null;

const treeDragId = (nodeId: string) => `tree:${nodeId}`;
const treeDropId = (nodeId: string) => `treedrop:${nodeId}`;

function nodeIdFromActive(active: Active): string | null {
  const data = active.data.current as { nodeId?: unknown } | undefined;
  if (typeof data?.nodeId === "string") return data.nodeId;
  const id = String(active.id);
  return id.startsWith("tree:") ? id.slice("tree:".length) : null;
}

function nodeIdFromOver(over: Over | null): string | null {
  const data = over?.data.current as { nodeId?: unknown } | undefined;
  if (typeof data?.nodeId === "string") return data.nodeId;
  const id = over ? String(over.id) : "";
  return id.startsWith("treedrop:") ? id.slice("treedrop:".length) : null;
}

function subtreeContains(
  nodes: Record<string, PageNode>,
  nodeId: string,
  targetId: string,
): boolean {
  const node = nodes[nodeId];
  if (!node) return false;
  if (node.children.includes(targetId)) return true;
  return node.children.some((childId) => subtreeContains(nodes, childId, targetId));
}

function resolveDropIntent(event: DragMoveEvent | DragOverEvent): DropIntent {
  const activeId = nodeIdFromActive(event.active);
  const overId = nodeIdFromOver(event.over);
  const translated = event.active.rect.current.translated;
  if (!activeId || !overId || activeId === overId || !event.over || !translated) return null;

  const overRect = event.over.rect;
  const ratio = (translated.top + translated.height / 2 - overRect.top) / overRect.height;
  if (ratio < 0.3) return { overId, zone: "before" };
  if (ratio > 0.7) return { overId, zone: "after" };

  const node = useEditorStore.getState().document?.nodes[overId];
  if (node && getComponentDef(node.type)?.isContainer) return { overId, zone: "inside" };
  return { overId, zone: ratio < 0.5 ? "before" : "after" };
}

function TreeRow({
  nodeId,
  depth,
  canForward,
  canBackward,
  dropIntent,
}: {
  nodeId: string;
  depth: number;
  canForward: boolean;
  canBackward: boolean;
  dropIntent: DropIntent;
}) {
  const node = useEditorStore((s) => s.document?.nodes[nodeId]);
  const rootId = useEditorStore((s) => s.document?.rootId);
  const selected = useEditorStore((s) => s.selectedIds.includes(nodeId));
  const selectNode = useEditorStore((s) => s.selectNode);
  const removeNode = useEditorStore((s) => s.removeNode);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const reorderNode = useEditorStore((s) => s.reorderNode);
  const bp = useEditorStore((s) => s.activeBreakpoint);
  const isRoot = nodeId === rootId;
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id: treeDragId(nodeId),
    data: { nodeId },
    disabled: isRoot,
  });
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: treeDropId(nodeId),
    data: { nodeId },
  });
  const setRowRef = useCallback(
    (element: HTMLDivElement | null) => {
      setDraggableRef(element);
      setDroppableRef(element);
    },
    [setDraggableRef, setDroppableRef],
  );

  if (!node) return null;
  const def = getComponentDef(node.type);
  const hidden = resolveHidden(node, bp);
  // Show front-most (last in array) at the top, like design tools.
  const display = [...node.children].reverse();
  const intentZone = dropIntent?.overId === nodeId ? dropIntent.zone : null;
  const dragHandleProps = isRoot ? {} : { ...attributes, ...listeners };

  return (
    <>
      <div
        ref={setRowRef}
        onClick={(e) => selectNode(nodeId, e.shiftKey)}
        className={`group relative flex cursor-pointer items-center gap-0.5 rounded-chip py-1 pr-1 text-sm transition ${
          intentZone === "inside"
            ? "bg-brand-pale ring-1 ring-inset ring-brand-light text-brand"
            : selected
              ? "bg-brand-pale text-brand"
              : "hover:bg-line2 text-ink2"
        } ${isDragging ? "opacity-50" : ""}`}
        style={{
          paddingLeft: 8 + depth * 14,
          transform: transform ? CSS.Translate.toString(transform) : undefined,
        }}
      >
        {intentZone === "before" && (
          <span className="pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded-full bg-brand" />
        )}
        {intentZone === "after" && (
          <span className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-brand" />
        )}
        <span
          className={`flex flex-1 items-center gap-1 truncate font-medium ${
            hidden ? "text-muted opacity-60" : ""
          }`}
          {...dragHandleProps}
        >
          <span className="truncate">{def?.label ?? node.type}</span>
          {hidden && <span className="shrink-0 text-[10px]">🚫 숨김</span>}
        </span>
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
                duplicateNode(nodeId);
              }}
              title="복제"
              aria-label="복제"
              className="rounded px-1 text-muted opacity-0 transition hover:bg-line2 hover:text-ink group-hover:opacity-100"
            >
              ⎘
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
            dropIntent={dropIntent}
          />
        );
      })}
    </>
  );
}

export function LayerTreePane() {
  const rootId = useEditorStore((s) => s.document?.rootId);
  const moveNodeInto = useEditorStore((s) => s.moveNodeInto);
  const moveNodeAdjacent = useEditorStore((s) => s.moveNodeAdjacent);
  const [dropIntent, setDropIntent] = useState<DropIntent>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const updateDropIntent = useCallback((event: DragMoveEvent | DragOverEvent) => {
    setDropIntent(resolveDropIntent(event));
  }, []);
  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const intent = dropIntent;
      setDropIntent(null);
      const activeId = nodeIdFromActive(event.active);
      if (!activeId || !intent || activeId === intent.overId) return;

      const nodes = useEditorStore.getState().document?.nodes ?? {};
      if (subtreeContains(nodes, activeId, intent.overId)) return;

      if (intent.zone === "inside") {
        moveNodeInto(activeId, intent.overId);
        return;
      }

      // The tree renders children reversed, so visual before/after is inverted
      // before calling the raw children-array adjacency action.
      moveNodeAdjacent(activeId, intent.overId, intent.zone === "before" ? "after" : "before");
    },
    [dropIntent, moveNodeAdjacent, moveNodeInto],
  );

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-card border border-line bg-white shadow-card">
      <h2 className="border-b border-line px-4 py-2 text-sm font-semibold">레이어</h2>
      <DndContext
        sensors={sensors}
        onDragMove={updateDropIntent}
        onDragOver={updateDropIntent}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDropIntent(null)}
      >
        <div className="flex-1 overflow-auto p-2">
          {rootId ? (
            <TreeRow
              nodeId={rootId}
              depth={0}
              canForward={false}
              canBackward={false}
              dropIntent={dropIntent}
            />
          ) : (
            <p className="px-2 py-4 text-sm text-muted">문서 없음</p>
          )}
        </div>
      </DndContext>
    </section>
  );
}
