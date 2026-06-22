---
type: Reference
title: 저장 계층 (StorageAdapter)
description: StorageAdapter 인터페이스와 LocalStorageAdapter 구현체. localStorage 키 구조, save 시 updatedAt 갱신·썸네일 생성, quota fallback, duplicate 동작.
resource: src/storage/StorageAdapter.ts, src/storage/LocalStorageAdapter.ts, src/storage/index.ts, src/thumbnail/generateThumbnail.ts
tags: [storage, localStorage, adapter, persistence, thumbnail]
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
| `webbuilder:index` | `PageMeta[]` JSON | 프로젝트 목록 인덱스 (`thumbnail` 포함) |
| `webbuilder:project:<id>` | `PageDocument` JSON | 개별 프로젝트 전체 문서 |

> 썸네일이 인덱스와 문서 양쪽에 들어가므로, 페이지가 매우 복잡하면 인덱스가 커질 수 있다. 와이어프레임 SVG는 노드당 `<rect>` 하나뿐이라 보통 작지만, 한계(브라우저 localStorage ~5MB) 초과 시 `save()`의 quota fallback이 썸네일을 떨궈 본문 저장을 지킨다.

### `list()`

인덱스를 읽어 `updatedAt` 내림차순으로 정렬 후 반환.

### `load(id)`

`webbuilder:project:<id>` 키가 없으면 `throw new Error("Project not found: <id>")`.

### `save(doc)`

1. `generateThumbnail(doc)`으로 SVG 썸네일 data URI 생성 (아래 "썸네일 생성" 참조)
2. `meta.updatedAt`을 현재 ISO 시각으로 갱신, `meta.thumbnail`에 썸네일을 넣은 복사본을 저장
3. `webbuilder:project:<id>`에 전체 문서 직렬화
4. 인덱스에 해당 meta를 `unshift` (최신 먼저, 중복 id는 필터 후 재삽입). 인덱스 meta에도 `thumbnail`이 포함된다 — 홈 카드가 전체 문서 로드 없이 미리보기를 그릴 수 있게.

실제 쓰기는 private `persist(doc, updatedAt, thumbnail)`가 담당한다. 2~4단계 중 `localStorage.setItem`이 **`QuotaExceededError`**(용량 초과)로 실패하면, `isQuotaError()`로 판별 후 **썸네일 없이 한 번 더 `persist`** 한다 — 썸네일(가장 크고 선택적인 필드)만 떨궈서 프로젝트 본문 저장은 보존한다. quota 외 에러는 그대로 throw.

### `remove(id)`

프로젝트 키 삭제 + 인덱스에서 해당 meta 제거.

### `duplicate(id)`

1. `load(id)` → 원본 문서 복사
2. 새 `crypto.randomUUID()` id 부여
3. `nodes: structuredClone(source.nodes)` (deep copy)
4. 이름: `"<원본 이름> (복사본)"`
5. `save(copy)` 후, **인덱스에서 방금 저장된 meta를 다시 읽어 반환**한다 (`readIndex().find(...)`). save 이전의 `copy.meta`는 `updatedAt`·`thumbnail`이 비어 있으므로, 완전한 `PageMeta`(썸네일 포함)를 돌려주기 위해 인덱스 값을 사용한다.

## 썸네일 생성 (`src/thumbnail/generateThumbnail.ts`)

홈 카드 미리보기를 위한 순수 함수. **DOM 캡처·외부 라이브러리 없이** 노드 트리에서 SVG 와이어프레임을 합성한다 — 노드가 절대 프레임(`frame.x/y/w/h`)을 가지므로 데이터만으로 그릴 수 있다.

```ts
generateThumbnail(doc: PageDocument): string  // "data:image/svg+xml,<encoded svg>"
```

- 루트의 `frame.w/h`를 SVG `viewBox`로 삼고, `preserveAspectRatio="xMidYMid meet"`로 카드 비율(`aspect-[4/3]`)에 맞춘다.
- 트리를 깊이우선 순회하며 **부모 오프셋을 누적**해 각 노드의 절대 좌표를 구한다 (`x = ox + child.frame.x`). NodeView의 `position:absolute; left/top` 모델과 일치.
- `background`가 있으면 채운 `<rect>`, 없으면 외곽선만(`#f8fafc`/`stroke #e2e8f0`)으로 구조만 보이게. 루트는 배경 없으면 흰색.
- **방어**: 누락된 자식 참조 무시, `seen` Set으로 순환 참조 차단, 음수 `borderRadius` → `rx` 생략, `sanitizeColor()`로 hex/rgb·hsl·키워드만 허용해 SVG 속성 이탈 방지. `<img src>`로 렌더하므로 data URI 내 스크립트는 실행되지 않는다.
- **데스크탑 기준 frame만 사용**(브레이크포인트 override 미반영) — 와이어프레임 목적의 의도된 단순화.

소비처: `LocalStorageAdapter.save()`(생성·저장), `routes/Home.tsx`(카드 `<img src={p.thumbnail}>`, 없으면 "미리보기 없음" 플레이스홀더).

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
