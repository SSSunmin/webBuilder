import { useSyncExternalStore } from "react";
import { guideStore } from "../canvas/guideStore";

/** Renders magenta alignment guide lines (viewport-fixed) during drag. */
export function GuideOverlay() {
  const guides = useSyncExternalStore(guideStore.subscribe, guideStore.get);
  if (!guides.vx.length && !guides.hy.length) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[2000]">
      {guides.vx.map((x, i) => (
        <div
          key={`v${i}`}
          className="absolute top-0 h-full w-px bg-accent"
          style={{ left: x }}
        />
      ))}
      {guides.hy.map((y, i) => (
        <div
          key={`h${i}`}
          className="absolute left-0 h-px w-full bg-accent"
          style={{ top: y }}
        />
      ))}
    </div>
  );
}
