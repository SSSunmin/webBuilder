import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getComponentDef } from "../registry";
import { guideStore } from "../canvas/guideStore";
import { domSnapContext, snapResize } from "../canvas/snap";
import { useEditorStore } from "../store/editorStore";
import {
  BREAKPOINTS,
  documentFontFamily,
  resolveBackground,
  resolveColor,
  resolveFlow,
  resolveFrame,
  resolveGrid,
  resolveHidden,
  resolveMargin,
  resolvePadding,
  shadowCss,
  toSides,
} from "../types/page";

/** Recursively renders a node and its subtree on the canvas with absolute
 * positioning, wired for selection, drag-to-move, drop (containers), resize.
 * `inFlow`/`inGrid` = the parent lays this node out in normal flow, so this
 * node is relative/fixed-size instead of absolutely positioned. */
export function NodeView({
  nodeId,
  inFlow = false,
  inGrid = false,
}: {
  nodeId: string;
  inFlow?: boolean;
  inGrid?: boolean;
}) {
  return inFlow ? (
    <FlowNodeView nodeId={nodeId} />
  ) : (
    <StaticNodeView nodeId={nodeId} inGrid={inGrid} />
  );
}

function useNodeModel(nodeId: string) {
  const node = useEditorStore((s) => s.document?.nodes[nodeId]);
  // Resolve a token-referencing background to its literal color, selecting the
  // computed string so the canvas re-renders live when the token value changes.
  const background = useEditorStore((s) => {
    const n = s.document?.nodes[nodeId];
    return n
      ? resolveColor(resolveBackground(n, s.activeBreakpoint), s.document?.meta.tokens)
      : undefined;
  });
  const tokens = useEditorStore((s) => s.document?.meta.tokens);
  const rootId = useEditorStore((s) => s.document?.rootId);
  const selected = useEditorStore((s) => s.selectedIds.includes(nodeId));
  const onlySelected = useEditorStore(
    (s) => s.selectedIds.length === 1 && s.selectedIds[0] === nodeId,
  );
  const selectNode = useEditorStore((s) => s.selectNode);
  const updateNodeFrame = useEditorStore((s) => s.updateNodeFrame);
  const bp = useEditorStore((s) => s.activeBreakpoint);

  const def = node ? getComponentDef(node.type) : undefined;
  const isRoot = nodeId === rootId;
  const container = Boolean(def?.isContainer);

  if (!node || !def) return null;

  // Resolve layout/visibility for the active breakpoint (desktop = base frame).
  const frame = resolveFrame(node, bp);
  const hidden = resolveHidden(node, bp);

  // Resolve padding/margin for the active breakpoint (desktop = base value).
  const pad = toSides(resolvePadding(node, bp), tokens);
  const mar = toSides(resolveMargin(node, bp), tokens);
  const hasPadding = pad.top || pad.right || pad.bottom || pad.left;

  // A flex container flows its children: wrap them so they reflow (wrap) when the
  // container narrows, and tell each child it's in-flow (relative + sortable).
  const flow = container ? resolveFlow(node, bp) : null;
  const grid = container ? resolveGrid(node, bp) : null;

  // Non-desktop canvas narrows to the breakpoint's device width; height stays
  // the resolved frame height. Desktop keeps the resolved (base) width.
  const rootWidth =
    bp === "desktop" ? frame.w : BREAKPOINTS.find((b) => b.id === bp)!.width;

  return {
    background,
    boxShadow: shadowCss(node.boxShadow),
    container,
    def,
    flow,
    fontFamily: documentFontFamily(tokens),
    frame,
    grid,
    hasPadding,
    hidden,
    isRoot,
    mar,
    node,
    nodeId,
    onlySelected,
    pad,
    rootWidth,
    selectNode,
    selected,
    updateNodeFrame,
  };
}

type NodeModel = NonNullable<ReturnType<typeof useNodeModel>>;
type DndAttributes = ReturnType<typeof useDraggable>["attributes"];
type DndListeners = ReturnType<typeof useDraggable>["listeners"];

