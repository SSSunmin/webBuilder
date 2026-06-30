import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { getComponentDef } from "../registry";
import { guideStore } from "../canvas/guideStore";
import { domSnapContext, snapResize } from "../canvas/snap";
import { useEditorStore } from "../store/editorStore";
import {
  BREAKPOINTS,
  documentFontFamily,
  resolveColor,
  resolveFlow,
  resolveFrame,
  resolveHidden,
  shadowCss,
  toSides,
} from "../types/page";

/** Recursively renders a node and its subtree on the canvas with absolute
 * positioning, wired for selection, drag-to-move, drop (containers), resize.
 * `inFlow` = the parent is a flex container, so this node flows (relative,
 * fixed size) instead of being absolutely positioned, and can't be drag-moved
 * (reorder it from the layer tree instead). */
export function NodeView({ nodeId, inFlow = false }: { nodeId: string; inFlow?: boolean }) {
  const node = useEditorStore((s) => s.document?.nodes[nodeId]);
  // Resolve a token-referencing background to its literal color, selecting the
  // computed string so the canvas re-renders live when the token value changes.
  const background = useEditorStore((s) =>
    resolveColor(s.document?.nodes[nodeId]?.background, s.document?.meta.tokens),
  );
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

  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `drop:${nodeId}`,
    data: { nodeId },
    disabled: !container,
  });
  const { setNodeRef: dragRef, listeners, attributes, transform, isDragging } =
    useDraggable({ id: `drag:${nodeId}`, data: { nodeId }, disabled: isRoot || inFlow });

  if (!node || !def) return null;

  // Resolve layout/visibility for the active breakpoint (desktop = base frame).
  const frame = resolveFrame(node, bp);
  const hidden = resolveHidden(node, bp);

  const pad = toSides(node.padding, tokens);
  const mar = toSides(node.margin, tokens);
  const hasPadding = pad.top || pad.right || pad.bottom || pad.left;

  const setRefs = (el: HTMLElement | null) => {
    dropRef(el);
    dragRef(el);
  };

  // A flex container flows its children: wrap them so they reflow (wrap) when the
  // container narrows, and tell each child it's in-flow (relative, no drag).
  const flow = container ? resolveFlow(node) : null;
  const childEls = container
    ? node.children.map((cid) => <NodeView key={cid} nodeId={cid} inFlow={Boolean(flow)} />)
    : undefined;
  // Wrap only when there are children, so an empty flex container has the same
  // structure as the code export (which skips the wrapper when empty).
  const childContent = flow && childEls && childEls.length ? (
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
      {childEls}
    </div>
  ) : (
    childEls
  );

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

  // Non-desktop canvas narrows to the breakpoint's device width; height stays
  // the resolved frame height. Desktop keeps the resolved (base) width.
  const rootWidth =
    bp === "desktop" ? frame.w : BREAKPOINTS.find((b) => b.id === bp)!.width;

  const boxShadow = shadowCss(node.boxShadow);

  const base: CSSProperties = isRoot
    ? {
        position: "relative",
        width: rootWidth,
        height: frame.h,
        margin: "0 auto",
        background,
        borderRadius: node.borderRadius,
        boxShadow,
        // Base font applied at the root so all nodes inherit it (mirrors export).
        fontFamily: documentFontFamily(tokens),
      }
    : inFlow
      ? {
          // Flex item: flow normally, keep its fixed size, don't grow/shrink.
          position: "relative",
          width: frame.w,
          height: frame.h,
          flex: "0 0 auto",
          background,
          borderRadius: node.borderRadius,
          boxShadow,
          zIndex: selected ? 10 : undefined,
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
