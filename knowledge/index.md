# Knowledge Bundle

> **Open Knowledge Format (OKF v0.1) 번들.**
> 각 `.md` = 개념(concept) 1개, YAML 프론트매터의 `type`이 필수.
> 사람이 읽고(`cat`/`git`), AI 에이전트가 컨텍스트로 읽으며, 조직 간 교환이 가능합니다.

## 개념 목록 (Concepts)

> 이 프로젝트는 **프론트엔드 전용** 노코드 페이지 빌더입니다. 자체 DB·백엔드 API가 없으므로 `database/` 개념은 없습니다. 저장은 브라우저 localStorage에만 영속됩니다.

### 개요

- [프로젝트 개요](/overview/project.md) — 무엇을·왜, 기술 스택, 폴더 구조, 저장 vs Export, 라우트

### 아키텍처

- [에디터 아키텍처 (5-zone)](/architecture/editor-architecture.md) — EditorShell 레이아웃, DnD 흐름, 스냅 시스템, 키보드 단축키

### 데이터 모델

- [PageDocument / PageNode](/data-model/page-node.md) — 저장 단위, 노드 트리, NodeFrame, Sides, NodeOverride, EventBinding, PropSchema

### 스토어

- [에디터 스토어 (Zustand)](/store/editor-store.md) — 상태 구조, 전체 액션, undo/redo coalescing, breakpoint 편집

### 레지스트리

- [컴포넌트 레지스트리](/registry/component-registry.md) — ComponentDef / BlockDef 구조, 등록된 컴포넌트·블록 전체 목록

### Export

- [MD Export 형식](/export/export-format.md) — spec/code/both 모드, 포터블 컨텍스트(서문+컴포넌트 범례), 명세서·코드 생성 규칙, 이벤트·override 출력

### 저장 계층

- [저장 계층 (StorageAdapter)](/storage/storage-layer.md) — 인터페이스, LocalStorageAdapter, localStorage 키 구조, 썸네일 생성(generateThumbnail)·quota fallback

### 반응형

- [브레이크포인트 편집 모델](/responsive/breakpoints.md) — desktop 기준 + tablet/mobile override 캐스케이드, resolveFrame/resolveHidden

## 번들 규칙 (OKF)
- **예약 파일**: `index.md`(이 파일, 목차), `log.md`(변경 이력). 그 외 모든 `.md`는 개념.
- **필수 프론트매터**: `type` (비어있지 않을 것). 권장: `title` `description` `resource` `tags` `timestamp`.
- **링크**: 번들 루트 기준 절대경로(`/...`)를 사용 — 파일이 옮겨가도 안정적.
- **소비 측 관용**: 누락 필드·모르는 `type`·깨진 링크는 너그럽게 무시.
- **DB 개념은 조건부**: 데이터베이스가 실제로 있는 프로젝트만 `database/`(data-model·erd)를 둔다. 프론트엔드 전용 등 DB 없는 프로젝트는 생략하고, 개요에 "자체 DB 없음(외부 API 소비)"을 명시한다.
- **디자인 토큰 개념도 조건부**: 디자인 시스템/토큰(`tokens.css`·`*.tokens.json` 등)이 있을 때만 `design/tokens`를 둔다. 없거나 별도 관리면 생략·삭제(자기완결형이라 파일 + index 항목만 지우면 됨).