function renderChildContent({ container, flow, grid, node }: NodeModel): ReactNode {
  const childEls = container
    ? node.children.map((cid) => (
        <NodeView key={cid} nodeId={cid} inFlow={Boolean(flow)} inGrid={Boolean(grid)} />
      ))
    : undefined;

  // Wrap only when there are children, so an empty flex container has the same
  // structure as the code export (which skips the wrapper when empty).
  if (flow && childEls && childEls.length) {
    return (
      <div
        className="h-full w-full"
        style={{
          display: "flex",
          boxSizing: "border-box",
          flexDirection: flow.flexDirection,
          flexWrap: flow.flexWrap,
          gap: flow.gap,
          alignItems: flow.alignItems,
          justifyContent: flow.justifyContent,
        }}
      >
        <SortableContext
          items={node.children}
          strategy={
            flow.flexDirection === "column"
              ? verticalListSortingStrategy
              : horizontalListSortingStrategy
          }
        >
          {childEls}
        </SortableContext>
      </div>
    );
  }

  if (grid && childEls && childEls.length) {
    return (
      <div
        className="h-full w-full"
        style={{
          display: "grid",
          boxSizing: "border-box",
          gridTemplateColumns: grid.gridTemplateColumns,
          ...(grid.gridTemplateRows ? { gridTemplateRows: grid.gridTemplateRows } : {}),
          gap: grid.gap,
          alignItems: grid.alignItems,
          justifyContent: grid.justifyContent,
        }}
      >
        {childEls}
      </div>
    );
  }

  return childEls;
}

function NodeBox({
  attributes,
  childContent,
  isDragging,
  isOver,
  listeners,
  model,
  setNodeRef,
  style,
}: {
  attributes: DndAttributes;
  childContent: ReactNode;
  isDragging: boolean;
  isOver: boolean;
  listeners: DndListeners;
  model: NodeModel;
  setNodeRef: (el: HTMLElement | null) => void;
  style: CSSProperties;
}) {
  const {
    container,
    def,
    frame,
    hasPadding,
    hidden,
    isRoot,
    mar,
    node,
    nodeId,
    onlySelected,
    pad,
    selectNode,
    selected,
    updateNodeFrame,
  } = model;

  const startResize = (e: ReactPointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = frame.w;
    const startH = frame.h;
    const el = document.querySelector(`[data-node-id="${nodeId}"]`);
    const rect = el?.getBoundingClientRect();
    const { others, bounds } = domSnapContext(el);
    const onMove = (ev: globalThis.PointerEvent) => {
      const rawW = startW + (ev.clientX - startX);
      const rawH = startH + (ev.clientY - startY);
      const moving = {
        x: rect?.left ?? frame.x,
        y: rect?.top ?? frame.y,
        w: Math.max(20, rawW),
        h: Math.max(20, rawH),
      };
      const snapped = snapResize(moving, others, bounds);
      updateNodeFrame(
        nodeId,
        {
          w: Math.max(20, Math.round(snapped.w)),
          h: Math.max(20, Math.round(snapped.h)),
        },
        `resize:${nodeId}`,
      );
      guideStore.set({ vx: snapped.vGuides, hy: snapped.hGuides });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      guideStore.clear();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      ref={setNodeRef}
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
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        selectNode(nodeId, e.shiftKey);
      }}
      className={[
        isRoot ? "shadow-card" : "cursor-grab active:cursor-grabbing",
        "box-border transition-shadow",
        container && !isRoot ? "outline-dashed outline-1 outline-line" : "",
        // Ghost a node hidden at this breakpoint: faint + dashed, but still
        // selectable so it can be re-shown from the inspector.
        hidden ? "opacity-40 outline-dashed outline-1 outline-muted" : "",
        selected ? "outline outline-2 outline-brand" : "",
        isOver && container ? "ring-2 ring-brand-light" : "",
        isDragging ? "opacity-80" : "",
      ].join(" ")}
    >
      {def.render(node.props, childContent)}
      {hidden && (
        <span className="pointer-events-none absolute -top-2 right-1 z-20 rounded-chip bg-ink px-1.5 py-0.5 text-[10px] font-medium text-white">
          숨김
        </span>
      )}
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

function StaticNodeView({ nodeId, inGrid = false }: { nodeId: string; inGrid?: boolean }) {
  const model = useNodeModel(nodeId);
  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `drop:${nodeId}`,
    data: { nodeId },
    disabled: !model?.container,
  });
  const { setNodeRef: dragRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: `drag:${nodeId}`,
    data: { nodeId },
    disabled: Boolean(model?.isRoot) || inGrid,
  });

  if (!model) return null;

  const setRefs = (el: HTMLElement | null) => {
    dropRef(el);
    dragRef(el);
  };

  const base: CSSProperties = model.isRoot
    ? {
        position: "relative",
        width: model.rootWidth,
        height: model.frame.h,
        margin: "0 auto",
        background: model.background,
        borderRadius: model.node.borderRadius,
        boxShadow: model.boxShadow,
        // Base font applied at the root so all nodes inherit it (mirrors export).
        fontFamily: model.fontFamily,
      }
    : inGrid
      ? {
          position: "relative",
          width: model.frame.w,
          height: model.frame.h,
          background: model.background,
          borderRadius: model.node.borderRadius,
          boxShadow: model.boxShadow,
          zIndex: model.selected ? 10 : undefined,
        }
      : {
          position: "absolute",
          left: model.frame.x,
          top: model.frame.y,
          width: model.frame.w,
          height: model.frame.h,
          background: model.background,
          borderRadius: model.node.borderRadius,
          boxShadow: model.boxShadow,
          transform: CSS.Translate.toString(transform),
          zIndex: isDragging ? 1000 : model.selected ? 10 : undefined,
        };

  return (
    <NodeBox
      attributes={attributes}
      childContent={renderChildContent(model)}
      isDragging={isDragging}
      isOver={isOver}
      listeners={listeners}
      model={model}
      setNodeRef={setRefs}
      style={base}
    />
  );
}

