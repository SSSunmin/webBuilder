---
type: Reference
title: MD Export 형식
description: generateMarkdown의 세 가지 모드(spec/code/both), 모든 모드 앞에 붙는 포터블 컨텍스트(서문+컴포넌트 범례), 명세서 트리 직렬화 방식, React 코드 생성 방식, 이벤트·override 출력 규칙. v2에서 디자인 토큰 → CSS 변수 출력 추가. v3(Stage A)에서 flex 컨테이너 래퍼 클래스·flow 자식 relative emit 추가. v4(Stage B1)에서 overrideDecls/overrideLines에 padding/margin 추가, overrideSpacingDecl(0-emit) 신규.
resource: src/export/index.ts, src/export/spec.ts, src/export/code.ts, src/export/legend.ts
tags: [export, markdown, spec, code, events, portable, legend, design-tokens, layout, flex, breakpoint, override, spacing]
timestamp: 2026-06-30
---

# MD Export 형식

`src/export/` 모듈이 `PageDocument`를 입력받아 `.md` 파일로 다운로드할 문자열을 생성한다. 저장(Save)과 **완전히 독립된** 경로다.

## 공개 API

```ts
// src/export/index.ts
type ExportMode = "spec" | "code" | "both";

const EXPORT_MODE_LABELS: Record<ExportMode, string> = {
  spec: "명세만",
  code: "코드만",
  both: "둘 다",
};

function generateMarkdown(doc: PageDocument, mode: ExportMode): string
// 모든 모드 = `${generateContext(doc)}\n---\n\n${modeBody}`
// modeBody: spec | code | `${spec}\n---\n\n${code}`(both)
```

## (0) 포터블 컨텍스트 — `generateContext` (`legend.ts`)

**모든 모드의 본문 앞에** 붙는 자기완결·제공자 중립(특정 LLM 비언급) 머리말. 산출물을 이 코드베이스 밖으로 가져가도 임의의 LLM·개발자가 페이지를 구현할 수 있게 한다.

구성:
1. **읽는 법 서문** — blockquote. 좌표계(고정폭 루트 + 절대 px, `@(x,y) w×h`), 들여쓰기=중첩, `(container)`만 자식, 태블릿/모바일 override·`숨김`, `이벤트:`, 색상/간격 단위·`T/R/B/L`, `import ... from "./components"`는 예시 경로라는 고지. 첫 줄에 `doc.meta.name`을 넣는다.
2. **`## 사용 컴포넌트` 범례** — 페이지가 **실제 쓰는** 타입만(루트부터 pre-order, 중복 1회, cyclic 방어 `visited`). 각 항목:
   - `### <label> (\`<type>\`)` + 컨테이너/리프 한 줄
   - props가 있으면 `| 속성 | 설명 | 타입 | 기본값 |` 표. 타입은 control 한글화(text→문자열…), select는 `선택(a \| b)`(파이프 이스케이프). 기본값은 빈값이면 `—`, 문자열이면 따옴표.
   - `코드 형태: \`<...>\`` — `def.toCode(sampleNode, 컨테이너면 " …")`를 한 줄로 접어 JSX 계약 예시 제공.

타입 추출·범례는 `getComponentDef`로 조회하므로 `hidden` 컴포넌트(레거시 Header/Hero/Footer)도 저장 문서가 쓰면 정상 출력된다.

## (A) 명세서 모드 — `generateSpec` (`spec.ts`)

사람과 AI가 읽는 구조화 MD. 노드 트리를 재귀 순회하며 인덴트 목록으로 표현한다.

### 출력 구조

```
# Page: <doc.meta.name>

## 디자인 토큰 (색상)
- `<key>`: `<value>`
...

## 디자인 토큰 (글꼴)
## 디자인 토큰 (간격)

- **<label>** (container) — <frameSummary> — <propsSummary>
  - <breakpoint override lines>
  - <event lines>
  - **<child label>** — ...
```

