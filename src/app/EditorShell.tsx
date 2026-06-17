import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Active, DragEndEvent, DragStartEvent, Over } from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { getComponentDef } from "../registry";
import { useEditorStore } from "../store/editorStore";
import type { PageNode } from "../types/page";
import { BuilderHeader } from "../components/BuilderHeader";
import { CanvasPane } from "../components/CanvasPane";
import { InspectorPane } from "../components/InspectorPane";
import { LayerTreePane } from "../components/LayerTreePane";
import { PalettePane } from "../components/PalettePane";

type EditorShellProps = { projectId: string };

type ActiveData =
  | { kind: "palette"; type: string }
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

/** Position of the dropped item relative to the target container's box. */
function dropPosition(active: Active, over: Over): { x: number; y: number } {
  const r = active.rect.current.translated;
  const o = over.rect;
  if (!r) return { x: 16, y: 16 };
  return { x: r.left - o.left, y: r.top - o.top };
}

export function EditorShell({ projectId }: EditorShellProps) {
  const addNode = useEditorStore((s) => s.addNode);
  const moveNode = useEditorStore((s) => s.moveNode);
  const moveNodeBy = useEditorStore((s) => s.moveNodeBy);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
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
    if (data && "kind" in data && data.kind === "palette") {
      setActiveLabel(getComponentDef(data.type)?.label ?? data.type);
    } else if (data && "nodeId" in data) {
      const type = useEditorStore.getState().document?.nodes[data.nodeId]?.type;
      setActiveLabel(type ? getComponentDef(type)?.label ?? type : null);
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveLabel(null);
    const data = e.active.data.current as ActiveData;
    const overNodeId = (e.over?.data.current as { nodeId?: string } | undefined)?.nodeId;

    // Palette → add into the container at the drop point.
    if (data && "kind" in data && data.kind === "palette") {
      if (overNodeId && e.over) addNode(overNodeId, data.type, dropPosition(e.active, e.over));
      return;
    }
    if (!data || !("nodeId" in data)) return;
    const id = data.nodeId;

    // No container under the pointer → just nudge within the current parent.
    if (!overNodeId || !e.over) {
      moveNodeBy(id, e.delta.x, e.delta.y);
      return;
    }

    const nodes = useEditorStore.getState().document?.nodes ?? {};
    const currentParent = parentOf(nodes, id);
    const intoSelfOrChild =
      overNodeId === id || subtreeIds(nodes, id).includes(overNodeId);

    if (overNodeId === currentParent || intoSelfOrChild) {
      moveNodeBy(id, e.delta.x, e.delta.y);
    } else {
      moveNode(id, overNodeId, dropPosition(e.active, e.over));
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid min-h-screen grid-rows-[auto_1fr] bg-canvas text-ink">
        <BuilderHeader projectId={projectId} />
        <div className="grid min-h-0 grid-cols-1 gap-3 p-3 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
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
    </DndContext>
  );
}
