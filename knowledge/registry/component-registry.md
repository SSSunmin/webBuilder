---
type: Reference
title: 컴포넌트 레지스트리
description: ComponentDef / BlockDef 구조, 등록된 컴포넌트·블록 전체 목록, 팔레트·인스펙터·Export가 공유하는 단일 소스.
resource: src/registry/index.ts, src/registry/components.tsx, src/registry/blocks.ts, src/registry/icons.ts
tags: [registry, component, block, palette, inspector, icon]
timestamp: 2026-06-22
---

# 컴포넌트 레지스트리

`src/registry/`는 팔레트(드롭 가능 목록), 인스펙터(자동 폼 생성), Export(`toCode` 호출)가 **모두 동일하게 참조하는 단일 소스**다.

## 공개 API (`src/registry/index.ts`)

| 함수 | 설명 |
|---|---|
| `listComponents()` | `hidden: true`를 제외한 팔레트 표시용 목록 |
| `getComponentDef(type)` | type 키로 ComponentDef 조회 (없으면 `undefined`) |
| `createNode(type, position?)` | 스키마 default값 + defaultFrame으로 PageNode 생성 (미등록 type은 throw) |
| `defaultFrameFor(type, position?)` | type의 defaultSize 기반 NodeFrame (기본 위치 `{x:16, y:16}`) |
| `listBlocks()` | 전체 BlockDef 목록 |
| `getBlockDef(key)` | key로 BlockDef 조회 |

## ComponentDef 구조

```ts
interface ComponentDef {
  type: string;
  label: string;
  category: string;
  isContainer: boolean;
  hidden?: boolean;           // true면 팔레트 숨김, 저장 문서 호환용으로 유지
  defaultSize: { w: number; h: number };
  defaultBackground?: string;
  defaultBorderRadius?: number;
  props: PropSchema[];
  render: (props, children?) => ReactNode;  // 캔버스 미리보기
  toCode: (node, childrenCode) => string;   // Export JSX 문자열
}
```

## 등록된 컴포넌트 목록

### 레이아웃 카테고리

| type | label | isContainer | defaultSize | 비고 |
|---|---|---|---|---|
| Layout | Layout | true | 960×600 | 루트 컨테이너, bg #ffffff |
| Card | Card | true | 280×180 | bg #ffffff, radius 14 |
| Section | Section | true | 960×200 | bg #ffffff |
| Sidebar | Sidebar | true | 240×480 | bg #f4f6fb |
| Navbar | Navbar | false | 960×60 | bg #ffffff, props: brand, links |
| Header | Header | false | 960×64 | **hidden=true** (Header 블록으로 대체) |
| Hero | Hero | false | 960×360 | **hidden=true** (Hero 블록으로 대체) |
| Footer | Footer | false | 960×80 | **hidden=true** (Footer 블록으로 대체) |

### 콘텐츠 카테고리

| type | label | isContainer | defaultSize | props 키 |
|---|---|---|---|---|
| Heading | Heading | false | 420×48 | content, level (h1/h2/h3) |
| Text | Text | false | 240×28 | content, size, weight, color |
| Button | Button | false | 132×44 | text, variant (primary/ghost/soft), icon, iconSize, hoverBg, hoverText |
| Link | Link | false | 120×24 | text, href |
| Badge | Badge | false | 72×24 | text, tone (brand/accent/muted) |
| Avatar | Avatar | false | 48×48 | src, initials |
| TagList | TagList | false | 260×28 | tags (쉼표 구분 문자열) |
| Image | Image | false | 200×150 | src, alt |
| Divider | Divider | false | 240×12 | (없음) |

### 데이터 카테고리

| type | label | isContainer | defaultSize | props 키 |
|---|---|---|---|---|
| Stat | Stat | false | 180×96 | value, label; bg #ffffff |
| ProgressBar | ProgressBar | false | 240×12 | value (0~100) |
| Chart | Chart | false | 260×160 | title; bg #ffffff; 바 고정값 [40,65,50,80,60,95] |

### 폼 카테고리

| type | label | isContainer | defaultSize | props 키 |
|---|---|---|---|---|
| Form | Form | true | 320×240 | (없음); bg #ffffff |
| Input | Input | false | 240×44 | placeholder, type (text/email/password/number); bg #ffffff |

