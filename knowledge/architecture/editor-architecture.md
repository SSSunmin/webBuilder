---
type: Architecture
title: 에디터 아키텍처 (5-zone)
description: EditorShell이 제공하는 5-zone 레이아웃, DnD 흐름, 스냅 시스템, 키보드 단축키.
resource: src/app/EditorShell.tsx, src/routes/Editor.tsx, src/canvas/snap.ts, src/canvas/guideStore.ts
tags: [editor, dnd, snap, architecture]
timestamp: 2026-06-22
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

### onDragEnd
1. **palette** → `addNode(overNodeId, type, dropPosition)`
2. **block** → `addBlock(overNodeId, blockKey, dropPosition)`
3. **nodeId** (기존 노드):
   - drop 대상이 다른 컨테이너면 **reparent**: `moveNode(id, newParentId, snappedPos)`
   - 같은 부모 내 이동: `snapBox()` 계산 후 `moveNodeBy(id, dx, dy)`

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
