---
type: Reference
title: 에디터 스토어 (Zustand)
description: useEditorStore 상태 구조, 전체 액션 목록, undo/redo coalescing 메커니즘, breakpoint 편집 모드. v2에서 글꼴·간격 토큰 액션 추가.
resource: src/store/editorStore.ts
tags: [store, zustand, undo-redo, state, breakpoint, design-tokens]
timestamp: 2026-06-29
---

# 에디터 스토어 (Zustand)

`src/store/editorStore.ts` — `create<EditorState>()` 단일 스토어.

## 상태 구조

```ts
interface EditorState {
  document: PageDocument | null;
  selectedIds: string[];
  past: PageDocument[];      // undo 스택 (최대 50개)
  future: PageDocument[];    // redo 스택
  lastTag: string | null;    // undo coalescing 태그
  activeBreakpoint: BreakpointId;  // "desktop" | "tablet" | "mobile"
  // ... 액션들
}
```

초기값: `document: null`, `selectedIds: []`, `past: []`, `future: []`, `lastTag: null`, `activeBreakpoint: "desktop"`.

## Undo/Redo — Coalescing 메커니즘

`HISTORY_LIMIT = 50`

모든 변경은 내부 `apply(producer, tag)` 함수를 경유한다:

```
tag === lastTag  →  coalesce (past에 새 스냅샷 추가하지 않고 document만 교체)
tag !== lastTag  →  새 스냅샷을 past에 push
tag === null     →  항상 새 스냅샷 (이산적 액션)
```

**태그 패턴** (실제 코드):
- props 편집: `props:<id>:<keys>` (드래그 중 연속 props 변경을 1 undo step으로)
- frame 편집: `frame:<id>:<fields>`
- spacing: `spacing:<id>:p<keys>|m<keys>`
- background: `bg:<id>`
- radius: `radius:<id>`
- shadow: `shadow:<id>:<fields>` (필드별 태그로 x·y·blur가 별도 undo step)
- event 편집: `event:<id>:<eventId>:<fields>`
- hidden 토글: `hidden:<id>:<bp>`
- reset override: `reset:<id>:<bp>`
- 색상 토큰 편집: `token:color:<key>` (색상 피커 드래그 중 coalesce)
- 글꼴 토큰 편집: `token:font:<key>`
- 간격 토큰 편집: `token:spacing:<key>`

`selectNode()` 호출 시 `lastTag: null`로 초기화 → 선택이 바뀌면 coalescing 세션 종료.

## 전체 액션 목록

### 문서 로드·생성

| 액션 | 설명 |
|---|---|
| `loadDocument(doc)` | 문서 로드 + 히스토리 초기화 + `normalizeDocument()` 적용 |
| `newDocument(name)` | 빈 `PageDocument` 생성 (root = Layout 노드) |
| `setBreakpoint(bp)` | `activeBreakpoint` 전환 (히스토리 영향 없음) |

### 선택

| 액션 | 설명 |
|---|---|
| `selectNode(id, additive?)` | 단일/다중 선택. `null` 전달 시 선택 해제 |

### 노드 추가

| 액션 | 설명 |
|---|---|
| `addNode(parentId, type, position?)` | 레지스트리에서 노드 생성 → 부모 children에 append |
| `addBlock(parentId, blockKey, position?)` | BlockDef의 section + children을 한 스텝으로 삽입 |

### 노드 속성 편집

| 액션 | tag | 설명 |
|---|---|---|
| `updateNodeProps(id, partial)` | `props:<id>:<keys>` | props 부분 업데이트 |
| `updateNodeFrame(id, partial, tag?)` | `frame:<id>:<fields>` | 활성 브레이크포인트에 frame 기록 |
| `moveNodeBy(id, dx, dy, tag?)` | null (기본) | 활성 bp 기준 resolve 후 이동 |
| `setNodeBackground(id, bg)` | `bg:<id>` | background 색상 (리터럴 또는 `token:<key>` 참조 모두 가능) |
| `setNodeRadius(id, r)` | `radius:<id>` | borderRadius (0 이상 정수로 클램프) |
| `updateNodeShadow(id, partial)` | `shadow:<id>:<fields>` | 픽셀 그림자(ShadowSpec) 부분 병합 (없으면 DEFAULT_SHADOW 생성) |
| `clearNodeShadow(id)` | null | 그림자 제거 (boxShadow → undefined) |
| `updateNodeSpacing(id, {padding?, margin?})` | `spacing:...` | padding/margin 부분 업데이트. 토큰 참조 중인 노드는 resolve 후 Sides로 전환 |
| `setNodeSpacingValue(id, which, value)` | null | padding/margin을 Sides 또는 `token:<key>` 참조로 통째로 교체 (인스펙터에서 리터럴↔토큰 전환 시 사용) |

