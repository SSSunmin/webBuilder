import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  Active,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  Over,
} from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { guideStore } from "../canvas/guideStore";
import { flowDropStore } from "../canvas/flowDropStore";
import { resolveFlowDrag } from "../canvas/flowReorder";
import type { FlowRect } from "../canvas/flowReorder";
import { createSnapModifier, snapBox } from "../canvas/snap";
import type { Bounds, SnapBox } from "../canvas/snap";
import { getBlockDef, getComponentDef } from "../registry";
import { useEditorStore } from "../store/editorStore";
import { resolveFlow, toSides } from "../types/page";
import type { PageNode } from "../types/page";
import { GuideOverlay } from "../components/GuideOverlay";

const snapModifier = createSnapModifier((g) => guideStore.set(g));
import { BuilderHeader } from "../components/BuilderHeader";
import { CanvasPane } from "../components/CanvasPane";
import { InspectorPane } from "../components/InspectorPane";
import { LayerTreePane } from "../components/LayerTreePane";
import { PalettePane } from "../components/PalettePane";

type EditorShellProps = { projectId: string };

type ActiveData =
  | { kind: "palette"; type: string }
  | { kind: "block"; blockKey: string }
  | { nodeId: string }
  | undefined;

function parentOf(nodes: Record<string, PageNode>, childId: string): string | null {
  for (const node of Object.values(nodes)) {
    if (node.children.includes(childId)) return node.id;
  }
  return null;
}

function subtreeIds(nodes: Record<string, PageNode>, id: string, acc: string[] = []): string[] {
  acc.push(id);
  for (const c of nodes[id]?.children ?? []) subtreeIds(nodes, c, acc);
  return acc;
}

const boxOf = (n: PageNode): SnapBox => ({
  x: n.frame.x,
  y: n.frame.y,
  w: n.frame.w,
  h: n.frame.h,
  margin: n.margin,
});

/** A container's padded inner rectangle (children snap to this). */
const innerBounds = (n: PageNode): Bounds => {
  const p = toSides(n.padding);
  return { x0: p.left, y0: p.top, x1: n.frame.w - p.right, y1: n.frame.h - p.bottom };
};

/** Position of the dropped item relative to the target container's box. */
function dropPosition(active: Active, over: Over): { x: number; y: number } {
  const r = active.rect.current.translated;
  const o = over.rect;
  if (!r) return { x: 16, y: 16 };
  return { x: r.left - o.left, y: r.top - o.top };
}

