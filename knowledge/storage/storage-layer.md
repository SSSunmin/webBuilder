---
type: Reference
title: 저장 계층 (StorageAdapter)
description: StorageAdapter 인터페이스와 구현체들(Local/Supabase/InMemory). env 기반 어댑터 선택, Supabase 영속·RLS, 공유 계약 테스트, localStorage 키 구조, save 시 updatedAt 갱신·썸네일 생성, quota fallback, duplicate, JSON import/export, 자체 서버 승격 경로.
resource: src/storage/StorageAdapter.ts, src/storage/LocalStorageAdapter.ts, src/storage/SupabaseStorageAdapter.ts, src/storage/InMemoryStorageAdapter.ts, src/storage/adapterContract.ts, src/storage/index.ts, src/storage/projectFile.ts, src/lib/backendConfig.ts, src/lib/supabaseClient.ts, src/lib/download.ts, src/thumbnail/generateThumbnail.ts
tags: [storage, localStorage, supabase, adapter, persistence, thumbnail, import-export, rls, multiuser]
timestamp: 2026-06-23
---

# 저장 계층 (StorageAdapter)

앱은 `StorageAdapter` 인터페이스에만 의존한다. 구현체는 셋: `LocalStorageAdapter`(브라우저 localStorage), `SupabaseStorageAdapter`(백엔드·멀티유저), `InMemoryStorageAdapter`(테스트·승격 참조). **어느 구현체를 쓸지는 env로 결정**(아래 "어댑터 선택")되며, 자체 서버로 승격하려면 `ApiStorageAdapter`를 추가하고 싱글톤만 바꾸면 된다.

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

## 어댑터 선택 (`storage/index.ts` + `lib/backendConfig.ts`)

```ts
// lib/backendConfig.ts — import.meta.env 접근을 한 곳에 모음
export const backendEnabled = Boolean(VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY);

// storage/index.ts
export const storage: StorageAdapter = backendEnabled
  ? new SupabaseStorageAdapter()
  : new LocalStorageAdapter();
```

- **두 env 변수가 모두 있으면**(`.env.local` 주입) → Supabase 영속 + 인증 필수.
- **없으면**(기본; 테스트·오프라인 dev) → 기존 그대로 `LocalStorageAdapter`, 인증 게이트 없음. **회귀 없음.**
- 앱 전역은 이 `storage` 싱글톤만 import한다. 구현체 교체는 이 분기 한 곳.

## SupabaseStorageAdapter (`SupabaseStorageAdapter.ts`)

`projects` 테이블(스키마·RLS는 `supabase/migrations/0001_projects.sql`) ↔ `PageDocument`/`PageMeta` 매핑. **인증 사용자별 격리는 Postgres RLS가 강제**하므로 어댑터는 `user_id`로 필터하지 않는다 — 모든 쿼리가 이미 호출자 행만 본다.

| 메서드 | 쿼리 |
|---|---|
| `list` | `select id,name,updated_at,thumbnail order by updated_at desc` → `PageMeta[]` |
| `load` | `select doc .eq(id) .maybeSingle()` → `doc`(없으면 throw) |
| `save` | private `persist`: `updatedAt`·`generateThumbnail` 스탬프 후 `upsert(row, {onConflict:"id"})` |
| `remove` | `delete().eq(id)` (없는 id는 no-op) |
| `duplicate` | `load` → 새 id·`(복사본)` → `persist` |

- Supabase SDK(`@supabase/supabase-js`)를 import하는 파일은 **정확히 3곳**: `lib/supabaseClient.ts`(클라이언트 생성), `SupabaseStorageAdapter.ts`, `auth/supabaseAuthClient.ts`. 컴포넌트·스토어는 직접 import 금지 → 자체 서버 승격 시 영향 최소화.
- `projects` 행: `id, user_id(default auth.uid()), name, doc(jsonb), thumbnail, created_at, updated_at`. `doc`이 진실원본, `name`/`thumbnail`/`updated_at`은 `list` 경량 조회용 파생.

## InMemoryStorageAdapter + 공유 계약 테스트