### 디자인 토큰 액션

문서 전역 토큰(`meta.tokens`)을 upsert/remove한다. 유효하지 않은 키(`isValidTokenKey` 실패)는 무시된다.

| 액션 | tag | 설명 |
|---|---|---|
| `setColorToken(key, value)` | `token:color:<key>` | 색상 토큰 upsert |
| `removeColorToken(key)` | null | 색상 토큰 삭제. 참조 중인 노드는 dangling → 배경 없음 |
| `setFontToken(key, value)` | `token:font:<key>` | 글꼴 토큰 upsert. `body` 키가 페이지 루트 `font-family`로 전역 적용 |
| `removeFontToken(key)` | null | 글꼴 토큰 삭제 |
| `setSpacingToken(key, value)` | `token:spacing:<key>` | 간격 토큰 upsert (px) |
| `removeSpacingToken(key)` | null | 간격 토큰 삭제. 참조 중인 노드는 dangling → 간격 0으로 fallback |

### 이벤트 바인딩

| 액션 | tag | 설명 |
|---|---|---|
| `addNodeEvent(id)` | null | 기본 `click → custom` 바인딩 추가 |
| `updateNodeEvent(id, eventId, partial)` | `event:<id>:<eventId>:<fields>` | 바인딩 필드 수정 |
| `removeNodeEvent(id, eventId)` | null | 바인딩 삭제 |

### 노드 구조 변경

| 액션 | 설명 |
|---|---|
| `removeNode(id)` | 서브트리 전체 삭제 (rootId 삭제 불가) |
| `duplicateNode(id)` | 서브트리 deep-clone, 새 id 부여, 원본 바로 뒤에 삽입, +16px offset |
| `moveNode(id, newParentId, position?)` | 다른 컨테이너로 reparent |
| `reorderNode(id, "forward"\|"backward")` | 형제 순서에서 앞/뒤 이동 (스택 순서) |
| `moveNodeInto(id, parentId)` | 컨테이너의 마지막 자식으로 이동 |
| `moveNodeAdjacent(id, refId, "before"\|"after")` | refId 형제 앞/뒤에 삽입 |

### 정렬·배분

| 액션 | 설명 |
|---|---|
| `alignNodes(ids, mode)` | 동일 부모 노드들을 정렬 (left/hcenter/right/top/vcenter/bottom) |
| `distributeNodes(ids, axis)` | 동일 부모 노드 3개 이상 등간격 배분 (h/v) |
| `centerInParent(ids, axis)` | 부모+직속자식 선택 시 자식을 부모 **패딩 영역** 기준 가운데로 (h/v) |

`findParentChild(nodes, ids)`·`sameParent(nodes, ids)`는 export된 순수 헬퍼다. AlignToolbar가 이걸로 선택 형태를 판별 — 부모+자식이면 `centerInParent` 버튼을, 동일 부모 형제면 align/distribute 버튼을 보이고(`!sameParent`면 비활성화) 한다.

### 브레이크포인트 오버라이드

| 액션 | 설명 |
|---|---|
| `setNodeHidden(id, bp, hidden)` | bp별 hidden 플래그 (desktop 불가) |
| `resetOverride(id, bp)` | bp 오버라이드 전체 삭제 (desktop 불가) |

### Undo / Redo

| 액션 | 설명 |
|---|---|
| `undo()` | `past` 스택에서 이전 상태 복원 |
| `redo()` | `future` 스택에서 다음 상태 복원 |

## 내부 유틸 함수

- `createDocument(name)`: 빈 문서 생성 (exported)
- `collectSubtree(nodes, id)`: 서브트리 id 배열 수집 (exported)
- `normalizeDocument(doc)`: 구버전 문서에 frame/background/borderRadius 백필
- `writeFrame(node, bp, partial)`: bp 인식 frame 기록 헬퍼

# 관련 개념

- [/data-model/page-node.md](/data-model/page-node.md) — PageDocument / PageNode 타입
- [/architecture/editor-architecture.md](/architecture/editor-architecture.md) — EditorShell에서 스토어 사용 패턴
- [/responsive/breakpoints.md](/responsive/breakpoints.md) — activeBreakpoint·override 흐름
