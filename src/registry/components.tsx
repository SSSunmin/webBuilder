import type { ReactNode } from "react";
import type { ComponentDef } from "../types/component";
import type { PageNode } from "../types/page";

// --- prop readers (props values are typed as unknown) ---
const s = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const num = (v: unknown, d = 0): number => (typeof v === "number" ? v : d);
const list = (v: unknown): string[] =>
  s(v)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

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
    defaultBorderRadius: 14,
    props: [],
    render: (_props, children) =>
      containerBox(children, "rounded-[inherit] border border-line shadow-card"),
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
    type: "Navbar",
    label: "Navbar",
    category: "레이아웃",
    isContainer: false,
    defaultSize: { w: 960, h: 60 },
    defaultBackground: "#ffffff",
    props: [
      { key: "brand", label: "브랜드", control: "text", default: "BigValue" },
      { key: "links", label: "메뉴(쉼표)", control: "text", default: "기능,요금,문의" },
    ],
    render: (props) => (
      <div className="flex h-full w-full items-center justify-between border-b border-line px-5">
        <span className="text-base font-bold tracking-tight text-brand">
          {s(props.brand, "Brand")}
        </span>
        <div className="flex items-center gap-5 text-sm font-medium text-ink2">
          {list(props.links).map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      </div>
    ),
    toCode: (node) =>
      `<Navbar${attr("brand", node.props.brand)}${attr("links", node.props.links)} />`,
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
    type: "Hero",
    label: "Hero",
    category: "레이아웃",
    isContainer: false,
    defaultSize: { w: 960, h: 360 },
    defaultBackground: "#ecebfc",
    props: [
      { key: "eyebrow", label: "상단 라벨", control: "text", default: "AI 부동산 분석" },
      { key: "title", label: "제목", control: "text", default: "데이터로 판단의 기준을 만듭니다" },
      { key: "subtitle", label: "부제목", control: "text", default: "신뢰 가능한 데이터로 더 빠른 의사결정을." },
      { key: "cta", label: "버튼", control: "text", default: "무료로 체험하기" },
    ],
    render: (props) => (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-8 text-center">
        {s(props.eyebrow) && (
          <span className="rounded-pill bg-white/70 px-3 py-1 text-xs font-semibold text-brand">
            {s(props.eyebrow)}
          </span>
        )}
        <span className="text-3xl font-bold tracking-tight text-ink">
          {s(props.title, "제목")}
        </span>
        {s(props.subtitle) && (
          <span className="text-base text-muted">{s(props.subtitle)}</span>
        )}
        <span className="mt-2 rounded-button bg-brand px-5 py-2 text-sm font-semibold text-white shadow-card">
          {s(props.cta, "버튼")}
        </span>
      </div>
    ),
    toCode: (node) =>
      `<Hero${attr("eyebrow", node.props.eyebrow)}${attr("title", node.props.title)}${attr(
        "subtitle",
        node.props.subtitle,
      )}${attr("cta", node.props.cta)} />`,
  },
  {
    type: "Footer",
    label: "Footer",
    category: "레이아웃",
    isContainer: false,
    defaultSize: { w: 960, h: 80 },
    defaultBackground: "#25252f",
    props: [{ key: "text", label: "텍스트", control: "text", default: "© BigValue" }],
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
    toCode: (node) => `<a${attr("href", node.props.href)}>${s(node.props.text, "링크")}</a>`,
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
    toCode: (node) => `<Badge${attr("tone", node.props.tone)}>${s(node.props.text, "NEW")}</Badge>`,
  },
  {
    type: "Avatar",
    label: "Avatar",
    category: "콘텐츠",
    isContainer: false,
    defaultSize: { w: 48, h: 48 },
    props: [
      { key: "src", label: "이미지 URL", control: "text", default: "" },
      { key: "initials", label: "이니셜", control: "text", default: "BV" },
    ],
    render: (props) => {
      const src = s(props.src);
      return src ? (
        <img src={src} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-brand-pale text-sm font-bold text-brand">
          {s(props.initials, "BV")}
        </div>
      );
    },
    toCode: (node) =>
      `<Avatar${attr("src", node.props.src)}${attr("initials", node.props.initials)} />`,
  },
  {
    type: "TagList",
    label: "TagList",
    category: "콘텐츠",
    isContainer: false,
    defaultSize: { w: 260, h: 28 },
    props: [
      { key: "tags", label: "태그(쉼표)", control: "text", default: "데이터,분석,부동산" },
    ],
    render: (props) => (
      <div className="flex h-full w-full flex-wrap items-center gap-2">
        {list(props.tags).map((t, i) => (
          <span
            key={i}
            className="rounded-pill bg-brand-pale px-2.5 py-0.5 text-xs font-semibold text-brand"
          >
            {t}
          </span>
        ))}
      </div>
    ),
    toCode: (node) => `<TagList${attr("tags", node.props.tags)} />`,
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

  // ---------- 데이터 ----------
  {
    type: "Stat",
    label: "Stat",
    category: "데이터",
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
        <span className="mt-1 text-xs font-medium text-muted">{s(props.label, "지표")}</span>
      </div>
    ),
    toCode: (node) =>
      `<Stat${attr("value", node.props.value)}${attr("label", node.props.label)} />`,
  },
  {
    type: "ProgressBar",
    label: "ProgressBar",
    category: "데이터",
    isContainer: false,
    defaultSize: { w: 240, h: 12 },
    props: [{ key: "value", label: "진행률(%)", control: "number", default: 60 }],
    render: (props) => {
      const pct = Math.max(0, Math.min(100, num(props.value, 0)));
      return (
        <div className="flex h-full w-full items-center">
          <div className="h-2 w-full overflow-hidden rounded-pill bg-line2">
            <div className="h-full rounded-pill bg-brand" style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    },
    toCode: (node) => `<ProgressBar value={${num(node.props.value, 0)}} />`,
  },
  {
    type: "Chart",
    label: "Chart",
    category: "데이터",
    isContainer: false,
    defaultSize: { w: 260, h: 160 },
    defaultBackground: "#ffffff",
    props: [{ key: "title", label: "제목", control: "text", default: "월별 추이" }],
    render: (props) => {
      const bars = [40, 65, 50, 80, 60, 95];
      return (
        <div className="flex h-full w-full flex-col p-3">
          <span className="text-xs font-semibold text-ink2">{s(props.title, "차트")}</span>
          <div className="mt-2 flex flex-1 items-end gap-1.5">
            {bars.map((b, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-brand-lighter"
                style={{ height: `${b}%` }}
              />
            ))}
          </div>
        </div>
      );
    },
    toCode: (node) => `<Chart${attr("title", node.props.title)} />`,
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
