---
type: Reference
title: 데이터 모델 — PageDocument / PageNode
description: 저장 단위인 PageDocument와 노드 트리를 구성하는 PageNode, NodeFrame, Sides, DocumentTokens, NodeOverride, EventBinding 타입 정의. v2에서 글꼴·간격 토큰 추가. v3(Stage A)에서 레이아웃 모드(flex) 추가. v4(Stage B1)에서 NodeOverride에 padding/margin 추가 및 resolvePadding/resolveMargin 신규. v5(Stage B2)에서 NodeOverride에 background 추가 및 resolveBackground 신규.
resource: src/types/page.ts, src/types/events.ts, src/types/component.ts
tags: [data-model, types, page, node, design-tokens, layout, flex, breakpoint, override, spacing, background]
timestamp: 2026-06-30
---

# 데이터 모델 — PageDocument / PageNode

모든 타입은 `src/types/page.ts`, `src/types/events.ts`, `src/types/component.ts`에서 확인된 실제 코드 기준이다.

## PageDocument — 저장 단위

```ts
interface PageDocument {
  id: string;          // crypto.randomUUID()
  version: 1;          // 고정값
  rootId: string;      // 루트 노드 id (항상 "Layout" 타입)
  nodes: Record<string, PageNode>;  // id → node (정규화 트리)
  meta: {
    name: string;
    createdAt: string; // ISO 8601
    updatedAt: string; // ISO 8601
    thumbnail?: string;
    tokens?: DocumentTokens; // 문서 전역 디자인 토큰 (v1: colors, v2: +fonts, +spacing)
  };
}
```

- `nodes`는 id를 키로 하는 **정규화 맵**. 부모-자식 관계는 `PageNode.children` 배열(id 목록)로만 연결한다.
- 루트 노드는 항상 `"Layout"` 타입으로 생성된다 (`createDocument()` 참조).
- `meta.tokens`는 선택 필드다 — 없으면 `undefined`이며 토큰 없는 문서와 완전 하위 호환.

## PageMeta — 홈 목록용 경량 메타

```ts
interface PageMeta {
  id: string;
  name: string;
  updatedAt: string;
  thumbnail?: string;  // SVG 와이어프레임 data URI (홈 카드 미리보기)
}
```

전체 `PageDocument`를 로드하지 않고 홈 카드를 렌더하기 위한 경량 구조. `LocalStorageAdapter`가 별도 인덱스 키(`webbuilder:index`)에 `PageMeta[]`를 직렬화한다. `thumbnail`은 `save()` 시 `generateThumbnail(doc)`으로 채워져 인덱스에도 함께 저장되므로, 카드가 문서 본문을 로드하지 않고 미리보기를 그릴 수 있다 — 생성 상세는 [/storage/storage-layer.md](/storage/storage-layer.md) 참조.

## PageNode — 트리 노드

```ts
interface PageNode {
  id: string;
  type: string;          // 레지스트리 키 (예: "Button", "Layout")
  props: Record<string, unknown>;
  children: string[];    // 자식 노드 id 배열 (isContainer=true 일 때만 채워짐)
  frame: NodeFrame;      // 부모 박스 기준 절대 좌표·크기
  background?: string;   // CSS 색상 문자열, 또는 `token:<key>` 색상 토큰 참조
  borderRadius?: number; // px
  boxShadow?: ShadowSpec; // 픽셀 그림자 {x,y,blur,spread,color,opacity}; 없음=undefined
  padding?: Sides | string; // 내부 패딩. Sides(명시적) 또는 `token:<key>` 간격 토큰 참조(균일 적용)
  margin?: Sides | string;  // 외부 마진. Sides(명시적) 또는 `token:<key>` 간격 토큰 참조(균일 적용)
  // --- 레이아웃 모드 (Stage A) ---
  layout?: LayoutMode;          // 자식 배치 모드. 없음 = "absolute"(기존 전 문서 하위호환)
  flexDirection?: "row" | "column"; // flex 방향. 기본 "row" (layout="flex"일 때만 유효)
  gap?: number;                 // flex 자식 간격(px). 기본 0 (layout="flex"일 때만 유효)
  alignItems?: FlowAlign;       // 교차축 정렬. 기본 "start" (layout="flex"일 때만 유효)
  justifyContent?: FlowJustify; // 주축 배분. 기본 "start" (layout="flex"일 때만 유효)
  overrides?: Partial<Record<Exclude<BreakpointId, "desktop">, NodeOverride>>;
  events?: EventBinding[];
}
```