function FlowNodeView({ nodeId }: { nodeId: string }) {
  const model = useNodeModel(nodeId);
  const { attributes, isDragging, isOver, listeners, setNodeRef, transform, transition } =
    useSortable({ id: nodeId, data: { nodeId, flow: true } });

  if (!model) return null;

  const base: CSSProperties = {
    position: "relative",
    width: model.frame.w,
    height: model.frame.h,
    flex: "0 0 auto",
    background: model.background,
    borderRadius: model.node.borderRadius,
    boxShadow: model.boxShadow,
    transform: CSS.Transform.toString(transform),
    transition,
    // why: hide the source while dragging — the DragOverlay renders the moving
    // clone. Keeping the source static means the drop-time reorder is a clean
    // DOM move (no repaint flash), matching a layer-tree reorder.
    opacity: isDragging ? 0 : undefined,
    zIndex: model.selected ? 10 : undefined,
  };

  return (
    <NodeBox
      attributes={attributes}
      childContent={renderChildContent(model)}
      isDragging={isDragging}
      isOver={isOver}
      listeners={listeners}
      model={model}
      setNodeRef={setNodeRef}
      style={base}
    />
  );
}

/** Read-only visual clone of a node for the DragOverlay: the dragged flex child
 * follows the cursor via this clone while its source element stays put (opacity
 * 0), so dropping is a clean reorder with no repaint flash. */
export function NodeOverlay({ nodeId }: { nodeId: string }) {
  const node = useEditorStore((s) => s.document?.nodes[nodeId]);
  const tokens = useEditorStore((s) => s.document?.meta.tokens);
  const bp = useEditorStore((s) => s.activeBreakpoint);
  if (!node) return null;
  const def = getComponentDef(node.type);
  if (!def) return null;
  const frame = resolveFrame(node, bp);
  return (
    <div
      className="cursor-grabbing opacity-90 outline outline-2 outline-brand"
      style={{
        width: frame.w,
        height: frame.h,
        background: resolveColor(resolveBackground(node, bp), tokens),
        borderRadius: node.borderRadius,
        boxShadow: shadowCss(node.boxShadow),
        boxSizing: "border-box",
      }}
    >
      {/* shell only — children aren't shown in the overlay (would need recursive dnd hooks) */}
      {def.render(node.props, undefined)}
    </div>
  );
}
