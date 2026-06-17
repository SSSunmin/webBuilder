import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useState } from "react";
import { getComponentDef } from "../registry";
import { useEditorStore } from "../store/editorStore";
import { BuilderHeader } from "../components/BuilderHeader";
import { CanvasPane } from "../components/CanvasPane";
import { InspectorPane } from "../components/InspectorPane";
import { LayerTreePane } from "../components/LayerTreePane";
import { PalettePane } from "../components/PalettePane";

type EditorShellProps = {
  projectId: string;
};

type ActiveData =
  | { kind: "palette"; type: string }
  | { nodeId: string }
  | undefined;

export function EditorShell({ projectId }: EditorShellProps) {
  const addNode = useEditorStore((s) => s.addNode);
  const moveNode = useEditorStore((s) => s.moveNode);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

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
    const over = e.over;
    if (!over) return;
    const target = (over.data.current as { nodeId?: string } | undefined)?.nodeId;
    if (!target) return;
    const data = e.active.data.current as ActiveData;
    if (data && "kind" in data && data.kind === "palette") {
      addNode(target, data.type);
    } else if (data && "nodeId" in data) {
      moveNode(data.nodeId, target);
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
