import type { CSSProperties, ReactNode } from "react";
import type { ComponentDef } from "../types/component";
import type { PageNode } from "../types/page";

// --- prop readers (props values are typed as unknown) ---
const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const n = (v: unknown, d = 0): number => (typeof v === "number" ? v : d);
const b = (v: unknown, d = false): boolean => (typeof v === "boolean" ? v : d);

/** Serialize a node's props into a JSX attribute string for code export. */
function formatAttrs(node: PageNode, def: ComponentDef): string {
  const parts: string[] = [];
  for (const schema of def.props) {
    if (schema.key === "content" || schema.key === "text") continue; // rendered as children
    const value = node.props[schema.key];
    if (value === undefined || value === "" || value === null) continue;
    if (typeof value === "string") {
      parts.push(`${schema.key}="${value}"`);
    } else {
      parts.push(`${schema.key}={${JSON.stringify(value)}}`);
    }
  }
  return parts.length ? " " + parts.join(" ") : "";
}

const placeholder: ReactNode = (
  <span className="text-xs text-muted">빈 컨테이너 — 컴포넌트를 드롭하세요</span>
);

const TEXT_SIZE: Record<string, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};
const TEXT_WEIGHT: Record<string, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};
const BUTTON_VARIANT: Record<string, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  ghost: "bg-transparent text-brand border border-brand-lightest hover:bg-brand-pale",
  soft: "bg-brand-pale text-brand hover:bg-brand-lightest",
};

