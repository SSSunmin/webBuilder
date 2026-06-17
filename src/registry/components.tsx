import type { ReactNode } from "react";
import type { ComponentDef } from "../types/component";
import type { PageNode } from "../types/page";

// --- prop readers (props values are typed as unknown) ---
const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);

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
  primary: "bg-brand text-white",
  ghost: "bg-transparent text-brand border border-brand-lightest",
  soft: "bg-brand-pale text-brand",
};

/** Full-size container box; children are absolutely positioned within. */
function containerBox(children: ReactNode): ReactNode {
  return <div className="relative h-full w-full">{children}</div>;
}

function attr(key: string, value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  return typeof value === "string"
    ? ` ${key}="${value}"`
    : ` ${key}={${JSON.stringify(value)}}`;
}

const definitions: ComponentDef[] = [
  {
    type: "Layout",
    label: "Layout",
    category: "레이아웃",
    isContainer: true,
    defaultSize: { w: 960, h: 600 },
    defaultBackground: "#ffffff",
    props: [],
    render: (_props, children) => containerBox(children),
    toCode: (_node, childrenCode) => `<Layout>\n${childrenCode}\n</Layout>`,
  },
  {
    type: "Header",
    label: "Header",
    category: "레이아웃",
    isContainer: false,
    defaultSize: { w: 960, h: 64 },
    defaultBackground: "#ffffff",
    props: [
      { key: "title", label: "제목", control: "text", default: "제목" },
      { key: "subtitle", label: "부제목", control: "text", default: "" },
    ],
    render: (props) => (
      <div className="flex h-full w-full flex-col justify-center px-4">
        <span className="text-lg font-semibold text-ink">{s(props.title, "제목")}</span>
        {s(props.subtitle) && (
          <span className="mt-0.5 text-sm text-muted">{s(props.subtitle)}</span>
        )}
      </div>
    ),
    toCode: (node) =>
      `<Header${attr("title", node.props.title)}${attr("subtitle", node.props.subtitle)} />`,
  },
  {
    type: "Sidebar",
    label: "Sidebar",
    category: "레이아웃",
    isContainer: true,
    defaultSize: { w: 240, h: 480 },
    defaultBackground: "#f4f6fb",
    props: [],
    render: (_props, children) => containerBox(children),
    toCode: (_node, childrenCode) => `<Sidebar>\n${childrenCode}\n</Sidebar>`,
  },
  {
    type: "Footer",
    label: "Footer",
    category: "레이아웃",
    isContainer: false,
    defaultSize: { w: 960, h: 80 },
    defaultBackground: "#25252f",
    props: [
      { key: "text", label: "텍스트", control: "text", default: "© BigValue" },
    ],
    render: (props) => (
      <div className="flex h-full w-full items-center px-4 text-sm text-white/80">
        {s(props.text, "© BigValue")}
      </div>
    ),
    toCode: (node) => `<Footer>${s(node.props.text, "© BigValue")}</Footer>`,
  },
  {
    type: "Form",
    label: "Form",
    category: "폼",
    isContainer: true,
    defaultSize: { w: 320, h: 240 },
    defaultBackground: "#ffffff",
    props: [],
    render: (_props, children) => containerBox(children),
    toCode: (_node, childrenCode) => `<Form>\n${childrenCode}\n</Form>`,
  },
  {
    type: "Input",
    label: "Input",
    category: "폼",
    isContainer: false,
    defaultSize: { w: 240, h: 40 },
    props: [
      { key: "placeholder", label: "플레이스홀더", control: "text", default: "입력하세요" },
      { key: "type", label: "타입", control: "select", options: ["text", "email", "password", "number"], default: "text" },
    ],
    render: (props) => (
      <input
        type={s(props.type, "text")}
        placeholder={s(props.placeholder)}
        readOnly
        className="h-full w-full rounded-button border border-line bg-white px-3 text-sm"
      />
    ),
    toCode: (node) =>
      `<Input${attr("type", node.props.type)}${attr("placeholder", node.props.placeholder)} />`,
  },
  {
    type: "Button",
    label: "Button",
    category: "기본",
    isContainer: false,
    defaultSize: { w: 120, h: 40 },
    props: [
      { key: "text", label: "텍스트", control: "text", default: "버튼" },
      { key: "variant", label: "스타일", control: "select", options: ["primary", "ghost", "soft"], default: "primary" },
    ],
    render: (props) => (
      <button
        className={`h-full w-full rounded-button px-4 text-sm font-semibold ${
          BUTTON_VARIANT[s(props.variant, "primary")] ?? BUTTON_VARIANT.primary
        }`}
      >
        {s(props.text, "버튼")}
      </button>
    ),
    toCode: (node) =>
      `<Button${attr("variant", node.props.variant)}>${s(node.props.text, "버튼")}</Button>`,
  },
  {
    type: "Text",
    label: "Text",
    category: "기본",
    isContainer: false,
    defaultSize: { w: 200, h: 28 },
    props: [
      { key: "content", label: "내용", control: "text", default: "텍스트" },
      { key: "size", label: "크기", control: "select", options: ["sm", "base", "lg", "xl"], default: "base" },
      { key: "weight", label: "굵기", control: "select", options: ["normal", "medium", "semibold", "bold"], default: "normal" },
    ],
    render: (props) => (
      <div
        className={`flex h-full w-full items-center ${
          TEXT_SIZE[s(props.size, "base")] ?? "text-base"
        } ${TEXT_WEIGHT[s(props.weight, "normal")] ?? "font-normal"} text-ink`}
      >
        {s(props.content, "텍스트")}
      </div>
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
    defaultSize: { w: 200, h: 150 },
    props: [
      { key: "src", label: "이미지 URL", control: "text", default: "" },
      { key: "alt", label: "대체 텍스트", control: "text", default: "" },
    ],
    render: (props) => {
      const src = s(props.src);
      return src ? (
        <img src={src} alt={s(props.alt)} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-line2 text-xs text-muted">
          이미지 없음
        </div>
      );
    },
    toCode: (node) =>
      `<Image${attr("src", node.props.src)}${attr("alt", node.props.alt)} />`,
  },
];

export const componentDefs = definitions;
