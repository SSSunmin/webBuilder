# Change Log

OKF 번들의 변경 이력. 최신 항목이 위. `/okf` 실행 시 knowledge-curator가 여기에 기록한다.

## 2026-06-30 (#4 Stage C-1 — grid 컨테이너 레이아웃 모드)

- `data-model/page-node.md`: frontmatter description/tags에 v6(Stage C-1) grid 반영. `LayoutMode` 유니온에 `"grid"` 추가. `PageNode` 필드 주석에 `gridColumns`/`gridRows` 신규 및 `gap`/`alignItems`/`justifyContent`의 flex·grid 공유 명시. "레이아웃 모드 (grid) — Stage C-1" 섹션 신설: 신규 필드 표, `ResolvedGrid` 인터페이스·`resolveGrid` 시그니처, gridTemplateRows 결정 로직, flex/grid 폴백 차이표, `resolveFlow`-stays-null 불변 조건, A03 신뢰경계(정수 강제·enum 폴백).
- `architecture/editor-architecture.md`: frontmatter description/tags 갱신. `NodeView.tsx` 섹션에 `useDraggable disabled: isRoot || inGrid` 조건 추가. "grid 자식은 캔버스 reorder 불가(Stage C-1 불변 조건)" 노트 신설 — `resolveFlow` null 보장으로 `resolveFlowDrag`가 grid 자식에 절대 적용되지 않음 설명.
- `index.md`: data-model 설명 줄에 grid/resolveGrid 언급 추가.

## 2026-06-30 (#4 Stage B — flex 자식 캔버스 드래그 순서변경)

- `architecture/editor-architecture.md`: `onDragOver` 섹션 신설(flowDropStore 갱신 역할), `onDragEnd`에 flex 자식 분기(reorder→`moveNodeAdjacent`/reparent→`moveNode`) 추가, "flex 자식 캔버스 DnD — Stage B" 섹션 신설(`resolveFlowDrag` 순수 함수·반환 케이스표·`flowDropStore` 삽입 인디케이터·`NodeView` 활성화 조건·export 자동 반영). frontmatter resource/tags/timestamp 갱신. 신규 의존성 0.
- `store/editor-store.md`: `moveNodeAdjacent` 설명에 Stage B reorder 연결 한 줄 추가.
- grid 배치·반응형 레이아웃은 Stage C 대기. 인터랙션 브라우저 QA는 아직 수동 완료 전(자율 구현 상태).

## 2026-06-30 (#1 Stage B2 — per-bp background 오버라이드)

- `data-model/page-node.md`: `NodeOverride`에 `background?: string` 추가. 신규 `resolveBackground(node,bp)` 문서화 — `resolvePadding`/`resolveMargin`과 동일한 데스크톱-퍼스트 캐스케이드·통째 교체·tablet→mobile 상속 구조. 반환 raw 값(리터럴 색상 | `token:<key>` | undefined), 호출부가 `resolveColor(…,tokens)` 적용. frontmatter description/tags 갱신.
- `store/editor-store.md`: `setNodeBackground` bp 인지화(desktop이면 base, 그 외면 `overrides[bp].background`에 저장, 형제 override 필드 보존). `clearOverrideField` field 타입에 `"background"` 추가. frontmatter description/tags 갱신.
- `export/export-format.md`: `overrideDecls` 표에 `background` 행 추가. 신규 `overrideBackgroundDecl`(항상 emit, 유효 색→그 색, 유효 토큰→`var(--color-*)`, dangling/unsafe→`transparent`, A03 동일 화이트리스트). spec.ts `overrideLines`에 `bgSummary(ov.background, tokens)` 추가. frontmatter description/tags 갱신.

## 2026-06-30 (#1 Stage B1 — per-bp padding/margin 오버라이드)

