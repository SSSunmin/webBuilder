---
type: Architecture
title: 에디터 아키텍처 (5-zone)
description: EditorShell이 제공하는 5-zone 레이아웃, DnD 흐름(절대배치·flex 자식 sortable reorder+DragOverlay, grid 자식은 reorder 불가), 스냅 시스템(flow 자식 스냅 스킵), 키보드 단축키. Stage C-2에서 per-bp 레이아웃 파라미터 오버라이드 추가(래퍼 클래스 .pg-N-c에 @media 규칙 emit). Stage C-3에서 flex↔grid per-bp 모드 스왑 추가(resolveLayoutMode 단일출처, InspectorPane LayoutControl 모드 select bp 활성화). absolute↔flex/grid 스왑은 여전히 불가. NodeView는 FlowNodeView(useSortable)/StaticNodeView(useDraggable) 디스패처 구조.
resource: src/app/EditorShell.tsx, src/routes/Editor.tsx, src/canvas/snap.ts, src/canvas/guideStore.ts, src/canvas/flowReorder.ts, src/components/NodeView.tsx, src/components/InspectorPane.tsx, src/export/code.ts
tags: [editor, dnd, snap, architecture, flex, grid, reorder, flow, sortable, dragoverlay, breakpoint, override, layout, layout-mode-swap]
timestamp: 2026-07-01
---

# 에디터 아키텍처 (5-zone)

## 5-zone 레이아웃

```
┌────────────────────────────────────────────────────────┐
│  BuilderHeader (grid-rows top)                         │
│  ← 홈 · 프로젝트명 · 저장 · Export · Undo/Redo · 미리보기 │
├─────────────┬──────────────────────────┬───────────────┤
│ PalettePane │       CanvasPane         │ LayerTreePane │
│  (260px)    │   (minmax(0,1fr))        ├───────────────┤
│             │                          │ InspectorPane │
└─────────────┴──────────────────────────┴───────────────┘
```

그리드 정의 (`EditorShell.tsx`):
- 행: `grid-rows-[auto_1fr]`
- 열: `lg:grid-cols-[260px_minmax(0,1fr)_320px]`
- 우측 aside는 `grid-rows-2`로 LayerTree / Inspector 반반 분할

## 컴포넌트 책임

| 컴포넌트 | 파일 | 역할 |
|---|---|---|
| `BuilderHeader` | `components/BuilderHeader.tsx` | 저장·Export·Undo/Redo·미리보기·브레이크포인트 전환 |
| `PalettePane` | `components/PalettePane.tsx` | 컴포넌트·블록 목록, 드래그 시작점 |
| `CanvasPane` | `components/CanvasPane.tsx` | 노드 트리 렌더, 선택, 리사이즈 |
| `LayerTreePane` | `components/LayerTreePane.tsx` | 노드 트리 뷰, 선택 동기화, 순서 변경 |
| `InspectorPane` | `components/InspectorPane.tsx` | Props·이벤트·레이아웃 편집 폼 |
| `GuideOverlay` | `components/GuideOverlay.tsx` | 스냅 가이드라인 SVG 오버레이 |
| `ExportModal` | `components/ExportModal.tsx` | Export 모드 선택 + 다운로드 |
| `PreviewModal` | `components/PreviewModal.tsx` | 미리보기 |
| `AlignToolbar` | `components/AlignToolbar.tsx` | 다중 선택 시 정렬·배분 도구 |

## DnD 흐름 (dnd-kit)

`EditorShell`이 `DndContext`의 루트다. 드래그 종류는 `ActiveData` 유니온으로 구분한다.

```
type ActiveData =
  | { kind: "palette"; type: string }   // 팔레트 → 새 노드 추가
  | { kind: "block"; blockKey: string } // 팔레트 → 조합 블록 추가
  | { nodeId: string }                  // 캔버스 → 기존 노드 이동
```

### 충돌 감지 — 스코프드 collisionDetection

`collisionDetection`은 `useCallback`으로 메모이즈된 함수(`[activeBp]` 의존)다. 드래그 중 매 렌더마다 새 참조가 생기면 dnd-kit이 충돌 감지를 재실행하는 문제를 방지한다.

