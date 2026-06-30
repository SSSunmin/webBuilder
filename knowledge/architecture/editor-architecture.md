---
type: Architecture
title: 에디터 아키텍처 (5-zone)
description: EditorShell이 제공하는 5-zone 레이아웃, DnD 흐름(절대배치·flex 자식 reorder), 스냅 시스템, 키보드 단축키.
resource: src/app/EditorShell.tsx, src/routes/Editor.tsx, src/canvas/snap.ts, src/canvas/guideStore.ts, src/canvas/flowReorder.ts, src/canvas/flowDropStore.ts, src/components/NodeView.tsx
tags: [editor, dnd, snap, architecture, flex, reorder, flow]
timestamp: 2026-06-30
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

### onDragStart
- `palette` / `block` 종류면 `DragOverlay`에 라벨 표시
- `nodeId` 종류(캔버스 노드 이동)면 오버레이 없음 — 실제 DOM 요소가 직접 이동하므로 스냅이 실제 크기 기준으로 동작

### onDragOver

`onDragOver`는 `resolveFlowDrag`를 호출해 결과를 `flowDropStore`에 기록한다(삽입 인디케이터 표시 전용, 상태 변경 없음).

### onDragEnd
1. **palette** → `addNode(overNodeId, type, dropPosition)`
2. **block** → `addBlock(overNodeId, blockKey, dropPosition)`
3. **nodeId** (기존 노드):
   - **active 노드가 flex(flow) 컨테이너의 자식**이면 → `resolveFlowDrag` 결과에 따라 분기 후 **return**(절대배치 경로로 폴백하지 않음):
     - `{kind:"reorder", id, refId, side}` → `moveNodeAdjacent(id, refId, side)` (children 배열 splice)
     - `{kind:"reparent", id, parentId}` → `moveNode(id, parentId)` (다른 flex 컨테이너로 append)
     - `null` → 무시
   - **그 외(절대배치 노드)**:
     - drop 대상이 다른 컨테이너면 **reparent**: `moveNode(id, newParentId, snappedPos)`
     - 같은 부모 내 이동: `snapBox()` 계산 후 `moveNodeBy(id, dx, dy)`

## flex 자식 캔버스 DnD — Stage B (`src/canvas/flowReorder.ts`)

신규 의존성 0 — 기존 `@dnd-kit/core` + 기존 `moveNodeAdjacent` 재사용.

### `resolveFlowDrag(nodes, activeId, overId, activeRect, overRect)`

순수 함수. active 노드가 flex(flow) 컨테이너(`layout === "flex"`)의 직속 자식일 때만 동작한다:

| 케이스 | 반환 |
|---|---|
| overId가 **같은 flex 부모의 형제** | `{kind:"reorder", id, refId, side}` — `flowDropSide`로 주축 중심 비교해 `"before"` / `"after"` 결정 |
| overId가 **다른 flex 컨테이너** | `{kind:"reparent", id, parentId}` — 해당 컨테이너에 append |
| 그 외(비-flow 영역 등) | `null` — 호출부가 절대배치 경로로 폴백 |

`flowDropSide(active, over, direction)`: `row` → x 중심 비교, `column` → y 중심 비교.

### 삽입 인디케이터 (`src/canvas/flowDropStore.ts`)

`guideStore` 패턴을 따르는 외부 pub/sub 스토어. 상태: `{overId, side, direction}`.

- `onDragOver`가 `resolveFlowDrag` 결과로 스토어를 갱신
- `NodeView`가 구독해 호버 중인 형제 노드에 before/after 삽입선을 렌더

### `NodeView.tsx` — flow 자식 DnD 활성화

- `useDraggable`: `disabled: isRoot`만 — 모든 비루트 노드(절대배치·flow 자식 포함)에서 활성화
- `useDroppable`: `disabled: !container && !inFlow` — leaf 노드도 flow 자식이면 reorder 드롭 타깃으로 동작

### export / 미리보기 자동 반영

store·export 코어는 무변경. export·미리보기는 `node.children` 순서를 그대로 따르므로 `moveNodeAdjacent`로 변경된 순서가 자동 반영된다.

## 스냅 시스템 (`src/canvas/snap.ts`)

### SNAP_THRESHOLD = 6 (px)

두 단계 스냅을 경쟁시켜 더 가까운 쪽을 적용한다:

| 스냅 종류 | 함수 | 설명 |
|---|---|---|
| Edge snap | `edgeSnap()` | 이동 박스의 edge/center ↔ 형제·컨테이너 inner bound edge/center |
| Spacing snap | `spacingSnap()` | 형제 사이 등간격 (앞뒤 이웃이 있을 때 중앙 배치) |

마진 인식: `SnapBox.margin`이 있으면 형제 간격 계산 시 마진을 포함한다 (`boxEdges`).

리사이즈 스냅: `snapResize()` — bottom-right 코너를 형제·inner bound에 스냅.

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
