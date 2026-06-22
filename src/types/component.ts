import type { ReactNode } from "react";
import type { PageNode } from "./page";

/** Editor control used by the inspector to render a field for a prop. */
export type PropControl = "text" | "number" | "select" | "boolean" | "color" | "icon";

/** Schema for a single editable prop of a component. */
export interface PropSchema {
  key: string;
  label: string;
  control: PropControl;
  /** Options for the "select" control. */
  options?: string[];
  default: unknown;
}

/**
 * Definition of a palette component. Drives the palette, the canvas preview,
 * the inspector form (via `props`), and MD code export (via `toCode`).
 */
export interface ComponentDef {
  type: string;
  label: string;
  category: string;
  /** Whether this component accepts child nodes. */
  isContainer: boolean;
  /** Hide from the palette while keeping the definition registered (so saved
   * documents that still reference this type render and export correctly). */
  hidden?: boolean;
  /** Initial width/height (px) when the component is added. */
  defaultSize: { w: number; h: number };
  /** Initial background color, if any. */
  defaultBackground?: string;
  /** Initial corner radius (px) when the component is added. */
  defaultBorderRadius?: number;
  props: PropSchema[];
  /** Canvas preview renderer. Fills its frame box; `children` are child nodes. */
  render: (props: Record<string, unknown>, children?: ReactNode) => ReactNode;
  /** Emits a JSX string for code export. `childrenCode` is the joined child JSX. */
  toCode: (node: PageNode, childrenCode: string) => string;
}
