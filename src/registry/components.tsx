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
const HEADING_LEVEL: Record<string, string> = {
  h1: "text-3xl font-bold tracking-tight",
  h2: "text-2xl font-bold tracking-tight",
  h3: "text-xl font-semibold tracking-tight",
};
const BUTTON_VARIANT: Record<string, string> = {
  primary: "bg-brand text-white shadow-card hover:bg-brand-dark",
  ghost: "bg-transparent text-brand border border-brand-lightest hover:bg-brand-pale",
  soft: "bg-brand-pale text-brand hover:bg-brand-lightest",
};

/** Full-size container box; children are absolutely positioned within. */
function containerBox(children: ReactNode, className = ""): ReactNode {
  return <div className={`relative h-full w-full ${className}`}>{children}</div>;
}

function attr(key: string, value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  return typeof value === "string"
    ? ` ${key}="${value}"`
    : ` ${key}={${JSON.stringify(value)}}`;
}

const definitions: ComponentDef[] = [
  // ---------- 레이아웃 ----------
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
    type: "Card",
    label: "Card",
    category: "레이아웃",
    isContainer: true,
    defaultSize: { w: 280, h: 180 },
    defaultBackground: "#ffffff",
    props: [],
    render: (_props, children) =>
      containerBox(children, "rounded-card border border-line shadow-card"),
    toCode: (_node, childrenCode) => `<Card>\n${childrenCode}\n</Card>`,
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
        <span className="text-lg font-bold tracking-tight text-ink">
          {s(props.title, "제목")}
        </span>
        {s(props.subtitle) && (
          <span className="mt-0.5 text-sm text-muted">{s(props.subtitle)}</span>
        )}
      </div>
    ),
    toCode: (node) =>
      `<Header${attr("title", node.props.title)}${attr("subtitle", node.props.subtitle)} />`,
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

  // ---------- 콘텐츠 ----------
  {
    type: "Heading",
    label: "Heading",
    category: "콘텐츠",
    isContainer: false,
    defaultSize: { w: 420, h: 48 },
    props: [
      { key: "content", label: "내용", control: "text", default: "데이터로 판단의 기준을 만듭니다" },
      { key: "level", label: "레벨", control: "select", options: ["h1", "h2", "h3"], default: "h1" },
    ],
    render: (props) => (
      <div
        className={`flex h-full w-full items-center text-ink ${
          HEADING_LEVEL[s(props.level, "h1")] ?? HEADING_LEVEL.h1
        }`}
      >
        {s(props.content, "제목")}
      </div>
    ),
    toCode: (node) =>
      `<Heading${attr("level", node.props.level)}>${s(node.props.content, "제목")}</Heading>`,
  },
  {
    type: "Text",
    label: "Text",
    category: "콘텐츠",
    isContainer: false,
    defaultSize: { w: 240, h: 28 },
    props: [
      { key: "content", label: "내용", control: "text", default: "텍스트" },
      { key: "size", label: "크기", control: "select", options: ["sm", "base", "lg", "xl"], default: "base" },
      { key: "weight", label: "굵기", control: "select", options: ["normal", "medium", "semibold", "bold"], default: "normal" },
    ],
    render: (props) => (
      <div
        className={`flex h-full w-full items-center ${
          TEXT_SIZE[s(props.size, "base")] ?? "text-base"
        } ${TEXT_WEIGHT[s(props.weight, "normal")] ?? "font-normal"} text-ink2`}
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
    type: "Button",
    label: "Button",
    category: "콘텐츠",
    isContainer: false,
    defaultSize: { w: 132, h: 44 },
    props: [
      { key: "text", label: "텍스트", control: "text", default: "무료로 체험하기" },
      { key: "variant", label: "스타일", control: "select", options: ["primary", "ghost", "soft"], default: "primary" },
    ],
    render: (props) => (
      <button
        className={`h-full w-full rounded-button px-4 text-sm font-semibold transition ${
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
    type: "Link",
    label: "Link",
    category: "콘텐츠",
    isContainer: false,
    defaultSize: { w: 120, h: 24 },
    props: [
      { key: "text", label: "텍스트", control: "text", default: "자세히 보기" },
      { key: "href", label: "링크", control: "text", default: "#" },
    ],
    render: (props) => (
      <span className="flex h-full w-full items-center text-sm font-semibold text-brand underline-offset-4 hover:underline">
        {s(props.text, "링크")}
      </span>
    ),
    toCode: (node) =>
      `<a${attr("href", node.props.href)}>${s(node.props.text, "링크")}</a>`,
  },
  {
    type: "Badge",
    label: "Badge",
    category: "콘텐츠",
    isContainer: false,
    defaultSize: { w: 72, h: 24 },
    props: [
      { key: "text", label: "텍스트", control: "text", default: "NEW" },
      { key: "tone", label: "톤", control: "select", options: ["brand", "accent", "muted"], default: "brand" },
    ],
    render: (props) => {
      const tone = s(props.tone, "brand");
      const cls =
        tone === "accent"
          ? "bg-accent/10 text-accent"
          : tone === "muted"
            ? "bg-line2 text-muted"
            : "bg-brand-pale text-brand";
      return (
        <span
          className={`flex h-full w-full items-center justify-center rounded-pill px-3 text-xs font-semibold ${cls}`}
        >
          {s(props.text, "NEW")}
        </span>
      );
    },
    toCode: (node) =>
      `<Badge${attr("tone", node.props.tone)}>${s(node.props.text, "NEW")}</Badge>`,
  },
  {
    type: "Stat",
    label: "Stat",
    category: "콘텐츠",
    isContainer: false,
    defaultSize: { w: 180, h: 96 },
    defaultBackground: "#ffffff",
    props: [
      { key: "value", label: "값", control: "text", default: "1,234" },
      { key: "label", label: "라벨", control: "text", default: "분석 건수" },
    ],
    render: (props) => (
      <div className="flex h-full w-full flex-col justify-center px-4">
        <span className="text-2xl font-bold tracking-tight text-brand">
          {s(props.value, "0")}
        </span>
        <span className="mt-1 text-xs font-medium text-muted">
          {s(props.label, "지표")}
        </span>
      </div>
    ),
    toCode: (node) =>
      `<Stat${attr("value", node.props.value)}${attr("label", node.props.label)} />`,
  },
  {
    type: "Image",
    label: "Image",
    category: "콘텐츠",
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
  {
    type: "Divider",
    label: "Divider",
    category: "콘텐츠",
    isContainer: false,
    defaultSize: { w: 240, h: 12 },
    props: [],
    render: () => (
      <div className="flex h-full w-full items-center">
        <div className="h-px w-full bg-line" />
      </div>
    ),
    toCode: () => `<Divider />`,
  },

  // ---------- 폼 ----------
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
    defaultSize: { w: 240, h: 44 },
    defaultBackground: "#ffffff",
    props: [
      { key: "placeholder", label: "플레이스홀더", control: "text", default: "입력하세요" },
      { key: "type", label: "타입", control: "select", options: ["text", "email", "password", "number"], default: "text" },
    ],
    render: (props) => (
      <input
        type={s(props.type, "text")}
        placeholder={s(props.placeholder)}
        readOnly
        className="h-full w-full rounded-button border border-line bg-white px-3 text-sm text-ink2 outline-none focus:border-brand"
      />
    ),
    toCode: (node) =>
      `<Input${attr("type", node.props.type)}${attr("placeholder", node.props.placeholder)} />`,
  },
];

export const componentDefs = definitions;
