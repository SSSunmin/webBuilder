import { BuilderHeader } from "../components/BuilderHeader";
import { CanvasPane } from "../components/CanvasPane";
import { InspectorPane } from "../components/InspectorPane";
import { LayerTreePane } from "../components/LayerTreePane";
import { PalettePane } from "../components/PalettePane";

type EditorShellProps = {
  projectId: string;
};

export function EditorShell({ projectId }: EditorShellProps) {
  return (
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
  );
}
