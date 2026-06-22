---
type: Reference
title: 반응형 / 브레이크포인트 편집 모델
description: desktop 기준 + tablet/mobile override 캐스케이드 구조, resolveFrame/resolveHidden, 스토어 액션, 스펙 출력 방식.
resource: src/types/page.ts, src/store/editorStore.ts, src/export/spec.ts
tags: [responsive, breakpoint, override, cascade]
timestamp: 2026-06-22
---

# 반응형 / 브레이크포인트 편집 모델

## 브레이크포인트 정의

```ts
const BREAKPOINTS: BreakpointDef[] = [
  { id: "desktop", label: "데스크탑", width: 1280 },
  { id: "tablet",  label: "태블릿",   width: 768  },
  { id: "mobile",  label: "모바일",   width: 375  },
];
```

## Override 데이터 구조

`PageNode.overrides`는 `tablet` / `mobile` 키만 갖는다. `desktop`은 항상 base (`node.frame`)이며 override 맵에 존재하지 않는다.

```ts
interface NodeOverride {
  frame?: Partial<NodeFrame>;  // 변경된 필드만 sparse하게 저장
  hidden?: boolean;
}

// PageNode 내
overrides?: Partial<Record<"tablet" | "mobile", NodeOverride>>;
```

override는 **sparse** — 변경된 축(x 또는 y 또는 w/h)만 저장되고, 나머지는 상위 브레이크포인트에서 상속된다.

## 캐스케이드 resolve 함수 (`src/types/page.ts`)

### `resolveFrame(node, bp): NodeFrame`

```
desktop  → node.frame (변경 없음)
tablet   → {...node.frame, ...overrides.tablet?.frame}
mobile   → {...node.frame, ...overrides.tablet?.frame, ...overrides.mobile?.frame}
```

즉 mobile은 desktop base + tablet 오버라이드 + mobile 오버라이드를 순서대로 병합한다.

### `resolveHidden(node, bp): boolean`

```
hidden = false (기본)
tablet/mobile: hidden = overrides.tablet?.hidden ?? hidden
mobile:        hidden = overrides.mobile?.hidden ?? hidden
```

나중 브레이크포인트가 숨김을 다시 `false`로 바꿀 수 있다 (re-show).

## 에디터 스토어 동작

`activeBreakpoint`가 변경되면 모든 frame 수정 액션이 해당 bp에 기록된다:

| 조건 | writeFrame 동작 |
|---|---|
| `activeBreakpoint === "desktop"` | `node.frame`에 직접 merge |
| `activeBreakpoint === "tablet"` | `node.overrides.tablet.frame`에 partial merge |
| `activeBreakpoint === "mobile"` | `node.overrides.mobile.frame`에 partial merge |

`moveNodeBy()`도 resolve된 위치 기준으로 delta를 계산하고 같은 bp에 기록한다.

### 관련 액션

| 액션 | 설명 |
|---|---|
| `setBreakpoint(bp)` | 편집 모드 전환 (히스토리 영향 없음) |
| `setNodeHidden(id, bp, hidden)` | bp별 hidden 플래그 (desktop 호출 시 no-op) |
| `resetOverride(id, bp)` | 해당 bp의 override 전체 삭제 → base 상속으로 복귀 (desktop 호출 시 no-op) |

### 정렬/배분 (`alignNodes`, `distributeNodes`)

`activeBreakpoint`에서 `resolveFrame`한 값으로 정렬 계산 후, 변경된 축만 sparse partial로 `patchFrames` 기록 → override가 간결하게 유지됨.

## 명세서(spec) Export에서의 출력

`spec.ts`의 `overrideLines()`:
- desktop(base)은 출력 생략
- tablet/mobile에 override가 있을 때만 노드 줄 아래에 한 줄 추가
  - hidden이면: `- 태블릿: 숨김`
  - frame 변경이면: `- 태블릿: @(x,y) w×h` (resolveFrame 값)

## 코드(code) Export

현재 `code.ts`의 `frameStyle()`은 `node.frame`(base = desktop frame)만 사용하여 CSS를 생성한다. tablet/mobile override는 명세서(spec)에만 출력되며, 코드 Export에는 반영되지 않는다 (코드 Export는 desktop 기준 정적 스타일을 생성함).

# 관련 개념

- [/data-model/page-node.md](/data-model/page-node.md) — NodeOverride, BreakpointId 타입
- [/store/editor-store.md](/store/editor-store.md) — setBreakpoint, setNodeHidden, resetOverride 액션
- [/export/export-format.md](/export/export-format.md) — 명세서 override 출력 상세
