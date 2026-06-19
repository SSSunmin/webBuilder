import type { NodeFrame } from "../types/page";

/** A child node placed inside a block's wrapping section. */
export interface BlockChildSpec {
  type: string;
  /** Frame relative to the section's box (children are absolutely positioned). */
  frame: NodeFrame;
  /** Prop overrides merged onto the component's schema defaults. */
  props?: Record<string, unknown>;
  background?: string;
  borderRadius?: number;
}

/**
 * A composable preset: dropping a block inserts a wrapping container (section)
 * holding ordinary child nodes, so every piece stays individually editable and
 * more components can be added/removed afterwards.
 */
export interface BlockDef {
  key: string;
  label: string;
  category: string;
  /** The wrapping container node. */
  section: {
    type: string;
    size: { w: number; h: number };
    background?: string;
    props?: Record<string, unknown>;
  };
  children: BlockChildSpec[];
}

const definitions: BlockDef[] = [
  {
    key: "header",
    label: "Header",
    category: "블록",
    section: { type: "Section", size: { w: 960, h: 72 }, background: "#ffffff" },
    children: [
      {
        type: "Heading",
        frame: { x: 24, y: 8, w: 320, h: 32 },
        props: { content: "BigValue", level: "h3" },
      },
      {
        type: "Text",
        frame: { x: 24, y: 42, w: 420, h: 20 },
        props: { content: "데이터로 판단의 기준을 만듭니다", size: "sm" },
      },
    ],
  },
  {
    key: "hero",
    label: "Hero",
    category: "블록",
    section: { type: "Section", size: { w: 960, h: 360 }, background: "#ecebfc" },
    children: [
      {
        type: "Badge",
        frame: { x: 410, y: 64, w: 140, h: 28 },
        props: { text: "AI 부동산 분석", tone: "brand" },
      },
      {
        type: "Heading",
        frame: { x: 180, y: 120, w: 600, h: 48 },
        props: { content: "데이터로 판단의 기준을 만듭니다", level: "h1" },
      },
      {
        type: "Text",
        frame: { x: 230, y: 184, w: 500, h: 28 },
        props: { content: "신뢰 가능한 데이터로 더 빠른 의사결정을.", size: "lg" },
      },
      {
        type: "Button",
        frame: { x: 410, y: 240, w: 140, h: 44 },
        props: { text: "무료로 체험하기", variant: "primary" },
      },
    ],
  },
  {
    key: "footer",
    label: "Footer",
    category: "블록",
    section: { type: "Section", size: { w: 960, h: 88 }, background: "#25252f" },
    children: [
      {
        type: "Text",
        frame: { x: 24, y: 34, w: 320, h: 20 },
        props: { content: "© BigValue", size: "sm", color: "#ffffff" },
      },
      {
        type: "Text",
        frame: { x: 560, y: 34, w: 376, h: 20 },
        props: { content: "이용약관 · 개인정보처리방침 · 문의", size: "sm", color: "#cbd5e1" },
      },
    ],
  },
];

export const blockDefs = definitions;

/** All registered blocks (palette order). */
export function listBlocks(): BlockDef[] {
  return blockDefs;
}

/** Look up a block by key. Returns undefined if unknown. */
export function getBlockDef(key: string): BlockDef | undefined {
  return blockDefs.find((b) => b.key === key);
}