- **flex(flow) 자식 드래그** → `closestCenter`: sortable 재배치에 안정적인 중심점 기반 매칭
- **그 외(절대배치 이동 / 팔레트 / reparent)** → `rectIntersection`: 기본 영역 교차 방식

flex 자식 여부 판정: `parentOf(nodes, data.nodeId)`로 부모를 찾은 뒤 `resolveFlow(nodes[pid], activeBp)`가 non-null이면 flow 자식으로 간주.

### onDragStart

- `palette` / `block` 종류 → `DragOverlay`에 라벨(텍스트 칩) 표시
- `nodeId` 종류이고 **flex 자식**이면 → `activeNodeId` 상태를 해당 nodeId로 설정(`NodeOverlay` 클론이 커서를 따라감); 소스 노드는 `opacity: 0`으로 숨겨짐
- `nodeId` 종류이고 **절대배치 노드**이면 → 오버레이 없음, 실제 DOM 요소가 transform으로 직접 이동(스냅 측정이 실제 크기 기준으로 동작)

### DragOverlay 패턴 (flex 자식 전용)

flex 자식 드래그 중:
1. 소스 노드(`FlowNodeView`)가 `opacity: 0`으로 자리를 유지
2. `DragOverlay` 안에 `NodeOverlay` 클론이 렌더되어 커서를 따라다님
3. 드롭 시 소스가 새 위치로 DOM 이동 — 소스가 살아있으므로 repaint flash 없음

`NodeOverlay`는 read-only 시각 클론(자식 재귀 없음, 셸만 렌더)으로 별도 export됨.

### onDragEnd 라우팅

1. **palette** → `addNode(overNodeId, type, dropPosition)`
2. **block** → `addBlock(overNodeId, blockKey, dropPosition)`
3. **nodeId** (기존 노드):
   - **active 노드가 flex(flow) 컨테이너의 자식**이면 → `resolveFlowDrop(nodes, id, overId)` 결과로 분기 후 **return**(절대배치 경로로 폴백하지 않음):
     - `{kind:"reorder", id, refId, side}` → `moveNodeAdjacent(id, refId, side)` (children 배열 splice)
     - `{kind:"reparent", id, parentId}` → `moveNode(id, parentId)` (다른 컨테이너로 append)
     - `null` → 무시
   - **그 외(절대배치 노드)**:
     - drop 대상이 다른 컨테이너면 **reparent**: `moveNode(id, newParentId, snappedPos)`
     - 같은 부모 내 이동: `snapBox()` 계산 후 `moveNodeBy(id, dx, dy)`

## flex 자식 캔버스 DnD (`src/canvas/flowReorder.ts`)

`@dnd-kit/sortable`의 FLIP 애니메이션을 활용. 기존 `moveNodeAdjacent` 재사용.

### `resolveFlowDrop(nodes, activeId, overId)`

순수 함수. `FlowDrop` 타입을 반환한다:

```ts
type FlowDrop =
  | { kind: "reorder"; id: string; refId: string; side: "before" | "after" }
  | { kind: "reparent"; id: string; parentId: string }
  | null;
```

| 케이스 | 반환 |
|---|---|
| overId가 **같은 flex 부모의 형제** | `{kind:"reorder", id, refId, side}` — children 배열 index 비교: `oldIndex < newIndex` → `"after"`, 그 외 → `"before"` |
| overId가 **다른 컨테이너(`isContainer === true`)** | `{kind:"reparent", id, parentId}` — 해당 컨테이너에 append |
| 그 외(비-컨테이너 · 자기 자신 · 없음) | `null` — 무시 |

이전의 `resolveFlowDrag` / `flowDropSide`(rect 기반 방향 판정)는 이 함수로 대체됨. rect 좌표 불필요 — index만으로 side 결정.

### NodeView 컴포넌트 분리

`NodeView.tsx`는 다음 내보내기로 구성된다:

