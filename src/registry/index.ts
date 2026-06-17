import type { ComponentDef } from "../types/component";
import type { PageNode } from "../types/page";
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

/**
 * Create a fresh node for a component type, initialized with schema defaults.
 * Throws if the type is not registered.
 */
export function createNode(type: string): PageNode {
  const def = getComponentDef(type);
  if (!def) {
    throw new Error(`Unknown component type: ${type}`);
  }
  return {
    id: crypto.randomUUID(),
    type,
    props: defaultProps(def),
    children: [],
  };
}

export { componentDefs };