export function EditorShell({ projectId }: EditorShellProps) {
  const addNode = useEditorStore((s) => s.addNode);
  const addBlock = useEditorStore((s) => s.addBlock);
  const moveNode = useEditorStore((s) => s.moveNode);
  const moveNodeBy = useEditorStore((s) => s.moveNodeBy);
  const moveNodeAdjacent = useEditorStore((s) => s.moveNodeAdjacent);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const activeBp = useEditorStore((s) => s.activeBreakpoint);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as ActiveData;
    // Only show a floating label for palette drags (no canvas element yet).
    // Node drags move the real element in place, so no overlay — this also
    // keeps the snap modifier measuring the real component size.
    if (data && "kind" in data && data.kind === "palette") {
      setActiveLabel(getComponentDef(data.type)?.label ?? data.type);
    } else if (data && "kind" in data && data.kind === "block") {
      setActiveLabel(getBlockDef(data.blockKey)?.label ?? data.blockKey);
    } else {
      setActiveLabel(null);
    }
  };

  // dnd-kit ClientRect → the plain rect resolveFlowDrag expects.
  const rectOf = (
    r: { left: number; top: number; width: number; height: number } | null | undefined,
  ): FlowRect | null => (r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null);

  // While dragging a flex (flow) child over a sibling, show where it would land.
  const onDragOver = (e: DragOverEvent) => {
    const data = e.active.data.current as ActiveData;
    if (!data || !("nodeId" in data)) {
      flowDropStore.clear();
      return;
    }
    const nodes = useEditorStore.getState().document?.nodes ?? {};
    const overNodeId = (e.over?.data.current as { nodeId?: string } | undefined)?.nodeId;
    const action = resolveFlowDrag(
      nodes,
      data.nodeId,
      overNodeId,
      rectOf(e.active.rect.current.translated),
      rectOf(e.over?.rect),
    );
    if (action?.kind === "reorder") {
      const pid = parentOf(nodes, data.nodeId);
      const dir =
        pid && resolveFlow(nodes[pid], activeBp)?.flexDirection === "column" ? "column" : "row";
      flowDropStore.set({ overId: action.refId, side: action.side, direction: dir });
    } else {
      flowDropStore.clear();
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveLabel(null);
    guideStore.clear();
    flowDropStore.clear();
    const data = e.active.data.current as ActiveData;
    const overNodeId = (e.over?.data.current as { nodeId?: string } | undefined)?.nodeId;

    // Palette → add into the container at the drop point.
    if (data && "kind" in data && data.kind === "palette") {
      if (overNodeId && e.over) addNode(overNodeId, data.type, dropPosition(e.active, e.over));
      return;
    }

    // Block → insert a composable section (container + children) at the drop point.
    if (data && "kind" in data && data.kind === "block") {
      if (overNodeId && e.over) addBlock(overNodeId, data.blockKey, dropPosition(e.active, e.over));
      return;
    }
    if (!data || !("nodeId" in data)) return;
    const id = data.nodeId;
    const nodes = useEditorStore.getState().document?.nodes ?? {};
    const node = nodes[id];
    if (!node) return;
    const currentParent = parentOf(nodes, id);

    // Flex (flow) child: reorder among siblings, or append into another container
    // — never absolute-reposition (frame position is meaningless in flow).
    const parentFlow = currentParent ? resolveFlow(nodes[currentParent], activeBp) : null;
    if (parentFlow) {
      const action = resolveFlowDrag(
        nodes,
        id,
        overNodeId,
        rectOf(e.active.rect.current.translated),
        rectOf(e.over?.rect),
      );
      if (action?.kind === "reorder") moveNodeAdjacent(action.id, action.refId, action.side);
      else if (action?.kind === "reparent") moveNode(action.id, action.parentId);
      return;
    }

    // Reparent into a different container under the pointer.
    const reparent =
      !!overNodeId &&
      !!e.over &&
      overNodeId !== currentParent &&
      overNodeId !== id &&
      !subtreeIds(nodes, id).includes(overNodeId);

    if (reparent && overNodeId && e.over) {
      const np = nodes[overNodeId];
      const raw = dropPosition(e.active, e.over);
      const moving: SnapBox = {
        x: raw.x,
        y: raw.y,
        w: node.frame.w,
        h: node.frame.h,
        margin: node.margin,
      };
      const snapped = snapBox(moving, np.children.map((c) => boxOf(nodes[c])), innerBounds(np));
      moveNode(id, overNodeId, snapped);
      return;
    }

    // Same-parent reposition, snapped to siblings + the container's padded bounds.
    const parent = currentParent ? nodes[currentParent] : null;
    const siblings = parent
      ? parent.children.filter((c) => c !== id).map((c) => boxOf(nodes[c]))
      : [];
    const moving: SnapBox = {
      x: node.frame.x + e.delta.x,
      y: node.frame.y + e.delta.y,
      w: node.frame.w,
      h: node.frame.h,
      margin: node.margin,
    };
    const snapped = snapBox(moving, siblings, parent ? innerBounds(parent) : null);
    moveNodeBy(id, snapped.x - node.frame.x, snapped.y - node.frame.y);
  };

  return (
    <DndContext
      sensors={sensors}
      modifiers={[snapModifier]}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveLabel(null);
        guideStore.clear();
        flowDropStore.clear();
      }}
    >
      <div className="grid min-h-screen grid-rows-[auto_1fr] bg-canvas text-ink lg:h-screen lg:grid-rows-[auto_minmax(0,1fr)] lg:overflow-hidden">
        <BuilderHeader projectId={projectId} />
        <div className="grid min-h-0 grid-cols-1 gap-3 p-3 lg:grid-rows-1 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
          <PalettePane />
          <CanvasPane />
          <aside className="grid min-h-[420px] grid-rows-2 gap-3 lg:min-h-0">
            <LayerTreePane />
            <InspectorPane />
          </aside>
        </div>
      </div>
      <DragOverlay>
        {activeLabel ? (
          <div className="rounded-button bg-brand px-3 py-2 text-sm font-semibold text-white shadow-cardHover">
            {activeLabel}
          </div>
        ) : null}
      </DragOverlay>
      <GuideOverlay />
    </DndContext>
  );
}