| 이름 | 종류 | 역할 |
|---|---|---|
| `NodeView` | export | 디스패처 — `inFlow`이면 `FlowNodeView`, 그 외 `StaticNodeView` |
| `useNodeModel` | 내부 hook | 노드 상태·frame·flow·grid·padding 등 공통 모델 계산 |
| `renderChildContent` | 내부 함수 | 자식 렌더; flex 자식을 `SortableContext`로 래핑 |
| `NodeBox` | 내부 컴포넌트 | 실제 DOM div, dnd 속성·선택·리사이즈 핸들 |
| `StaticNodeView` | 내부 컴포넌트 | `useDraggable` + `useDroppable` — 절대배치·grid 자식용 |
| `FlowNodeView` | 내부 컴포넌트 | `useSortable` — flex 자식용, FLIP transform+transition 적용 |
| `NodeOverlay` | **export** | `DragOverlay` 안의 read-only 클론, `EditorShell`에서 import |

**`StaticNodeView` (`useDraggable`)**: `disabled: isRoot || inGrid` — **grid 자식·root는 드래그 비활성화**. `useDroppable`: `disabled: !container` — 컨테이너만 드롭 가능.

**`FlowNodeView` (`useSortable`)**: `data: { nodeId, flow: true }` — `flow: true` 마커를 실어 `collisionDetection`과 `createSnapModifier`가 flex 자식임을 식별.

**`SortableContext` 전략**: `flexDirection === "column"` → `verticalListSortingStrategy`, 그 외 → `horizontalListSortingStrategy`.

### grid 자식은 캔버스 reorder 불가 (Stage C-1 불변 조건)

`resolveFlow(node)`는 `layout !== "flex"`면 항상 `null`을 반환한다. `collisionDetection`에서 `resolveFlow`가 null이면 flow 자식으로 판정되지 않으므로, grid 자식 드래그는 flow reorder 경로에 진입하지 않는다. **flex 자식만 캔버스 드래그 재배치 대상**이며, grid 자식의 순서 변경은 LayerTree에서만 가능하다.

### export / 미리보기 자동 반영

store·export 코어 무변경. `moveNodeAdjacent`로 변경된 `node.children` 순서가 export·미리보기에 그대로 반영된다.

### grid 자식은 캔버스 reorder 불가 (Stage C-1 불변 조건)

`resolveFlow(node)`는 `layout !== "flex"`면 항상 `null`을 반환한다. grid 컨테이너의 자식에 대해 `resolveFlowDrag`가 호출되어도 active 노드의 부모가 flex가 아니므로 reorder/reparent 결과를 반환하지 않는다(`null` 반환 → 드래그 무시). 즉 **flex 자식만 캔버스 드래그 재배치 대상**이며, grid 자식의 순서 변경은 LayerTree에서만 가능하다.

### export / 미리보기 자동 반영

store·export 코어는 무변경. export·미리보기는 `node.children` 순서를 그대로 따르므로 `moveNodeAdjacent`로 변경된 순서가 자동 반영된다.

## per-bp 레이아웃 파라미터 오버라이드 (Stage C-2)

### 래퍼 클래스와 @media 규칙 분리

레이아웃 컨테이너의 CSS는 두 클래스로 분리된다:

| 클래스 | 역할 | override @media 대상 |
|---|---|---|
| `.pg-N` | 노드 박스(위치·크기·배경 등) | frame/hidden/padding/margin/background |
| `.pg-N-c` | flex/grid 래퍼(자식 배치) | **레이아웃 파라미터(Stage C-2)** |

- `pushWrapperOverrideRules(acc, cls, node, mode)` — `hasLayoutOverride(node, bp)` 가 true인 bp에 대해 `resolveFlow(node, bp)` / `resolveGrid(node, bp)`로 완전한 선언 집합을 생성해 `acc.tablet` / `acc.mobile`에 `.pg-N-c { … }` 규칙을 추가한다.
- `flowDecls` / `gridDecls`에 `forceResets = true` 파라미터: override 블록은 `gap: 0px` · `grid-template-rows: none` 등 기본값도 명시적으로 emit하여 base 규칙이 누출되지 않도록 한다.
- 최종 stylesheet는 base → tablet `@media` → mobile `@media` 순서로 조립(`buildCss`)되어 CSS cascade가 `resolveFlow/Grid(node, bp)`와 일치한다.

### flex↔grid per-bp 모드 스왑 (Stage C-3)

