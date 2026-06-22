---
type: Reference
title: 저장 계층 (StorageAdapter)
description: StorageAdapter 인터페이스와 LocalStorageAdapter 구현체. localStorage 키 구조, save 시 updatedAt 갱신, duplicate 동작.
resource: src/storage/StorageAdapter.ts, src/storage/LocalStorageAdapter.ts, src/storage/index.ts
tags: [storage, localStorage, adapter, persistence]
timestamp: 2026-06-22
---

# 저장 계층 (StorageAdapter)

앱은 `StorageAdapter` 인터페이스에만 의존한다. 현재 구현체는 `LocalStorageAdapter` (브라우저 localStorage). 추후 `ApiStorageAdapter`로 교체하면 백엔드·멀티유저로 승격할 수 있다.

## 인터페이스 (`StorageAdapter.ts`)

```ts
interface StorageAdapter {
  list(): Promise<PageMeta[]>;         // 홈 목록용 경량 메타 배열
  load(id: string): Promise<PageDocument>; // 전체 문서 로드 (없으면 throw)
  save(doc: PageDocument): Promise<void>;  // 저장 (updatedAt 자동 갱신)
  remove(id: string): Promise<void>;   // 삭제
  duplicate(id: string): Promise<PageMeta>; // 복제 → 새 PageMeta 반환
}
```

## 앱 싱글턴 (`storage/index.ts`)

```ts
export const storage: StorageAdapter = new LocalStorageAdapter();
```

앱 전역에서 이 인스턴스를 import하여 사용한다. 구현체를 바꾸려면 이 한 줄만 교체한다.

## LocalStorageAdapter 구현 상세

### localStorage 키 구조

| 키 | 값 | 설명 |
|---|---|---|
| `webbuilder:index` | `PageMeta[]` JSON | 프로젝트 목록 인덱스 (경량) |
| `webbuilder:project:<id>` | `PageDocument` JSON | 개별 프로젝트 전체 문서 |

### `list()`

인덱스를 읽어 `updatedAt` 내림차순으로 정렬 후 반환.

### `load(id)`

`webbuilder:project:<id>` 키가 없으면 `throw new Error("Project not found: <id>")`.

### `save(doc)`

1. `meta.updatedAt`을 현재 ISO 시각으로 갱신한 복사본을 저장
2. `webbuilder:project:<id>`에 전체 문서 직렬화
3. 인덱스에 해당 meta를 `unshift` (최신 먼저, 중복 id는 필터 후 재삽입)

### `remove(id)`

프로젝트 키 삭제 + 인덱스에서 해당 meta 제거.

### `duplicate(id)`

1. `load(id)` → 원본 문서 복사
2. 새 `crypto.randomUUID()` id 부여
3. `nodes: structuredClone(source.nodes)` (deep copy)
4. 이름: `"<원본 이름> (복사본)"`
5. `save(copy)` 후 새 `PageMeta` 반환

## 저장 ≠ Export

저장은 `StorageAdapter.save()` → localStorage 영속.
Export는 `src/export/` 모듈 → `.md` 파일 다운로드.
두 경로는 완전히 독립적이다. Export해도 저장 내용이 바뀌지 않고, 저장해도 Export 파일이 생성되지 않는다.

## JSON import/export (프로젝트 파일 백업)

`PageDocument` 전체를 JSON으로 import/export하는 기능이 계획되어 있으나 (PLAN.md 명시), 현재 코드에서 해당 UI 구현 위치는 (미확인) — ExportModal 또는 BuilderHeader에 존재할 수 있음.

# 관련 개념

- [/data-model/page-node.md](/data-model/page-node.md) — 저장되는 PageDocument / PageMeta 타입
- [/export/export-format.md](/export/export-format.md) — 저장과 독립된 MD Export
- [/overview/project.md](/overview/project.md) — "자체 DB 없음" 및 저장 vs Export 구분
