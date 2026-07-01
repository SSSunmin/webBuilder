import { getComponentDef } from "../registry";
import type { PageNode } from "../types/page";

export type FlowDrop =
  | { kind: "reorder"; id: string; refId: string; side: "before" | "after" }
  | { kind: "reparent"; id: string; parentId: string }
  | null;

function parentOf(nodes: Record<string, PageNode>, childId: string): string | null {
  for (const node of Object.values(nodes)) {
    if (node.children.includes(childId)) return node.id;
  }
  return null;
}

function subtreeIds(nodes: Record<string, PageNode>, id: string, acc: string[] = []): string[] {
  acc.push(id);
  for (const childId of nodes[id]?.children ?? []) subtreeIds(nodes, childId, acc);
  return acc;
}

export function resolveFlowDrop(
  nodes: Record<string, PageNode>,
  activeId: string,
  overId: string | undefined,
): FlowDrop {
  if (!overId || overId === activeId) return null;

  const currentParent = parentOf(nodes, activeId);
  if (!currentParent) return null;

  const overParent = parentOf(nodes, overId);
  if (overParent === currentParent) {
    const children = nodes[currentParent].children;
    const oldIndex = children.indexOf(activeId);
    const newIndex = children.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return null;
    return {
      kind: "reorder",
      id: activeId,
      refId: overId,
      side: oldIndex < newIndex ? "after" : "before",
    };
  }

  const overIsContainer = Boolean(getComponentDef(nodes[overId]?.type ?? "")?.isContainer);
  if (
    overIsContainer &&
    overId !== currentParent &&
    !subtreeIds(nodes, activeId).includes(overId)
  ) {
    return { kind: "reparent", id: activeId, parentId: overId };
  }

  return null;
}