- `NodeOverride.layout?: "flex" | "grid"` 추가. base가 flex/grid인 컨테이너만 per-bp 스왑 가능.
- **absolute↔flex/grid는 여전히 불가**: `.pg-N-c` 래퍼의 존재 자체가 base 모드에 의존하며 CSS `@media`만으로는 DOM을 추가·제거할 수 없다.
- `resolveLayoutMode(node, bp)`: flex/grid base에서만 tablet/mobile `layout` override를 적용한다. `resolveFlow`·`resolveGrid` 게이트가 이 함수로 교체되어 모드 스왑이 캔버스·export·spec 전체에서 자동으로 정합된다.
- `setNodeLayout`이 `layout` 키를 받을 때: bp≠desktop이고 값이 flex/grid이고 base가 flex/grid이면 `overrides[bp].layout`에 기록. 그 외(desktop, absolute base, absolute 값)는 base에 기록(absolute 전환 시 `layout` 필드 삭제).

### InspectorPane / EditorShell — bp 인지 동작 (Stage C-2/C-3)

- `InspectorPane`의 `LayoutControl`: 표시 모드는 `resolveLayoutMode(node, bp)`로 해당 bp 기준으로 보여준다(C-3). 모드 select는 `canSwapMode`(bp≠desktop이고 base≠absolute)일 때만 활성화 — absolute base이면 "모드는 데스크탑 기준" 안내 문구를 표시하고 select를 비활성화. override가 정의된 필드에는 "changed here" 배지와 필드별 reset(clearOverrideField) 버튼 제공.
- `NodeView.tsx`: wrapper style이 `resolveFlow(node, bp)` / `resolveGrid(node, bp)`를 사용해 캔버스에서 활성 bp 기준으로 실시간 미리보기. C-3 이후 모드 스왑도 자동 반영됨(resolveLayoutMode 경유).
- `EditorShell.tsx`: drop-side 판정에 `resolveFlow(parent, activeBp)`를 사용해 bp별 flexDirection을 반영.

## 스냅 시스템 (`src/canvas/snap.ts`)

### SNAP_THRESHOLD = 6 (px)

두 단계 스냅을 경쟁시켜 더 가까운 쪽을 적용한다:

| 스냅 종류 | 함수 | 설명 |
|---|---|---|
| Edge snap | `edgeSnap()` | 이동 박스의 edge/center ↔ 형제·컨테이너 inner bound edge/center |
| Spacing snap | `spacingSnap()` | 형제 사이 등간격 (앞뒤 이웃이 있을 때 중앙 배치) |

마진 인식: `SnapBox.margin`이 있으면 형제 간격 계산 시 마진을 포함한다 (`boxEdges`).

리사이즈 스냅: `snapResize()` — bottom-right 코너를 형제·inner bound에 스냅.

### flow 자식 스냅 스킵

`createSnapModifier`는 드래그 시작 시 `active.data.current.flow`가 `true`이면 **즉시 `transform`을 그대로 반환**하고 스냅 계산을 건너뛴다.

이유: flex 자식은 소스(`opacity: 0`)가 원래 슬롯에 고정된 채 `NodeOverlay` 클론이 커서를 따라다니므로, 소스 DOM rect를 기준으로 스냅을 계산하면 클론 위치와 어긋난 가이드가 나타난다. sortable 재배치는 index 기반이므로 좌표 스냅이 불필요하다.

### guideStore (`src/canvas/guideStore.ts`)

스냅 modifier(`createSnapModifier`)가 계산한 가이드 좌표(`vx[]`, `hy[]`)를 pub/sub으로 `GuideOverlay`에 전달한다. `queueMicrotask`로 렌더 중 React 업데이트를 방지한다.

## Undo / Redo 키보드 단축키

`EditorShell` useEffect에서 `window.addEventListener("keydown")`:
- `Ctrl/Cmd + Z` → `undo()`
- `Ctrl/Cmd + Shift + Z` → `redo()`

# 관련 개념

- [/overview/project.md](/overview/project.md) — 프로젝트 전체 개요
- [/store/editor-store.md](/store/editor-store.md) — Zustand 상태·액션 (addNode, moveNode 등)
- [/registry/component-registry.md](/registry/component-registry.md) — 팔레트가 참조하는 ComponentDef
