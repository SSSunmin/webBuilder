---
type: Reference
title: 데이터 모델 — PageDocument / PageNode
description: 저장 단위인 PageDocument와 노드 트리를 구성하는 PageNode, NodeFrame, Sides, NodeOverride, EventBinding 타입 정의.
resource: src/types/page.ts, src/types/events.ts, src/types/component.ts
tags: [data-model, types, page, node]
timestamp: 2026-06-22
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
  };
}
```

- `nodes`는 id를 키로 하는 **정규화 맵**. 부모-자식 관계는 `PageNode.children` 배열(id 목록)로만 연결한다.
- 루트 노드는 항상 `"Layout"` 타입으로 생성된다 (`createDocument()` 참조).

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
  background?: string;   // CSS 색상 문자열
  borderRadius?: number; // px
  boxShadow?: ShadowSpec; // 픽셀 그림자 {x,y,blur,spread,color,opacity}; 없음=undefined
  padding?: Sides;       // 내부 패딩 (children snap 기준)
  margin?: Sides;        // 외부 마진 (siblings snap 시 간격 확보)
  overrides?: Partial<Record<Exclude<BreakpointId, "desktop">, NodeOverride>>;
  events?: EventBinding[];
}
```

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

`toSides(v)` 헬퍼가 `number | Sides | undefined | null`을 `Sides`로 정규화한다.

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
}
```

- `desktop`은 항상 기준(base); `overrides` 맵에 `desktop` 키는 존재하지 않는다.
- `resolveFrame(node, bp)`: desktop → tablet → mobile 캐스케이드로 최종 frame을 계산.
- `resolveHidden(node, bp)`: 동일 캐스케이드로 hidden 상태를 계산.

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