`tokensSection(tokens)` 함수가 `colors` / `fonts` / `spacing` 세 섹션을 각각 생성한다. 정의된 카테고리가 하나라도 있으면 헤더 `## 페이지` 트리 앞에 삽입된다. 키·값은 모두 코드 스팬으로 감싸 마크다운 이스케이프 처리한다.

### frameSummary 구성 요소

| 요소 | 조건 | 예시 |
|---|---|---|
| 위치+크기 | 항상 | `@(24,16) 320×48` (루트 또는 flow 자식은 크기만) |
| bg | background 있을 때 | `bg #ffffff` / `bg token primary (#3b82f6)` |
| flex 요약 | layout="flex" | `flex 가로, gap 8, 정렬 center` |
| radius | borderRadius > 0 | `radius 14` |
| shadow | boxShadow 있을 때 | `shadow 0/4/12/0 #000000 15%` (x/y/blur/spread 색 투명도) |
| pad | padding이 0이 아닐 때 | `pad 16` / `pad token sm (8px)` / `pad 8/16/8/16` |
| margin | margin이 0이 아닐 때 | `margin 8` / `margin token gap (미정의)` |

**flow 자식**: 부모가 flex 컨테이너인 노드는 `@(x,y)` 위치 표기를 생략하고 크기(`w×h`)만 출력한다(`inFlow=true` → `frameSummary` 위치 부분 스킵). 위치 정보가 flexbox에 의해 결정되므로 의미 없다.

**flowSummary**: `flexDirection`("가로"/"세로"), gap(0이면 생략), `justifyContent`(기본 `flex-start`면 생략), `alignItems`(기본 `flex-start`면 생략)를 쉼표로 이어 붙인다.

spacing 표기법: 균일하면 단일 숫자, 비균일하면 `T/R/B/L`. 토큰 참조이면 `token <key> (<px>px)` 또는 `token <key> (미정의)`.
배경 토큰 참조이면 `bg token <key> (<resolved>)` 또는 `bg token <key> (미정의)`.
props 요약(`summarizeProps`)은 스키마 순서대로 출력하되, `icon`이 없으면 `iconSize`(default 16)는 생략한다.

### 브레이크포인트 오버라이드 출력

desktop(base)은 출력하지 않는다. tablet/mobile에 override가 있을 때만 한 줄 추가:
- hidden: `- 태블릿: 숨김` (hidden이 true면 같은 override의 frame·padding·margin은 출력 안 함)
- frame 변경: `- 태블릿: @(x,y) w×h` (resolveFrame 값)
- **padding override (Stage B1)**: `- 태블릿: pad <값>` — 0이면 `"0"` 출력(base와 달리 생략 안 함). 토큰 ref면 `token <key> (<px>px)` 또는 `token <key> (미정의)`.
- **margin override (Stage B1)**: `- 태블릿: margin <값>` — 동일 규칙.
- frame + padding + margin이 함께 있으면 쉼표로 이어 한 줄에 출력: `- 태블릿: @(x,y) w×h, pad 16, margin 8`

`overrideLines(node, depth, tokens)` 함수가 처리. **`tokens` 파라미터(Stage B1 추가)**: spacing 토큰 ref 직렬화에 필요.

### 이벤트 출력

`EventBinding`마다 한 줄: `- 이벤트: <triggerLabel> → <actionLabel>: <target>`

`describeEvent()` 함수가 생성. 예: `- 이벤트: 클릭 → 페이지 이동: /pricing`

### 순환 참조 방어

`visited: Set<string>`으로 이미 방문한 nodeId를 건너뛴다 (손상된 문서 대응).

## (B) 코드 모드 — `generateCode` / `generateCodeMarkdown` (`code.ts`)

React + TypeScript 컴포넌트 문자열을 생성한다.

### 출력 구조

