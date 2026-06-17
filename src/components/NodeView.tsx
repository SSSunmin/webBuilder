import { useDraggable, useDroppable } from "@dnd-kit/core";
import { getComponentDef } from "../registry";
import { useEditorStore } from "../store/editorStore";

/** Recursively renders a node and its subtree on the canvas, wired for
 * selection (click), dragging (move), and dropping (containers). */
export function NodeView({ nodeId }: { nodeId: string }) {
  const node = useEditorStore((s) => s.document?.nodes[nodeId]);
  const rootId = useEditorStore((s) => s.document?.rootId);
  const selected = useEditorStore((s) => s.selectedId === nodeId);
  const selectNode = useEditorStore((s) => s.selectNode);

  const def = node ? getComponentDef(node.type) : undefined;
  const isRoot = nodeId === rootId;
  const container = Boolean(def?.isContainer);

  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `drop:${nodeId}`,
    data: { nodeId },
    disabled: !container,
  });
  const {
    setNodeRef: dragRef,
    listeners,
    attributes,
    isDragging,
  } = useDraggable({
    id: `drag:${nodeId}`,
    data: { nodeId },
    disabled: isRoot,
  });

  if (!node || !def) return null;

  const setRefs = (el: HTMLElement | null) => {
    dropRef(el);
    dragRef(el);
  };

  const childEls = container
    ? node.children.map((cid) => <NodeView key={cid} nodeId={cid} />)
    : undefined;

  return (
    <div
      ref={setRefs}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        selectNode(nodeId);
      }}
      className={[
        "relative cursor-pointer rounded-[3px] transition",
        isDragging ? "opacity-40" : "",
        selected ? "outline outline-2 outline-brand outline-offset-2" : "",
        isOver && container ? "ring-2 ring-brand-light ring-offset-2" : "",
      ].join(" ")}
    >
      {def.render(node.props, childEls)}
    </div>
  );
}