토큰 참조(`token:<key>`)는 dangling(토큰이 삭제·미정의)이면 해당 속성을 무시한다(background → 배경 없음, padding/margin → 0). 지어낸 값으로 fallback하지 않는다.

## 레이아웃 모드 (flex) — Stage A

### 타입 정의

```ts
type LayoutMode = "absolute" | "flex";
type FlowAlign   = "start" | "center" | "end" | "stretch";   // 교차축
type FlowJustify = "start" | "center" | "end" | "between";   // 주축
```

- `layout` 필드가 없거나 `"absolute"`면 기존처럼 자식을 `frame.x/y`로 절대 배치한다. **기존 문서를 그대로 열어도 동작한다(하위호환).**
- `layout: "flex"`면 자식을 CSS flexbox로 흐름 배치한다. 자식의 `frame.x/y`는 무시되고 `frame.w/h`만 크기 힌트로 쓰인다.

### resolveFlow — enum → CSS 매핑

```ts
interface ResolvedFlow {
  flexDirection: "row" | "column";
  flexWrap: "wrap";        // 항상 wrap 고정
  gap: number;             // sanitizeSpacing(node.gap) — 유한 비음수 정수
  alignItems: string;      // CSS 키워드
  justifyContent: string;  // CSS 키워드
}

function resolveFlow(node: PageNode): ResolvedFlow | null
// layout !== "flex"면 null(절대배치 유지)
```

enum → CSS 키워드 매핑표:

| FlowAlign | CSS (alignItems) |
|---|---|
| start | flex-start |
| center | center |
| end | flex-end |
| stretch | stretch |

| FlowJustify | CSS (justifyContent) |
|---|---|
| start | flex-start |
| center | center |
| end | flex-end |
| between | space-between |

알 수 없는 enum 값(외부 JSON 등)은 `flex-start`로 폴백한다 — CSS 인젝션 불가.

### 신뢰경계 (A03)

- **gap**: `sanitizeSpacing(node.gap)`으로 유한 비음수 정수만 허용. NaN/무한/음수/비number → 0.
- **enum 폴백**: `ALIGN_CSS[v] ?? "flex-start"`, `JUSTIFY_CSS[v] ?? "flex-start"` — 알 수 없는 enum 값이 CSS에 그대로 주입되지 않는다.
- `flexWrap`은 코드에서 `"wrap"` 리터럴로 고정(사용자 입력 경로 없음).

## ShadowSpec — 픽셀 그림자

```ts
interface ShadowSpec {
  x: number;       // X 오프셋(px)
  y: number;       // Y 오프셋(px)
  blur: number;    // 흐림(px, ≥0)
  spread: number;  // 확산(px)
  color: string;   // hex (#rgb/#rrggbb)
  opacity: number; // 0~1
}
```