```tsx
import { Button, Layout, ... } from "./components";

export function Page() {
  return (
    <>
      <style>{`
        :root {
          --color-primary: #3b82f6;
          --space-sm: 8px;
          --font-body: Inter, sans-serif;
        }

        .pg-0 { position: relative; width: 1280px; height: 900px; margin: 0 auto;
                font-family: var(--font-body); }
        .pg-1 { position: absolute; left: 24px; top: 16px; width: 320px; height: 48px;
                background: var(--color-primary); padding: var(--space-sm); }
        ...

        @media (max-width: 768px) { ... }
        @media (max-width: 375px) { ... }
      `}</style>
      <div className="pg-0">
        ...
      </div>
    </>
  );
}
```

스타일은 인라인 style이 아닌 **클래스명(`pg-N`) + `<style>` 블록** 방식으로 출력된다. 미디어 쿼리(`@media max-width`)로 반응형 override를 지원한다.

### `:root` 토큰 블록 (`rootTokenBlock`)

`meta.tokens`가 있으면 CSS 파일 맨 앞에 `:root { ... }` 블록을 삽입한다:

| 토큰 카테고리 | 변수명 형식 | 예시 |
|---|---|---|
| `colors` | `--color-<key>` | `--color-primary: #3b82f6;` |
| `spacing` | `--space-<key>` | `--space-sm: 8px;` |
| `fonts` | `--font-<key>` | `--font-body: Inter, sans-serif;` |

unsafe 값은 `sanitizeColor` / `sanitizeSpacing` / `sanitizeFontFamily`로 검증 후 드롭 — `:root` 블록과 `var()` 참조 양쪽에서 동일하게 적용된다.

### baseDecls 구성 요소 (노드별 CSS 선언)

- 루트: `position: relative`, `margin: 0 auto`, width/height
- **flow 자식** (`inFlow=true`): `position: relative`, width/height, `flex: 0 0 auto` (`left`/`top` 생략)
- 일반 자식: `position: absolute`, left/top/width/height
- 공통(있을 때): `background`, `borderRadius`, `box-shadow`(`shadowCss`로 ShadowSpec → rgba), `padding`, `margin`(루트 제외)
- **배경 토큰 참조**: `background: var(--color-<key>)` (dangling이면 background 선언 드롭)
- **간격 토큰 참조**: `padding: var(--space-<key>)` / `margin: var(--space-<key>)` (dangling이면 드롭)
- **글꼴**: 루트 노드에만 `font-family: var(--font-body)` (body 토큰이 있고 safe할 때)
- Button은 `toCode`에서 `icon`/`iconSize`(아이콘 있을 때만)·`hoverBg`/`hoverText`를 prop으로 전달

### flex 컨테이너 — `.pg-N-c` 래퍼 클래스 (code.ts)

`layout="flex"`인 컨테이너에 자식이 있으면, 자식들을 **별도 `<div>` 래퍼**로 감싸고 그 래퍼에 `flowDecls` CSS 규칙을 emit한다. 노드 자체(`pg-N`)는 위치·크기 박스로만 남는다.

```
.pg-N      { position: absolute; left: ...; width: ...; height: ...; }  /* 노드 박스 */
.pg-N-c    { display: flex; flex-direction: row; flex-wrap: wrap;        /* 래퍼 */
             width: 100%; height: 100%; box-sizing: border-box;
             gap: 8px; align-items: flex-start; justify-content: center; }
```

**flowDecls 포함 선언 목록:**

| 선언 | 조건 |
|---|---|
| `display: flex` | 항상 |
| `flex-direction: <row\|column>` | 항상 |
| `flex-wrap: wrap` | 항상 고정 |
| `width: 100%` | 항상 |
| `height: 100%` | 항상 |
| `box-sizing: border-box` | 항상 |
| `gap: <n>px` | gap > 0일 때만 |
| `align-items: <value>` | 항상 |
| `justify-content: <value>` | 항상 |

자식이 없으면 래퍼 자체를 생략한다. 래퍼 클래스명은 `<노드클래스>-c`(예: `pg-3-c`).

