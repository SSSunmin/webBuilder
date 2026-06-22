---
type: Reference
title: MD Export 형식
description: generateMarkdown의 세 가지 모드(spec/code/both), 명세서 트리 직렬화 방식, React 코드 생성 방식, 이벤트·override 출력 규칙.
resource: src/export/index.ts, src/export/spec.ts, src/export/code.ts
tags: [export, markdown, spec, code, events]
timestamp: 2026-06-22
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
// "both" → `${spec}\n---\n\n${code}`
```

## (A) 명세서 모드 — `generateSpec` (`spec.ts`)

사람과 AI가 읽는 구조화 MD. 노드 트리를 재귀 순회하며 인덴트 목록으로 표현한다.

### 출력 구조

```
# Page: <doc.meta.name>

- **<label>** (container) — <frameSummary> — <propsSummary>
  - <breakpoint override lines>
  - <event lines>
  - **<child label>** — ...
```

### frameSummary 구성 요소

| 요소 | 조건 | 예시 |
|---|---|---|
| 위치+크기 | 항상 | `@(24,16) 320×48` (루트는 크기만) |
| bg | background 있을 때 | `bg #ffffff` |
| radius | borderRadius > 0 | `radius 14` |
| shadow | boxShadow 있을 때 | `shadow md` (프리셋 키) |
| pad | padding이 0이 아닐 때 | `pad 16` 또는 `pad 8/16/8/16` |
| margin | margin이 0이 아닐 때 | `margin 8` |

spacing 표기법: 균일하면 단일 숫자, 비균일하면 `T/R/B/L`.
props 요약(`summarizeProps`)은 스키마 순서대로 출력하되, `icon`이 없으면 `iconSize`(default 16)는 생략한다.

### 브레이크포인트 오버라이드 출력

desktop(base)은 출력하지 않는다. tablet/mobile에 override가 있을 때만 한 줄 추가:
- hidden: `- 태블릿: 숨김`
- frame 변경: `- 태블릿: @(x,y) w×h` (resolveFrame 값)

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
    <div style={{ position: "relative", width: 960, height: 600, ... }}>
      <ComponentDef.toCode() 출력>
        <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ... }}
             onClick={(e) => { ... }}>
          ...
        </div>
      </ComponentDef.toCode() 출력>
    </div>
  );
}
```

### frameStyle 구성 요소

- 루트: `position:"relative"`, `margin:"0 auto"`, width/height
- 자식: `position:"absolute"`, left/top/width/height
- 공통(있을 때): `background`, `borderRadius`, `boxShadow`(프리셋 키 → CSS 값), `padding`, `margin`(루트 제외)
- Button은 `toCode`에서 `icon`/`iconSize`(아이콘 있을 때만)·`hoverBg`/`hoverText`를 prop으로 전달 — 소비 측 Button이 구현

spacing: 균일이면 숫자, 비균일이면 `"Tpx Rpx Bpx Lpx"` 문자열.

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
- [/registry/component-registry.md](/registry/component-registry.md) — toCode() 구현 위치
- [/overview/project.md](/overview/project.md) — Export vs 저장 구분
