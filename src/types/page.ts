export interface NodeFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PageNode {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children: string[];
  /** Absolute position/size within the parent's box. */
  frame: NodeFrame;
  /** Optional background color (CSS color). */
  background?: string;
  /** Inner padding (px) — children snap to the padded inner area. */
  padding?: number;
  /** Outer margin (px) — siblings keep this gap when snapping to this node. */
  margin?: number;
}

export interface PageDocument {
  id: string;
  version: 1;
  rootId: string;
  nodes: Record<string, PageNode>;
  meta: {
    name: string;
    createdAt: string;
    updatedAt: string;
    thumbnail?: string;
  };
}

export interface PageMeta {
  id: string;
  name: string;
  updatedAt: string;
}
