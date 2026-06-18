import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { getComponentDef } from "../registry";
import { useEditorStore } from "../store/editorStore";
import { toSides } from "../types/page";

/** Recursively renders a node and its subtree on the canvas with absolute
 * positioning, wired for selection, drag-to-move, drop (containers), resize. */
export function NodeView({ nodeId }: { nodeId: string }) {
  const node = useEditorStore((s) => s.document?.nodes[nodeId]);
  const rootId = useEditorStore((s) => s.document?.rootId);
  const selected = useEditorStore((s) => s.selectedIds.includes(nodeId));
  const onlySelected = useEditorStore(
    (s) => s.selectedIds.length === 1 && s.selectedIds[0] === nodeId,
  );
  const selectNode = useEditorStore((s) => s.selectNode);
  const updateNodeFrame = useEditorStore((s) => s.updateNodeFrame);

  const def = node ? getComponentDef(node.type) : undefined;
  const isRoot = nodeId === rootId;
  const container = Boolean(def?.isContainer);

  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `drop:${nodeId}`,
    data: { nodeId },
    disabled: !container,
  });
  const { setNodeRef: dragRef, listeners, attributes, transform, isDragging } =
    useDraggable({ id: `drag:${nodeId}`, data: { nodeId }, disabled: isRoot });

  if (!node || !def) return null;

  const pad = toSides(node.padding);
  const mar = toSides(node.margin);
  const hasPadding = pad.top || pad.right || pad.bottom || pad.left;

  const setRefs = (el: HTMLElement | null) => {
    dropRef(el);
    dragRef(el);
  };

  const childEls = container
    ? node.children.map((cid) => <NodeView key={cid} nodeId={cid} />)
    : undefined;

  const startResize = (e: ReactPointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = node.frame.w;
    const startH = node.frame.h;
    const onMove = (ev: globalThis.PointerEvent) => {
      updateNodeFrame(
        nodeId,
        {
          w: Math.max(20, Math.round(startW + (ev.clientX - startX))),
          h: Math.max(20, Math.round(startH + (ev.clientY - startY))),
        },
        `resize:${nodeId}`,
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const base: CSSProperties = isRoot
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
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 1000 : selected ? 10 : undefined,
      };

  return (
    <div
      ref={setRefs}
      data-node-id={nodeId}
      data-pt={pad.top}
      data-pr={pad.right}
      data-pb={pad.bottom}
      data-pl={pad.left}
      data-mt={mar.top}
      data-mr={mar.right}
      data-mb={mar.bottom}
      data-ml={mar.left}
      {...attributes}
      {...listeners}
      style={base}
      onClick={(e) => {
        e.stopPropagation();
        selectNode(nodeId, e.shiftKey);
      }}
      className={[
        isRoot ? "shadow-card" : "cursor-grab active:cursor-grabbing",
        "box-border transition-shadow",
        container && !isRoot ? "outline-dashed outline-1 outline-line" : "",
        selected ? "outline outline-2 outline-brand" : "",
        isOver && container ? "ring-2 ring-brand-light" : "",
        isDragging ? "opacity-80" : "",
      ].join(" ")}
    >
      {def.render(node.props, childEls)}
      {onlySelected && container && hasPadding ? (
        <div
          className="pointer-events-none absolute border border-dashed border-brand-light"
          style={{ top: pad.top, right: pad.right, bottom: pad.bottom, left: pad.left }}
        />
      ) : null}
      {onlySelected && (
        <span
          onPointerDown={startResize}
          className="absolute -bottom-1 -right-1 z-20 h-3 w-3 cursor-se-resize rounded-sm border border-white bg-brand"
          title="크기 조절"
        />
      )}
    </div>
  );
}
