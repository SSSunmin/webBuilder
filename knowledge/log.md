# Change Log

OKF 번들의 변경 이력. 최신 항목이 위. `/okf` 실행 시 knowledge-curator가 여기에 기록한다.

## 2026-06-22 (프로젝트 JSON import/export)

- `storage/storage-layer.md` "JSON import/export" 섹션을 stale 메모(미확인)에서 실제 구현으로 갱신: `src/storage/projectFile.ts`(serialize/parse·검증/prepareImport), `src/lib/download.ts`(slugify·downloadFile), BuilderHeader "JSON ↓" 내보내기, Home "가져오기" 흐름·검증 범위·id 정책 문서화. frontmatter resource/tags 갱신.

## 2026-06-22 (홈 카드 썸네일)

- `storage/storage-layer.md` 갱신: `save()`가 `generateThumbnail(doc)`으로 SVG 썸네일을 생성해 문서·인덱스 양쪽에 저장, `QuotaExceededError` 시 썸네일 없이 재시도(private `persist`), `duplicate()`는 인덱스에서 완전한 meta를 읽어 반환. 신규 "썸네일 생성"(`src/thumbnail/generateThumbnail.ts`) 섹션 추가.
- `data-model/page-node.md` 갱신: `PageMeta.thumbnail?` 필드 문서화.

## 2026-06-22

초기 번들 생성 (7개 개념 파일 신규 작성):
- `overview/project.md` — 프로젝트 개요, 기술 스택, 폴더 구조, 저장 vs Export, 자체 DB 없음 명시
- `architecture/editor-architecture.md` — 5-zone 레이아웃, DnD 흐름, 스냅 시스템
- `data-model/page-node.md` — PageDocument/PageNode/NodeFrame/Sides/NodeOverride/EventBinding 타입
- `store/editor-store.md` — Zustand 상태 구조, 전체 액션, undo/redo coalescing
- `registry/component-registry.md` — ComponentDef/BlockDef 구조, 등록 컴포넌트·블록 전체 목록
- `export/export-format.md` — spec/code/both 생성기, 이벤트·override 출력 규칙
- `storage/storage-layer.md` — StorageAdapter 인터페이스, LocalStorageAdapter 구현 상세
- `responsive/breakpoints.md` — 브레이크포인트 캐스케이드, resolveFrame/resolveHidden

<!-- 예시:
## 2026-01-01
- 초기 번들 생성: overview, data-model, api 개념 추가.
-->