- `data-model/page-node.md`: `NodeOverride`에 `padding?: Sides|string`·`margin?: Sides|string` 추가. frame(축별 부분 병합) vs padding/margin(완전한 값 통째 교체) 차이 명시. 신규 `resolvePadding(node,bp)`·`resolveMargin(node,bp)` cascade 규칙 문서화(데스크톱-퍼스트, tablet→mobile 상속, raw 값 반환 후 호출부가 toSides 적용). frontmatter description/tags 갱신.
- `store/editor-store.md`: `updateNodeSpacing`·`setNodeSpacingValue` bp 인지화 설명 갱신(비-desktop이면 `overrides[bp]`에 완전한 Sides 기록). 신규 `clearOverrideField(id,bp,field)` 액션 추가(필드 1개 해제, 빈 override 자동 삭제, undo 태그 `clearov:<id>:<bp>:<field>`). `cloneOverrides` 깊은 복사 확장(padding/margin Sides 객체 복사) 문서화. `centerInParent` bp 인지(`resolvePadding` 사용) 추가. frontmatter description/tags 갱신.
- `export/export-format.md`: `overrideDecls`에 padding/margin 지원 추가, `tokens` 파라미터 명시. 신규 `overrideSpacingDecl`(0도 emit, dangling → `0`, base의 `spacingDecl`과 다른 이유 설명). spec.ts `overrideLines`의 pad/margin 직렬화(0→"0") 문서화. CSS cascade 주의사항(tablet @media가 375px에도 적용). frontmatter description/tags 갱신.

## 2026-06-30 (레이아웃 모델 Stage A — flex 컨테이너)

- `data-model/page-node.md`: `PageNode`에 신규 선택 필드 5개(`layout`/`flexDirection`/`gap`/`alignItems`/`justifyContent`) 추가. 신규 타입 `LayoutMode`/`FlowAlign`/`FlowJustify` 문서화. "레이아웃 모드(flex) — Stage A" 섹션 신설: `resolveFlow` 동작·enum→CSS 매핑표·하위호환(필드 없음=absolute)·신뢰경계(gap sanitize·enum 폴백). frontmatter description/tags/timestamp 갱신.
- `store/editor-store.md`: `setNodeLayout(id, partial)` 액션 추가(absolute 전환 시 `layout` 필드 삭제·flex 옵션 잔류·undo 태그 `layout:<id>:<keys>`). undo 태그 목록에 레이아웃 항목 추가. frontmatter description/tags/timestamp 갱신.
- `export/export-format.md`: code.ts — flex 컨테이너의 `.pg-N-c` 래퍼 클래스·`flowDecls` 선언 목록·자식 없으면 래퍼 생략 문서화; flow 자식의 `baseDecls(inFlow=true)` — `position:relative; flex:0 0 auto`(`left`/`top` 대신) 추가. spec.ts — `flowSummary`(flexDirection/gap/정렬·교차 비기본값만 출력)·flow 자식 `@(x,y)` 생략(`inFlow=true`) 문서화. frontmatter description/tags/timestamp 갱신.
- `index.md`: data-model 설명 줄에 레이아웃 모드(flex) 관련 타입 언급 추가.
- **미구현(Stage B/C)**: grid 배치, 캔버스 flow 자식 드래그 재배치는 이번 Stage A에 포함되지 않음.

## 2026-06-29 (디자인 토큰 v2 — 문서 전역 글꼴·간격 토큰)