프리셋(약/중/강)이 아니라 **픽셀 단위**로 직접 조절한다. `shadowCss(spec)`가 `"Xpx Ypx blurpx spreadpx rgba(r,g,b,a)"` CSS 값을 만든다(color hex → rgb, opacity → alpha). `DEFAULT_SHADOW`(0/4/12/0 #000000 0.15)는 그림자를 처음 켤 때 시작값. `undefined`면 그림자 없음. NodeView·`code.ts`·`spec.ts` 모두 `shadowCss`를 거친다.

## NodeFrame — 위치·크기

```ts
interface NodeFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}
```

모든 좌표는 **부모 컨테이너 박스 기준 절대 좌표(px)**다. 루트 노드는 `(0,0)` 고정.

## Sides — 상하좌우 값

```ts
interface Sides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const ZERO_SIDES: Sides = { top: 0, right: 0, bottom: 0, left: 0 };
```

`toSides(v, tokens?)` 헬퍼가 `Sides | number | string | undefined | null`을 `Sides`로 정규화한다.

```ts
function toSides(
  v: Sides | number | string | undefined | null,
  tokens?: DocumentTokens,
): Sides
```

- `null / undefined` → `ZERO_SIDES`
- `string` → `token:<key>` 간격 참조로 해석: `tokens.spacing[key]`를 `sanitizeSpacing`으로 검증 후 4면 균일 적용. dangling/unsafe → `ZERO_SIDES`
- `number` → 4면 균일 적용
- `Sides` → 그대로 반환 (각 면 `?? 0` 방어)

## DocumentTokens — 문서 전역 디자인 토큰

```ts
interface DocumentTokens {
  colors?:  Record<string, string>; // 이름 → CSS 색상 값 (v1)
  fonts?:   Record<string, string>; // 이름 → font-family 스택 (v2)
  spacing?: Record<string, number>; // 이름 → px 값 (v2)
}
```

`PageDocument.meta.tokens`에 보관된다. 세 카테고리 모두 선택 필드다.

### 토큰 참조 모델

노드가 토큰을 참조하는 방법은 **필드 네임스페이스**로 구분된다:

| 토큰 카테고리 | 참조 필드 | 센티넬 형태 | CSS 변수명 |
|---|---|---|---|
| colors | `node.background` | `token:<key>` | `--color-<key>` |
| spacing | `node.padding`, `node.margin` | `token:<key>` | `--space-<key>` |
| fonts | 노드별 참조 없음 | — | `--font-<key>` |

**글꼴 토큰**은 노드별 참조 방식이 없다. `body` 키의 font-family가 페이지 루트 노드에 `font-family: var(--font-body)`로 전역 적용되어 모든 텍스트 자식이 상속한다.

### 토큰 키 규칙

`isValidTokenKey(key)`: `/^[a-zA-Z][a-zA-Z0-9-]*$/` — 첫 글자 영문자, 이후 영문자·숫자·하이픈. CSS 식별자처럼 쓸 수 있도록 제한한다.

### 신뢰경계 (A03: CSS 인젝션 차단)

토큰 값은 사용자 입력이므로 CSS로 직접 방출될 때 아래 화이트리스트로 검증한다(코드 export 레이어 기준):

| 함수 | 허용 패턴 | 드롭 조건 |
|---|---|---|
| `sanitizeColor(v)` | hex, rgb/rgba/hsl/hsla 함수형, 단어 키워드 | 그 외 |
| `sanitizeFontFamily(v)` | `[a-zA-Z0-9 ,"'_-]+` | `; { } (` 등 포함 시 |
| `sanitizeSpacing(v)` | 유한한 비음수 number → 정수로 반올림 | NaN, 무한, 음수, 비number |

unsafe 값은 `:root` 선언과 `var()` 참조 **양쪽**에서 드롭된다.

## BreakpointId 및 BREAKPOINTS

```ts
type BreakpointId = "desktop" | "tablet" | "mobile";

const BREAKPOINTS: BreakpointDef[] = [
  { id: "desktop", label: "데스크탑", width: 1280 },
  { id: "tablet",  label: "태블릿",   width: 768  },
  { id: "mobile",  label: "모바일",   width: 375  },
];
```

## NodeOverride — 브레이크포인트별 오버라이드

```ts
interface NodeOverride {
  frame?: Partial<NodeFrame>;
  hidden?: boolean;
  padding?: Sides | string;   // Stage B1: 완전한 값(통째 교체, per-side 병합 아님)
  margin?: Sides | string;    // Stage B1: 완전한 값(통째 교체, per-side 병합 아님)
  background?: string;        // Stage B2: 리터럴 색상 또는 `token:<key>` 색상 토큰 참조
}
```

- `desktop`은 항상 기준(base); `overrides` 맵에 `desktop` 키는 존재하지 않는다.
- **frame vs padding/margin 병합 방식의 차이**:
  - `frame`은 `Partial<NodeFrame>` — 축별 부분 병합(예: `w`만 오버라이드하면 `x/y/h`는 base 상속).
  - `padding`·`margin`은 `Sides | string` — **완전한 값 통째 교체**. per-side 병합 없음. 오버라이드가 정의되면 base 전체를 대체한다.

### resolve 함수 — Stage B1/B2 신규

```ts
function resolvePadding(node: PageNode, bp: BreakpointId): Sides | string | undefined
function resolveMargin(node: PageNode, bp: BreakpointId): Sides | string | undefined
function resolveBackground(node: PageNode, bp: BreakpointId): string | undefined
```

세 함수 모두 **데스크톱-퍼스트 캐스케이드** 구조가 동일하다:

- **cascade 순서**: base(desktop) 값 → tablet override가 정의되면 통째 교체 → mobile override가 정의되면 통째 교체.
- **tablet → mobile 상속**: tablet에 override가 있고 mobile에 없으면 mobile은 tablet 값을 상속한다(CSS `@media max-width` cascade와 동일).
- `frame`처럼 축별 merge가 아니라 **정의된 override가 전체를 통째 치환**한다.
- 반환값은 raw 값. 호출부가 변환 함수를 적용한다:
  - `resolvePadding` / `resolveMargin`: 반환 `Sides | token ref | undefined`. 호출부가 `toSides(result, tokens)`로 `Sides`로 변환.
  - `resolveBackground`: 반환 `string | undefined` (리터럴 색상 또는 `token:<key>`). 호출부가 `resolveColor(result, tokens)`를 적용.
- `resolveFrame(node, bp)`: 축별 부분 병합으로 최종 frame 계산(기존 동작 유지).
- `resolveHidden(node, bp)`: 동일 캐스케이드로 hidden 상태 계산(기존 동작 유지).

## EventBinding — 이벤트·액션 바인딩

```ts
interface EventBinding {
  id: string;
  trigger: EventTrigger;  // "click" | "submit" | "change" | "hover"
  action: ActionType;     // "navigate" | "openUrl" | "submit" | "scrollTo" | "custom"
  target?: string;        // url / 경로 / anchor id / 자유 기술
}
```

`trigger` → React 이벤트 핸들러 prop 매핑 (`TRIGGER_PROP`):

| trigger | prop |
|---|---|
| click | onClick |
| submit | onSubmit |
| change | onChange |
| hover | onMouseEnter |

`action` → 핸들러 본문 (`actionBody(ev)`):

| action | 생성 코드 |
|---|---|
| navigate | `window.location.href = "<target>";` |
| openUrl | `window.open("<target>", "_blank");` |
| submit | `e.preventDefault(); /* TODO: submit to <target> */` |
| scrollTo | `document.querySelector("<target>")?.scrollIntoView(...)` |
| custom | `/* TODO: <target> */` |

## PropSchema / ComponentDef (요약)

```ts
interface PropSchema {
  key: string;
  label: string;
  control: "text" | "number" | "select" | "boolean" | "color" | "icon";
  options?: string[];  // select 전용 ("icon"은 icons.ts의 iconDefs 사용)
  default: unknown;
}

interface ComponentDef {
  type: string;
  label: string;
  category: string;
  isContainer: boolean;
  hidden?: boolean;           // 팔레트 숨김 (저장 문서 호환용)
  defaultSize: { w: number; h: number };
  defaultBackground?: string;
  defaultBorderRadius?: number;
  props: PropSchema[];
  render: (props, children?) => ReactNode;
  toCode: (node, childrenCode) => string;
}
```

상세 컴포넌트 목록은 [/registry/component-registry.md](/registry/component-registry.md) 참조.

# 관련 개념

- [/registry/component-registry.md](/registry/component-registry.md) — ComponentDef 전체 목록
- [/store/editor-store.md](/store/editor-store.md) — 노드를 조작하는 액션들
- [/responsive/breakpoints.md](/responsive/breakpoints.md) — override 캐스케이드 상세
- [/export/export-format.md](/export/export-format.md) — 이 타입을 MD로 직렬화하는 방식
- [/storage/storage-layer.md](/storage/storage-layer.md) — PageDocument 영속 방식
