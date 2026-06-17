import type { ComponentDef } from "../types/component";
import type { NodeFrame, PageNode } from "../types/page";
import { componentDefs } from "./components";

const byType = new Map<string, ComponentDef>(
  componentDefs.map((def) => [def.type, def]),
);

/** All registered component definitions (palette order). */
export function listComponents(): ComponentDef[] {
  return componentDefs;
}

/** Look up a component definition by type. Returns undefined if unknown. */
export function getComponentDef(type: string): ComponentDef | undefined {
  return byType.get(type);
}

/** Build the default props object for a component type from its schema. */
function defaultProps(def: ComponentDef): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const schema of def.props) {
    props[schema.key] = schema.default;
  }
  return props;
}

/** Default frame for a type, optionally at a drop position. */
export function defaultFrameFor(type: string, position?: { x: number; y: number }): NodeFrame {
  const def = getComponentDef(type);
  const size = def?.defaultSize ?? { w: 200, h: 48 };
  return { x: position?.x ?? 16, y: position?.y ?? 16, w: size.w, h: size.h };
}

/**
 * Create a fresh node for a component type, initialized with schema defaults
 * and a default frame. Throws if the type is not registered.
 */
export function createNode(type: string, position?: { x: number; y: number }): PageNode {
  const def = getComponentDef(type);
  if (!def) {
    throw new Error(`Unknown component type: ${type}`);
  }
  return {
    id: crypto.randomUUID(),
    type,
    props: defaultProps(def),
    children: [],
    frame: defaultFrameFor(type, position),
    background: def.defaultBackground,
  };
}

export { componentDefs };
