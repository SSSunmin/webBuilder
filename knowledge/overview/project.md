---
type: Project Overview
title: webBuilder 프로젝트 개요
description: 노코드 페이지 빌더 — 드래그&드롭으로 조립한 페이지를 AI/개발자용 MD 산출물로 출력한다.
resource: docs/PLAN.md, src/main.tsx, src/App.tsx
tags: [overview, architecture, stack]
timestamp: 2026-06-22
---

# webBuilder 프로젝트 개요

## 한 줄 정의

프로젝트별로 페이지를 드래그&드롭으로 조립하고, 결과를 **MD 명세서 / React 코드**로 export 하는 브라우저 전용 빌더.

## 핵심 가치 — 저장 vs Export

| | 저장 (Save) | Export |
|---|---|---|
| 목적 | 작업 내용 보존, 나중에 이어서 작업 | AI·개발자에게 넘길 산출물(MD) 생성 |
| 대상 | PageDocument 전체 | 명세서 / React 코드 / 둘 다 |
| 결과 | localStorage 또는 Supabase에 영속, 홈 목록에 반영 | `.md` 파일 다운로드 |
| 구현 | `StorageAdapter` (`LocalStorageAdapter` / `SupabaseStorageAdapter`) | `export/` 모듈 (`generateSpec` / `generateCode`) |

**저장 백엔드는 env로 선택** — Supabase 키가 있으면 백엔드(Postgres) 영속 + 이메일/비밀번호 인증·멀티유저(RLS), 없으면 브라우저 localStorage 전용(인증 없음). `StorageAdapter`/`AuthClient` 인터페이스가 추상화 경계이며, 자체 서버로 승격하려면 `ApiStorageAdapter`/`ApiAuthClient`를 추가하고 싱글톤만 교체한다. 상세: [/storage/storage-layer.md](/storage/storage-layer.md), [/auth/auth-layer.md](/auth/auth-layer.md).

## 기술 스택

| 레이어 | 선택 | 출처 확인 |
|---|---|---|
| 빌드 | Vite 5 + React 18 + TypeScript 5 | `package.json` |
| 라우팅 | React Router v6 | `package.json`, `src/App.tsx` |
| 상태관리 | Zustand v5 | `package.json`, `src/store/editorStore.ts` |
| 드래그&드롭 | @dnd-kit/core v6 | `package.json`, `src/app/EditorShell.tsx` |
| 스타일 | Tailwind CSS 3.4 | `package.json`, `tailwind.config.ts` |
| 폰트 | Pretendard Variable | `src/index.css` |
| 테스트 | Vitest 2 | `package.json`, `vite.config.ts` |

## 라우트 구조

```
/                   → Home (프로젝트 리스트)
/editor/:projectId  → Editor (에디터 전체)
*                   → Navigate to /   (fallback)
```

출처: `src/App.tsx`

## 폴더 구조

```
src/
├─ App.tsx               # 라우트 정의
├─ main.tsx              # React 진입점 (BrowserRouter 감쌈)
├─ index.css             # Tailwind base + Pretendard 폰트
├─ routes/
│  ├─ Home.tsx           # 프로젝트 리스트 화면
│  └─ Editor.tsx         # 프로젝트 로드 → EditorShell 렌더
├─ app/
│  └─ EditorShell.tsx    # 5-zone 에디터 레이아웃 + DnD Context
├─ components/           # BuilderHeader, PalettePane, CanvasPane,
│                        # LayerTreePane, InspectorPane, ExportModal 등
├─ canvas/
│  ├─ snap.ts            # 스냅 계산 로직 (computeSnap, snapResize 등)
│  └─ guideStore.ts      # 스냅 가이드라인 publish/subscribe
├─ store/
│  └─ editorStore.ts     # Zustand 에디터 상태·액션·undo/redo
├─ registry/
│  ├─ index.ts           # getComponentDef / createNode / listComponents
│  ├─ components.tsx     # ComponentDef 정의 (렌더 + toCode 포함)
│  └─ blocks.ts          # BlockDef 정의 (조합 블록 프리셋)
├─ export/
│  ├─ index.ts           # generateMarkdown (mode: spec|code|both)
│  ├─ spec.ts            # generateSpec — 사람·AI용 MD 트리
│  └─ code.ts            # generateCode — React+TS JSX 문자열
├─ storage/
│  ├─ StorageAdapter.ts  # 인터페이스 정의
│  ├─ LocalStorageAdapter.ts # localStorage 구현체
│  └─ index.ts           # storage 싱글턴 export
└─ types/
   ├─ page.ts            # PageDocument, PageNode, NodeFrame, Sides,
   │                     # BreakpointId, NodeOverride, resolveFrame 등
   ├─ component.ts       # ComponentDef, PropSchema, PropControl
   └─ events.ts          # EventBinding, EventTrigger, ActionType 등
```

## 화면 흐름

```
[Home /]
   └── "새 프로젝트" → createDocument() → storage.save() → navigate /editor/:id
   └── 카드 클릭 → navigate /editor/:id
            ↓
[Editor /editor/:projectId]
   └── storage.load(id) → loadDocument(doc) → EditorShell 렌더
            ↓
   [5-zone 에디터]
   팔레트 드롭 → addNode / addBlock
   선택 → Inspector 편집 → updateNodeProps / updateNodeFrame
   저장 버튼 → storage.save(document)
   Export 버튼 → generateMarkdown(doc, mode) → .md 다운로드
```

# 관련 개념

- [/architecture/editor-architecture.md](/architecture/editor-architecture.md) — 에디터 5-zone 구조 상세
- [/data-model/page-node.md](/data-model/page-node.md) — PageDocument / PageNode 타입
- [/store/editor-store.md](/store/editor-store.md) — Zustand 스토어 상태·액션
- [/registry/component-registry.md](/registry/component-registry.md) — ComponentDef / BlockDef
- [/export/export-format.md](/export/export-format.md) — MD 산출물 형식
- [/storage/storage-layer.md](/storage/storage-layer.md) — StorageAdapter 인터페이스·구현
- [/responsive/breakpoints.md](/responsive/breakpoints.md) — 브레이크포인트·override 모델