const definitions: ComponentDef[] = [
  {
    type: "Layout",
    label: "Layout",
    category: "레이아웃",
    isContainer: true,
    props: [
      { key: "direction", label: "방향", control: "select", options: ["column", "row"], default: "column" },
      { key: "gap", label: "간격(px)", control: "number", default: 12 },
      { key: "padding", label: "패딩(px)", control: "number", default: 16 },
      { key: "background", label: "배경", control: "color", default: "#ffffff" },
    ],
    render: (props, children) => {
      const style: CSSProperties = {
        display: "flex",
        flexDirection: s(props.direction, "column") as "row" | "column",
        gap: n(props.gap, 12),
        padding: n(props.padding, 16),
        background: s(props.background, "#ffffff"),
      };
      return (
        <div className="rounded-card border border-dashed border-line" style={style}>
          {children ?? placeholder}
        </div>
      );
    },
    toCode: (node, childrenCode) =>
      `<Layout${formatAttrs(node, definitions[0])}>\n${childrenCode}\n</Layout>`,
  },
  {
    type: "Header",
    label: "Header",
    category: "레이아웃",
    isContainer: false,
    props: [
      { key: "title", label: "제목", control: "text", default: "제목" },
      { key: "subtitle", label: "부제목", control: "text", default: "" },
    ],
    render: (props) => (
      <header className="border-b border-line pb-3">
        <h2 className="text-lg font-semibold text-ink">{s(props.title, "제목")}</h2>
        {s(props.subtitle) && (
          <p className="mt-1 text-sm text-muted">{s(props.subtitle)}</p>
        )}
      </header>
    ),
    toCode: (node) => {
      const subtitle = s(node.props.subtitle);
      return subtitle
        ? `<Header title="${s(node.props.title)}" subtitle="${subtitle}" />`
        : `<Header title="${s(node.props.title)}" />`;
    },
  },
  {
    type: "Sidebar",
    label: "Sidebar",
    category: "레이아웃",
    isContainer: true,
    props: [
      { key: "width", label: "너비(px)", control: "number", default: 240 },
      { key: "background", label: "배경", control: "color", default: "#f4f6fb" },
    ],
    render: (props, children) => (
      <aside
        className="rounded-card border border-dashed border-line p-3"
        style={{ width: n(props.width, 240), background: s(props.background, "#f4f6fb") }}
      >
        {children ?? placeholder}
      </aside>
    ),
    toCode: (node, childrenCode) =>
      `<Sidebar${formatAttrs(node, definitions[2])}>\n${childrenCode}\n</Sidebar>`,
  },
  {
    type: "Form",
    label: "Form",
    category: "폼",
    isContainer: true,
    props: [
      { key: "gap", label: "간격(px)", control: "number", default: 12 },
    ],
    render: (props, children) => (
      <form
        className="rounded-card border border-dashed border-line p-3"
        style={{ display: "flex", flexDirection: "column", gap: n(props.gap, 12) }}
        onSubmit={(e) => e.preventDefault()}
      >
        {children ?? placeholder}
      </form>
    ),
    toCode: (node, childrenCode) =>
      `<Form${formatAttrs(node, definitions[3])}>\n${childrenCode}\n</Form>`,
  },
  {
    type: "Input",
    label: "Input",
    category: "폼",
    isContainer: false,
    props: [
      { key: "label", label: "라벨", control: "text", default: "라벨" },
      { key: "placeholder", label: "플레이스홀더", control: "text", default: "입력하세요" },
      { key: "type", label: "타입", control: "select", options: ["text", "email", "password", "number"], default: "text" },
    ],
    render: (props) => (
      <label className="flex flex-col gap-1">
        {s(props.label) && <span className="text-sm text-ink2">{s(props.label)}</span>}
        <input
          type={s(props.type, "text")}
          placeholder={s(props.placeholder)}
          className="h-9 rounded-button border border-line px-3 text-sm"
        />
      </label>
    ),
    toCode: (node) =>
      `<Input label="${s(node.props.label)}" type="${s(node.props.type, "text")}" placeholder="${s(node.props.placeholder)}" />`,
  },
  {
    type: "Button",
    label: "Button",
    category: "기본",
    isContainer: false,
    props: [
      { key: "text", label: "텍스트", control: "text", default: "버튼" },
      { key: "variant", label: "스타일", control: "select", options: ["primary", "ghost", "soft"], default: "primary" },
    ],
    render: (props) => {
      const variant = s(props.variant, "primary");
      return (
        <button
          className={`h-9 rounded-button px-4 text-sm font-semibold transition ${
            BUTTON_VARIANT[variant] ?? BUTTON_VARIANT.primary
          }`}
        >
          {s(props.text, "버튼")}
        </button>
      );
    },
    toCode: (node) =>
      `<Button variant="${s(node.props.variant, "primary")}">${s(node.props.text, "버튼")}</Button>`,
  },
  {
    type: "Text",
    label: "Text",
    category: "기본",
    isContainer: false,
    props: [
      { key: "content", label: "내용", control: "text", default: "텍스트" },
      { key: "size", label: "크기", control: "select", options: ["sm", "base", "lg", "xl"], default: "base" },
      { key: "weight", label: "굵기", control: "select", options: ["normal", "medium", "semibold", "bold"], default: "normal" },
    ],
    render: (props) => (
      <p
        className={`${TEXT_SIZE[s(props.size, "base")] ?? "text-base"} ${
          TEXT_WEIGHT[s(props.weight, "normal")] ?? "font-normal"
        } text-ink`}
      >
        {s(props.content, "텍스트")}
      </p>
    ),
    toCode: (node) => {
      const cls = `${s(node.props.size, "base")} ${s(node.props.weight, "normal")}`;
      return `<Text className="${cls.trim()}">${s(node.props.content, "텍스트")}</Text>`;
    },
  },
  {
    type: "Image",
    label: "Image",
    category: "기본",
    isContainer: false,
    props: [
      { key: "src", label: "이미지 URL", control: "text", default: "" },
      { key: "alt", label: "대체 텍스트", control: "text", default: "" },
      { key: "radius", label: "라운드(px)", control: "number", default: 8 },
    ],
    render: (props) => {
      const src = s(props.src);
      const radius = n(props.radius, 8);
      return src ? (
        <img src={src} alt={s(props.alt)} style={{ borderRadius: radius, maxWidth: "100%" }} />
      ) : (
        <div
          className="flex h-24 items-center justify-center bg-line2 text-xs text-muted"
          style={{ borderRadius: radius }}
        >
          이미지 없음
        </div>
      );
    },
    toCode: (node) =>
      `<Image src="${s(node.props.src)}" alt="${s(node.props.alt)}" />`,
  },
];

export const componentDefs = definitions;