spacing(리터럴 Sides): 균일이면 `Npx`, 비균일이면 `Tpx Rpx Bpx Lpx` 단축 형식. 전부 0이면 생략.

### overrideDecls — 브레이크포인트별 CSS override 선언 (Stage B1 확장)

```ts
function overrideDecls(
  node: PageNode,
  bp: Exclude<BreakpointId, "desktop">,
  tokens: DocumentTokens | undefined,  // Stage B1에서 파라미터 추가
): string[]
```

`overrides[bp]`에 정의된 필드만 선언을 생성한다. **Stage B1에서 padding·margin 지원 추가**:

| override 필드 | 생성 선언 |
|---|---|
| `frame.x` | `left: <n>px` |
| `frame.y` | `top: <n>px` |
| `frame.w` | `width: <n>px` |
| `frame.h` | `height: <n>px` |
| `hidden` | `display: none` 또는 `display: block` (양방향 emit으로 re-show 가능) |
| `padding` | `overrideSpacingDecl("padding", ov.padding, tokens)` |
| `margin` | `overrideSpacingDecl("margin", ov.margin, tokens)` |

#### overrideSpacingDecl — 0도 emit하는 spacing 선언 (Stage B1 신규)

```ts
function overrideSpacingDecl(
  prop: "padding" | "margin",
  value: Sides | string,
  tokens: DocumentTokens | undefined,
): string
```

`baseDecls`의 `spacingDecl`과 달리 **전부 0이어도 선언을 생략하지 않는다**. override는 base 규칙을 이겨야 하므로 `padding: 0`을 명시적으로 emit해야 한다.

- 토큰 ref(`token:<key>`): 토큰이 유효하면 `padding: var(--space-<key>)`, dangling이면 `padding: 0` (base 규칙 reset).
- 리터럴 Sides: `cssSpacing(toSides(value))` 결과가 null(전부 0)이면 `padding: 0`, 아니면 `padding: <css>`.
- 신뢰경계(A03): `sanitizeSpacing` + 토큰 화이트리스트 통과. base의 `spacingDecl`과 동일한 경계.

#### CSS cascade 주의

태블릿 미디어 쿼리(`@media (max-width: 768px)`)는 `375px` 화면에도 적용된다. 따라서 mobile override가 없으면 tablet override가 mobile에서도 상속된다 — `resolvePadding/resolveMargin`의 "tablet → mobile 상속" 동작과 동일하게 작동한다.

### 템플릿 리터럴 이스케이프

stylesheet는 `` <style>{`...`}</style> `` 안에 들어가므로 사용자 값의 `` ` `` 와 `${` 를 단일 경계에서 이스케이프한다 (`buildCss` 이후, `component` 조립 전).

### 이벤트 핸들러 출력

같은 trigger를 가진 바인딩은 하나의 핸들러로 합친다. `actionNeedsEvent(action)` 가 true인 항목이 하나라도 있으면 `(e) => { ... }`, 없으면 `() => { ... }`.

예:
```tsx
onClick={() => { window.location.href = "/pricing"; }}
onSubmit={(e) => { e.preventDefault(); /* TODO: submit */ }}
```

### import 헤더 자동 생성

`collectComponents(body)` — JSX 본문에서 `<[A-Z]...>` 패턴으로 PascalCase 태그를 수집 → `import { ... } from "./components"` 생성.

### Markdown 래퍼

```ts
function generateCodeMarkdown(doc): string
// "## Generated Code\n\n```tsx\n...\n```\n"
```

## 순환 참조 방어

`code.ts`도 동일하게 `visited: Set<string>`을 사용한다.

# 관련 개념

- [/data-model/page-node.md](/data-model/page-node.md) — EventBinding, NodeOverride 타입
- [/registry/component-registry.md](/registry/component-registry.md) — toCode()·PropSchema 구현 위치(범례 소스)
- [/overview/project.md](/overview/project.md) — Export vs 저장 구분