- `InMemoryStorageAdapter.ts` — 순수 인메모리 구현. 계약 테스트 기반 + 향후 `ApiStorageAdapter` 참조.
- `adapterContract.ts` — `runStorageAdapterContract(label, makeAdapter, setup?)`: 임의 어댑터에 save/load 라운드트립·updatedAt·썸네일·list·remove·duplicate·미존재 throw 불변식을 돌린다. `storageContract.test.ts`가 InMemory·Local에 적용(Supabase는 목 단위 테스트 `SupabaseStorageAdapter.test.ts`로 쿼리 구성·매핑 검증, 실연동은 프로비저닝 후 수동).

## 자체 서버 승격 경로

1. `ApiStorageAdapter`(REST 호출) + `ApiAuthClient`(JWT) 작성 → `storage`(`storage/index.ts`)·`authClient`(`auth/index.ts`) 싱글톤 2줄 교체.
2. 데이터 이전: Supabase는 순수 Postgres라 `pg_dump` → 자체 DB.
3. RLS 재구현: DB 정책 `auth.uid() = user_id`를 서버 미들웨어 권한체크로.
4. 가장 비싼 곳은 인증 사용자/세션 이전 — 그래서 `AuthClient` seam을 지금부터 둔다([/auth/auth-layer.md](/auth/auth-layer.md)).

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

`PageDocument` 전체를 `.json`으로 백업/복원한다. MD Export(`src/export/`)와는 **별개** — 이쪽은 작업을 이어가기 위한 프로젝트 파일이다. 로직은 `src/storage/projectFile.ts` (순수), 다운로드 트리거는 `src/lib/download.ts`.

```ts
serializeProject(doc): string          // JSON.stringify(doc, null, 2)
parseProject(raw): PageDocument        // 파싱 + 구조 검증, 실패 시 ProjectFileError throw
prepareImport(doc): PageDocument       // 새 프로젝트 id 부여(+ version 고정)
```

- **Export**: `BuilderHeader`의 "JSON ↓" 버튼 → `downloadFile(slugify(name).json, serializeProject(doc), "application/json")`.
- **Import(파일)**: `Home`의 "파일 가져오기" 버튼 → 숨김 `<input type=file accept=.json>` → `parseProject(await file.text())` → `prepareImport()` → `storage.save()` → 에디터로 이동. 실패 시 `ProjectFileError` 메시지를 카드 상단에 표시(그 외 오류는 일반 안내).
- **Import(로컬→백엔드)**: backendEnabled일 때만 `Home`에 "로컬 가져오기" 노출 → `new LocalStorageAdapter().list()`→각 `load()`→`prepareImport()`(fresh id)→`storage.save()`(=현재 백엔드 어댑터). 개별 실패는 건너뛰고 성공/실패 건수를 안내. 재실행은 매번 새 복사본을 만든다(덮어쓰지 않음).
- **`parseProject` 검증 범위**: `rootId`(string)·`nodes`(object)·`meta.name`(string) 존재, `rootId ∈ nodes`, 그리고 **각 노드의 `type`(string)·`children`(array)**. 누락된 per-node `frame` 등은 로드 시 `editorStore.normalizeDocument`가 백필한다. 미등록 `type`은 캔버스에서 빈 렌더(`NodeView`가 `getComponentDef` 미스 시 null).
- **`prepareImport`는 프로젝트 id만 교체**(노드 id는 유지) — 프로젝트가 각각 독립 localStorage 키에 저장되어 노드 id는 문서 내 유일성만 보장하면 되기 때문. 새 id 덕에 import가 기존 프로젝트를 **덮어쓰지 않는다**.
- `downloadFile`은 별도 모듈 — `BuilderHeader`가 스토어 문서를 `document`로 받아 DOM `document`를 가리는 섀도잉 함정을 피한다. Firefox/Safari 호환을 위해 `<a>`를 body에 append 후 click, `revokeObjectURL`은 지연 호출.

# 관련 개념

- [/data-model/page-node.md](/data-model/page-node.md) — 저장되는 PageDocument / PageMeta 타입
- [/export/export-format.md](/export/export-format.md) — 저장과 독립된 MD Export
- [/overview/project.md](/overview/project.md) — "자체 DB 없음" 및 저장 vs Export 구분