- `data-model/page-node.md`: `PageDocument.meta.tokens?: DocumentTokens` 반영, `PageNode.background?`(색상 토큰 참조 허용)·`padding/margin?: Sides | string`(간격 토큰 참조) 타입 갱신, `toSides(v, tokens?)` 시그니처 갱신. 신규 "DocumentTokens — 문서 전역 디자인 토큰" 섹션(토큰 참조 모델 표·키 규칙·신뢰경계 sanitize 표). frontmatter tags/timestamp 갱신.
- `store/editor-store.md`: 디자인 토큰 액션 표(`setColorToken`/`setFontToken`/`setSpacingToken` + remove·`setNodeSpacingValue`), undo 태그(`token:color|font|spacing:<key>`), `updateNodeSpacing`의 토큰→Sides 전환 설명 추가.
- `export/export-format.md`: `tokensSection`(색상·글꼴·간격 스펙 섹션), `rootTokenBlock`(`:root`에 `--color-*`/`--space-*`/`--font-*`), `baseDecls`의 토큰 var() 참조·루트 `font-family: var(--font-body)`, 클래스명+`<style>` 출력 방식과 템플릿 리터럴 이스케이프 갱신.
- 신뢰경계(A03): `sanitizeColor`/`sanitizeFontFamily`/`sanitizeSpacing` 화이트리스트가 export 레이어에서 CSS 인젝션을 차단하며 dangling/unsafe는 `:root` 선언·`var()` 참조 양쪽에서 드롭됨을 세 문서 모두에 반영. 토큰은 외부 `tokens.css`가 아닌 문서 내부(`meta.tokens`) 모델이라 별도 `design/tokens` 개념 파일 없이 데이터 모델 문서에 둠.

## 2026-06-23 (백엔드 승격 — Supabase 영속·인증·멀티유저)

- `storage/storage-layer.md`: env 기반 어댑터 선택(`backendConfig.backendEnabled`), `SupabaseStorageAdapter`(projects 테이블·RLS·onConflict upsert), `InMemoryStorageAdapter` + `adapterContract` 공유 계약 테스트, "로컬→백엔드 가져오기", 자체 서버 승격 경로 추가. frontmatter resource/tags 갱신.
- `auth/auth-layer.md`(신규): `AuthClient` 추상화, `SupabaseAuthClient`, `AuthProvider`/`useAuth`(onChange 우선 초기화로 경쟁 상태 방지), `RequireAuth` 게이트, `Login`, 멀티유저 격리(RLS), env 설정.
- Supabase SDK는 `lib/supabaseClient.ts`·`storage/SupabaseStorageAdapter.ts`·`auth/supabaseAuthClient.ts` 3곳에만 격리. `index.md` 목차에 인증 섹션 추가. (이슈 #12)

## 2026-06-23 (Export 포터블화 — 컨텍스트 서문+컴포넌트 범례)

- `export/export-format.md`: 신규 "(0) 포터블 컨텍스트 — `generateContext`(`legend.ts`)" 섹션 추가. 모든 모드 본문 앞에 제공자 중립 읽는 법 서문 + `## 사용 컴포넌트` 범례(props 표·control 한글화·select 파이프 이스케이프·`코드 형태` toCode 예시)를 붙인다. `generateMarkdown` 공식·resource·tags·frontmatter 갱신. 목적: 코드베이스 밖의 임의 LLM/개발자가 산출물만으로 페이지 구현 가능(이슈 #11).

## 2026-06-22 (버튼 아이콘·호버·그림자·부모 정렬)

- `registry/component-registry.md`: 신규 아이콘 레지스트리(`src/registry/icons.ts`)·`PropControl "icon"`·Button props(icon/iconSize/hoverBg/hoverText)·Button 호버 방식 섹션 추가, resource/tags 갱신.
- `data-model/page-node.md`: `PageNode.boxShadow?: ShadowSpec`(픽셀 단위 x/y/blur/spread/color/opacity, 프리셋 아님)·`shadowCss`·`DEFAULT_SHADOW`, PropSchema control에 `"icon"` 추가.
- `store/editor-store.md`: `updateNodeShadow`/`clearNodeShadow`·`centerInParent` 액션, `findParentChild`/`sameParent` 헬퍼와 AlignToolbar 연동 설명.
- `export/export-format.md`: frameSummary에 `shadow`·iconSize 생략 규칙, frameStyle에 `boxShadow`·Button prop 전달.

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