## BlockDef 구조

```ts
interface BlockDef {
  key: string;
  label: string;
  category: string;
  section: {
    type: string;              // 반드시 isContainer=true인 type
    size: { w: number; h: number };
    background?: string;
    props?: Record<string, unknown>;
  };
  children: BlockChildSpec[];
}

interface BlockChildSpec {
  type: string;
  frame: NodeFrame;            // section 박스 기준 절대 좌표
  props?: Record<string, unknown>;
  background?: string;
  borderRadius?: number;
}
```

## 등록된 블록 목록

팔레트에서 단일 드래그로 section 컨테이너 + 자식 노드를 한 번에 삽입한다.

### header 블록

- section: `Section` 960×72, bg #ffffff
- children:
  - `Heading` @(24,8) 320×32, `{content:"BigValue", level:"h3"}`
  - `Text` @(24,42) 420×20, `{content:"데이터로 판단의 기준을 만듭니다", size:"sm"}`

### hero 블록

- section: `Section` 960×360, bg #ecebfc
- children:
  - `Badge` @(410,64) 140×28, `{text:"AI 부동산 분석", tone:"brand"}`
  - `Heading` @(180,120) 600×48, `{content:"데이터로...", level:"h1"}`
  - `Text` @(230,184) 500×28, `{content:"신뢰 가능한...", size:"lg"}`
  - `Button` @(410,240) 140×44, `{text:"무료로 체험하기", variant:"primary"}`

### footer 블록

- section: `Section` 960×88, bg #25252f
- children:
  - `Text` @(24,34) 320×20, `{content:"© BigValue", size:"sm", color:"#ffffff"}`
  - `Text` @(560,34) 376×20, `{content:"이용약관 · ...", size:"sm", color:"#cbd5e1"}`

## 아이콘 레지스트리 (`src/registry/icons.ts`)

Button 등에서 쓰는 예약 SVG 아이콘 세트. `iconDefs: IconDef[]`(`{ name, label, svg }`, `svg`는 24×24 viewBox의 **inner 마크업**, `stroke="currentColor"`로 글자색 상속)과 `getIcon(name)`을 export한다.

- **확장 구조**: 지금은 18종이 코드에 baked-in. 추후 백엔드가 사용자 업로드 아이콘을 `iconDefs`에 병합할 수 있게 레지스트리 형태로 설계됨. `name`은 안정적 식별자이며 코드 export에 그대로 출력된다.
- **렌더**: 신뢰된(코드 작성) 마크업이라 `dangerouslySetInnerHTML`로 렌더한다. 사용자 업로드 도입 시 **sanitize 필수**.
- **인스펙터 연동**: 새 `PropControl "icon"` → 인스펙터가 아이콘 미리보기 그리드 피커를 렌더(`InspectorPane`의 `IconPicker`). Button은 `icon`(선택)·`iconSize`(px)로 사용.

## Button 호버 (variant 외 사용자 지정)

`hoverBg`/`hoverText`(color) prop으로 호버 시 배경·글자색을 지정한다. 캔버스 미리보기는 CSS 변수(`--btn-hover-bg`/`--btn-hover-text`) + 조건부 Tailwind arbitrary 클래스(`hover:!bg-[var(--btn-hover-bg)]` 등)로 **실제 :hover**를 보여준다(render는 훅을 못 쓰므로). 색 미설정 시 클래스를 추가하지 않아 invalid var로 기본 variant 호버를 덮지 않는다. Export는 prop으로 전달한다.

## hidden 컴포넌트 정책

`Header`, `Hero`, `Footer`는 `hidden: true`로 팔레트에서 숨겨졌다. 이들과 동일한 콘텐츠를 가진 조합 블록(`header`, `hero`, `footer`)이 대체한다. 기존 저장 문서와의 호환을 위해 정의는 유지된다 (getComponentDef로 조회 가능, toCode 동작).

# 관련 개념

- [/data-model/page-node.md](/data-model/page-node.md) — ComponentDef가 생성하는 PageNode 타입
- [/export/export-format.md](/export/export-format.md) — toCode() 호출 방식
- [/store/editor-store.md](/store/editor-store.md) — addNode / addBlock 액션
