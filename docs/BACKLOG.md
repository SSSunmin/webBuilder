# webBuilder — 백로그 (포스트-MVP)

> MVP(드래그앤드롭·브레이크포인트·Supabase·MD export) 이후 순차 진행할 기능. 핵심 가치는
> **시각 빌드 → 자기완결 export(임의 LLM/개발자가 받아 구현 가능)**. 위에서부터 순서대로 진행.
>
> 원본 기획은 [PLAN.md](./PLAN.md). 이 문서는 그 다음 단계의 실행 백로그.

작성일: 2026-06-24

| # | 기능 | 상태 | 한 줄 |
|---|------|------|-------|
| 1 | 반응형 export 강건화 | 완료 (A·B1·B2) | frame/hidden 반응형(A) + per-bp padding/margin(B1)·background(B2) 오버라이드 |
| 2 | 이벤트/액션 완성 | 완료 | submit·custom 액션을 실제 코드로 생성 |
| 3 | 디자인 토큰/테마 | v2(색상·폰트·간격) 완료 | 문서 전역 색상·글꼴·간격 토큰 + 노드 참조 + export(:root/var) |
| 4 | 레이아웃 모델(flex/grid) | A·B·C-1·C-2·C-3 완료 | flex 컨테이너(A). B=flex 자식 드래그 순서변경(sortable+DragOverlay). C-1=grid 컨테이너. C-2=per-bp 레이아웃 파라미터 오버라이드. C-3=flex↔grid 모드 per-bp 스왑 |

---

## 1. 반응형 export 강건화  ← 먼저

**문제**: 지금 브레이크포인트는 `frame`·`hidden`만 cascade되고, 코드 export는 절대위치 +
미디어쿼리가 없다. "반응형·자기완결"이라는 핵심 약속의 가장 약한 고리.

**Stage A — 완료 (2026-06-24)**
- 코드 export를 inline `style={{}}` → `className="pg-N"` + 생성된 `<style>` 스타일시트로 전환.
  inline style은 media query를 못 담기 때문(근본 제약).
- 이미 편집 가능한 데이터(`frame`·`hidden` 오버라이드)를 `@media (max-width: 768px)`(태블릿)·
  `(max-width: 375px)`(모바일) 블록으로 emit. cascade 순서가 `resolveFrame`/`resolveHidden`
  (데스크톱-퍼스트)와 일치(태블릿 블록이 모바일보다 먼저 → 375px에서 모바일 승).
- 신뢰경계: 사용자 문자열(`background` 등)이 `<style>` 템플릿 리터럴을 탈출하지 못하도록
  역따옴표/`${` 이스케이프.
- 검증: `src/export/code.ts`, 테스트 `src/export/export.test.ts`(반응형 4 + 인젝션 1), 180 통과.
- spec export는 이미 frame/hidden 오버라이드를 직렬화 중(변경 불필요).

**근거 파일(Stage A)**: `src/store/*`(오버라이드 cascade), `src/export/code.ts`, `src/types/page.ts`.

**완료 기준(Stage A)**: 노드에 태블릿 frame·모바일 hidden을 주고 export하면 코드에 해당 `@media`
규칙이 생성된다(증거: 위 테스트 + 샘플 출력으로 확인 완료).

---

### Stage B — per-breakpoint 스타일 오버라이드 (padding·margin·background)  · 상태 완료 (B1·B2)

**B1 — 완료 (2026-06-30, 브랜치 `task/1-bp-spacing-override`)**: padding·margin per-bp 오버라이드.
- `NodeOverride`에 `padding`·`margin`(`Sides | string`, 완전한 값 통째 교체) 추가 — 전 문서 하위호환.
- `resolvePadding`/`resolveMargin(node, bp)`: 데스크톱-퍼스트 cascade(정의 시 통째 치환, tablet→mobile 상속).
- store: `updateNodeSpacing`·`setNodeSpacingValue` bp 인지화(bp≠desktop → resolved-at-bp seed한 완전 Sides를
  `overrides[bp]`에 기록, desktop 경로 보존), `cloneOverrides` 깊은 복사, 신규 `clearOverrideField`(필드 단위 해제),
  `centerInParent`도 `resolvePadding`로 bp 인지화.
- export: 코드 `overrideSpacingDecl`(override는 0도 emit해 base를 이김; 토큰→var, dangling→0) + `@media` 블록,
  스펙 `overrideLines`에 pad/margin. **A03**: base와 동일 `sanitizeSpacing`/토큰 화이트리스트만 통과.
- 캔버스(`NodeView`)·인스펙터(resolved-at-bp 표시 + "이 화면서 변경됨" 배지 + ↺ 해제) bp 반영.
- 검증: typecheck·build 통과, 테스트 256개(resolver·store·clearOverrideField·code/spec emit·회귀 +31).
- 리뷰(code-reviewer): critical 2(centerInParent bp 누락·cloneOverrides 가드) 해소, A03 레드플래그 없음.

**B2 — 완료 (2026-06-30, 브랜치 `task/1-bp-bg-override`)**: background per-bp 오버라이드.
- `NodeOverride.background`(리터럴색|token:ref), `resolveBackground(node,bp)` 통째 교체 cascade.
- store: `setNodeBackground` bp 인지화, `clearOverrideField`에 `"background"` 추가.
- export: `overrideBackgroundDecl`(override는 항상 emit해 base를 이김; 유효 색/토큰→그 색,
  dangling/unsafe→`transparent`) + `@media`, spec `overrideLines`에 bg. **A03**: base와 동일 `sanitizeColor`만 통과.
- 캔버스(`NodeView`)·인스펙터(resolved-at-bp + 변경됨 배지 + ↺) bp 반영.
- 검증: eslint 0 errors, build·테스트 281개(+28: resolver·store·code/spec·dangling→transparent·A03 회귀).
- 리뷰(code-reviewer): critical 0, A03 레드플래그 없음.

> 부수: B1/B2 테스트 파일의 eslint 미사용 변수 정리(CI lint 통과). #15(B1) CI도 동일 수정으로 그린.

**목표**: 노드별 태블릿/모바일 오버라이드를 `frame`/`hidden` 외에 **padding·margin·background**까지
확장. Stage A의 `@media` 인프라 위에 얹는다. **전 문서 100% 하위호환**(additive, 마이그레이션 없음).

**현황(코드 근거)**: `NodeOverride`(`page.ts`)는 `{ frame?, hidden? }`뿐. cascade는 `resolveFrame`/
`resolveHidden`만 존재 — padding/margin/bg resolver 없음. export(`code.ts:overrideDecls`,
`spec.ts:overrideLines`)·Inspector(bp 인지 편집)·`cloneOverrides`도 frame/hidden만 처리.

**범위 (In / Out)**
- **In**: `NodeOverride`에 `padding`·`margin`·`background` 추가, 데스크톱-퍼스트 cascade resolver
  3종, 코드 export `@media` emit + A03 sanitize 재적용, 스펙 `overrideLines` 확장, 캔버스 bp 반영,
  Inspector bp 인지(override-only 표시 + per-필드 "변경됨" 표식).
- **Out → Stage C**: borderRadius·boxShadow 오버라이드, per-bp 레이아웃(flex gap/direction)
  오버라이드, per-side 부분 병합, per-bp 토큰 *정의*, 반응형 폰트, `PreviewModal`의 bp 미리보기.

**PR 분할 (확정)**
- **B1 = 간격**(padding·margin): `Sides|string`·`spacingDecl`·`cloneOverrides` 깊은 복사·per-side seed.
- **B2 = 배경**(background): `string`·`sanitizeColor`·토큰 참조. (B1 다음, 더 작음.)

**데이터 모델(`src/types/page.ts`)** — 전부 선택, 기존 문서 무변경:
```ts
interface NodeOverride {
  frame?: Partial<NodeFrame>;     // 기존 (축별 부분 병합)
  hidden?: boolean;               // 기존
  padding?: Sides | string;       // B1 — 완전한 Sides 또는 token:<key> (부분 아님)
  margin?: Sides | string;        // B1
  background?: string;            // B2 — 리터럴 색 또는 token:<key>
}
```
> ⚠️ frame은 `Partial`(축별 병합)이지만 padding/margin/background는 **완전한 값을 통째 교체**한다.
> Inspector에서 한 변만 편집해도 override엔 *resolved-at-bp로 seed한 완전한 Sides*를 쓴다.

**cascade(resolver 신규, `page.ts`)**: `resolvePadding`/`resolveMargin`/`resolveBackground(node, bp)`.
데스크톱-퍼스트 `base → tablet → mobile`로 `resolveFrame`과 **순서 동일·병합 방식 다름**(정의 시 통째
치환, spread 병합 금지). 반환은 raw 값 → 호출부가 기존 `toSides(…,tokens)`/`resolveColor(…,tokens)`로
마무리(dangling→드롭 일관).

**export(`code.ts`·`spec.ts`)**: `overrideDecls`에 padding/margin/background 분기 추가 — **base와 동일
헬퍼**(`spacingDecl`/`isColorTokenRef`+`sanitizeColor`) 재사용(raw 보간 금지). CSS cascade가 자동
보장(태블릿 블록이 375px에도 적용 → mobile 미정의 시 상속). 신뢰경계(A03): 오버라이드 값도
`sanitizeColor`/`sanitizeSpacing` 화이트리스트만 통과, dangling/unsafe는 `@media` 규칙에서 드롭.

**store(`editorStore.ts`)**: `updateNodeSpacing`·`setNodeSpacingValue`·`setNodeBackground`를 bp 인지로
확장(`activeBreakpoint`, `updateNodeFrame`/`writeFrame`과 동형; desktop 경로는 정확히 보존).
`writeOverrideStyle` 헬퍼 신설, `cloneOverrides`에 padding(깊은)·margin·background 추가(**누락 시
복제 누수**), `resetOverride`는 bp 전체 삭제라 신규 필드 자동 커버(무변경).

**Inspector(`InspectorPane.tsx`)**: 기존 브레이크포인트 컨텍스트(`isCustomBp` 배너 + 초기화 버튼)
재사용. `BackgroundControl`/`SpacingControl`이 이미 해당 액션을 호출 → 액션 bp 인지화로 UI 재구조화
없이 동작. **표시 정책 = override-only + per-필드 "이 화면서 변경됨" 표식**(+ 필드별 ↺ 해제).

**완료 기준(Acceptance)**: 노드에 **태블릿 padding·모바일 background 오버라이드**를 주고 export하면
`@media(max-width:768px)`에 padding 규칙·`@media(max-width:375px)`에 background 규칙이 생성되고,
토큰/리터럴 값은 `sanitize*` 화이트리스트만 통과하며, **기존 frame/hidden 동작은 그대로**임이
특성화 테스트로 증명된다.

**vitest 케이스(~19)**
- resolver(`page.test.ts`): ①override 없음→base ②태블릿 override가 태블릿·모바일 적용(상속)
  ③모바일이 모바일에서 승 ④**통째 교체**(병합 아님) ⑤`resolveBackground` cascade+토큰 보존
  ⑥dangling→undefined
- store(`editorStore.test.ts`): ⑦spacing@태블릿→`overrides.tablet.padding`(완전 Sides), base 불변
  ⑧background@모바일→override, base 불변 ⑨desktop 편집→여전히 base(**회귀**)
  ⑩`cloneOverrides`/`duplicateNode` 깊은 복사 ⑪`resetOverride`가 신규 필드 제거 ⑫bp 편집 undo
- export code(`export.test.ts`): ⑬태블릿 padding→768 블록 ⑭모바일 background→375 블록
  ⑮태블릿+모바일 블록 순서 ⑯override 토큰→`var()`, dangling 드롭 ⑰**A03** 인젝션 드롭
  ⑱**회귀** frame/hidden emit 불변
- export spec(`export.test.ts`): ⑲`overrideLines`에 태블릿 padding·background + frame/hidden 회귀

**영향 파일**: `src/types/page.ts` · `src/store/editorStore.ts` · `src/export/code.ts` ·
`src/export/spec.ts` · `src/components/NodeView.tsx` · `src/components/InspectorPane.tsx` ·
테스트 3종(`page.test.ts`·`editorStore.test.ts`·`export.test.ts`).

**위험·불확실**: (R2 높음) padding/margin/bg는 **통째 교체** — `resolveFrame` spread 패턴 복붙 시 버그.
(R3 A03 필수) override 값은 base와 동일 sanitize 헬퍼 경유 — 인젝션 회귀 테스트 필수. (R4)
`cloneOverrides` 신규 필드 누락=복제 누수. (R6 확인) `PreviewModal`의 bp 렌더 여부 — desktop 전용이면
미리보기는 Out(착수 시 1줄 확인). 되돌리기 어려운 변경 없음(additive·마이그레이션 없음).

## 2. 이벤트/액션 완성

**문제**: `submit`·`custom` 액션이 export에서 TODO 주석으로만 나감
(`src/types/events.ts` 부근). export 완결성을 떨어뜨림.

**범위**
- submit: 폼 → 엔드포인트 제출 코드(fetch) 생성.
- custom: 설명을 받아 핸들러 스텁이 아니라 의미 있는 코드/구조로.
- 기존 navigate/openUrl/scrollTo와 일관된 출력.

**완료 기준**: submit·custom 바인딩이 있는 페이지를 export하면 TODO 주석이 아니라
동작하는(또는 명확히 구현 가능한) 코드가 생성된다.

## 3. 디자인 토큰/테마

**문제**: 색·폰트·간격이 하드코딩. 추후 **회사 디자인 컴포넌트를 레지스트리에 연동**하려면
토큰 토대가 먼저 필요(메모: 컴포넌트 방향 — shadcn 안 씀).

**범위**
- 전역 토큰(색/폰트/간격) 정의 + 인스펙터에서 토큰 참조.
- export에 토큰을 변수/테마로 반영.

**v1 — 색상 토큰 완료 (2026-06-29)**
- 문서 메타에 `tokens.colors`(이름→색). 노드는 색 필드에 `token:<key>` 센티넬로 참조(`src/types/page.ts`).
- 인스펙터: `ColorTokenManager`(토큰 추가/편집/삭제) + `BackgroundControl`(커스텀 색 ↔ 토큰 선택).
- 한 토큰 값 변경 → 캔버스·미리보기·썸네일·코드/스펙 export에 일괄 반영(단일 출처).
- 코드 export: `:root { --color-<key> }` + 노드 `var(--color-<key>)`. 스펙: "디자인 토큰" 섹션 + 해석값.
- dangling ref(삭제된 토큰): 다섯 레이어 모두에서 배경만 드롭(노드는 보존), `resolveColor → undefined`로 일관.
- 신뢰경계: 토큰 값·리터럴 배경색은 `sanitizeColor` 화이트리스트(hex/rgb/hsl/keyword)만 통과 — CSS 인젝션(A03) 차단. export 레이어가 하드 경계(스토어는 입력 중간상태 허용).
- 검증: `src/types/page.test.ts`·`src/export/export.test.ts`(토큰 4 + 인젝션 2), 196 통과.

**v2 — 폰트·간격 토큰 완료 (2026-06-29)**
- 글꼴: `tokens.fonts`(이름→font-family). 이름 `body`가 페이지 기본 글꼴 → 루트에 `font-family: var(--font-body)`로 전역 적용(자식 상속), 캔버스·미리보기·코드 export 일관. 노드별 참조 없음(전역 테마).
- 간격: `tokens.spacing`(이름→px). `PageNode.padding/margin`이 `Sides | string`로 확장 — 문자열은 `token:<key>` 센티넬(균일 적용). `toSides(v, tokens?)`가 토큰을 해석해 레이아웃 수학은 그대로. 코드 export는 `padding/margin: var(--space-<key>)`.
- 인스펙터: `SpacingControl`(커스텀↔토큰, BackgroundControl과 동일 UX) + `FontTokenManager`·`SpacingTokenManager`(추가/편집/삭제).
- dangling ref(삭제된 토큰): 캔버스·export 모두에서 해당 스타일만 드롭(노드 보존) — 색상 v1과 일관.
- 신뢰경계: `sanitizeFontFamily`(화이트리스트)·`sanitizeSpacing`(유한수 강제)로 CSS 인젝션(A03) 차단. export 레이어가 하드 경계, dangling/unsafe는 `:root` 선언·var() 참조 양쪽에서 드롭.
- 검증: `page.test.ts`·`export.test.ts`·`editorStore.test.ts`(폰트·간격·인젝션 케이스 추가), 214 통과.

**완료 기준(v1·v2)**: 토큰 하나를 바꾸면 이를 참조하는 노드들이 캔버스·export에서 일괄 반영된다(증거: 위 테스트).

## 4. 레이아웃 모델(flex/grid)  ← 마지막(최대 변경)

**문제**: 절대위치(x,y,w,h)만 지원 → export 코드가 reflow되지 않음. 진짜 반응형의 근본 해법이나
캔버스·store·export 전반을 건드리는 가장 큰 아키텍처 변경이라 토대가 안정된 뒤 진행.

**범위**
- flex/grid 컨테이너 타입 + 자식 자동 배치.
- 캔버스 편집 UX, store 모델, export 코드 동시 반영.

**완료 기준**: flex 컨테이너에 자식 배치 후 컨테이너 폭을 줄이면 자식이 reflow되고,
export 코드도 동일하게 동작한다.

**Stage A — 완료 (2026-06-30)**: flex 컨테이너(grid·캔버스 flow 드래그 제외, 신규 의존성 0).
- 데이터 모델: 컨테이너 `PageNode`에 `layout?: "flex"`(없음=absolute, 모든 기존 문서 하위호환) +
  `flexDirection`/`gap`/`alignItems`/`justifyContent`. `resolveFlow(node)`가 enum을 CSS 키워드로
  매핑(gap은 `sanitizeSpacing`) → 캔버스·export가 같은 함수를 공유해 결과 일치(`src/types/page.ts`).
- 흐름·reflow: flow 자식은 `display:flex; flex-wrap:wrap` 래퍼로 묶여 컨테이너 폭을 줄이면 wrap =
  reflow. 자식은 `position:relative; flex:0 0 auto`(고정 크기), `frame.x/y`는 무시.
- 캔버스(`NodeView`): flow 자식은 드래그 비활성 — 순서변경은 레이어트리(↑↓·DnD)로. 인스펙터에
  `LayoutControl`(배치 모드·방향·gap·정렬).
- export: 코드는 `.pg-N-c` 래퍼 클래스에 flex 규칙 + 자식 relative emit, 스펙은 `flex 가로/세로…`
  요약 + flow 자식 `@(x,y)` 생략. 신뢰경계(A03): gap·정렬값은 sanitize/enum 매핑이라 인젝션 불가.
- 부수: v2에서 누락됐던 `SnapBox.margin` 타입 갭(`Sides|string`) 보정.
- 검증: typecheck·build 통과, 테스트 225개(`resolveFlow`·flex export·`setNodeLayout` +11).

### Stage B — flex 자식 캔버스 드래그 순서변경  · 상태 완료 (수동 QA 통과, 2026-07-01)

**구현 완료 (2026-06-30, 브랜치 `task/4-flex-reorder`)** — 신규 의존성 0(기존 `@dnd-kit/core` +
`moveNodeAdjacent` 재사용, LayerTreePane 패턴):
- 순수 로직 `canvas/flowReorder.ts`: `resolveFlowDrag(nodes, active, over, rects)` → reorder/reparent/null.
  같은 flex 부모 형제 = 주축 중심 before/after(`flowDropSide`), 다른 컨테이너 = append.
- `NodeView`: flow 자식 드래그/드롭 활성화(leaf도 reorder 타깃), `flowDropStore` 구독해 삽입선 렌더.
- `EditorShell`: `onDragOver`→인디케이터, `onDragEnd` flow 분기(reorder→`moveNodeAdjacent`/reparent→`moveNode`,
  절대배치 경로는 비-flow에만 → 회귀 0). store/export 코어 무변경(children 순서 자동 반영).
- 검증(자동): lint 0 errors, build·typecheck 통과, 테스트 235개(`flowReorder` 순수 로직 9 + export 순서 1).
**수동 QA 통과 (2026-07-01, 브랜치 `task/4-flow-drag-indicator`)** — QA에서 두 문제 발견·해결:
① 삽입선이 같은 형제 위에서 즉시 갱신 안 됨 ② **드롭 시 자식이 새 자리에서 깜빡임**(레이어트리로 같은
순서변경을 하면 안 깜빡 → 원인은 순서변경/리렌더가 아니라 dnd-kit이 드롭 시 드래그 소스 요소를 처리하는
것과 DOM 재배치의 충돌). 해법: 손으로 만든 flow reorder를 **@dnd-kit/sortable로 교체(FLIP 애니메이션)** +
**DragOverlay**(드래그 중 소스는 `opacity:0`, 커서를 따라가는 클론을 렌더 → 드롭 시 소스는 레이어트리처럼
clean 이동 → 깜빡임 0). 부수: 커스텀 삽입선 인프라(`flowDropStore`) 제거(sortable 라이브 자리벌림이 대체),
`resolveFlowDrag`→`resolveFlowDrop`(children 인덱스로 before/after), 충돌판정 flow-스코프(`closestCenter`↔
`rectIntersection`, 절대/팔레트 회귀 방지), flow 자식 snap skip, `NodeView` 분리(FlowNodeView/StaticNodeView/
NodeBox/NodeOverlay). 회귀(절대 드래그·팔레트·reparent) 없음 육안 확인. 검증: tsc·eslint 0 errors·build·
vitest 322(`resolveFlowDrop` 순수 로직 7 재작성). 상세 → `knowledge/architecture/editor-architecture.md`.

**Stage C — C-1(grid)·C-2(per-bp 파라미터 오버라이드)·C-3(flex↔grid 모드 per-bp 스왑) 완료**.

**목표**: flow(flex) 자식을 캔버스에서 드래그해 순서를 바꾼다(삽입선 + 순서변경). 현재 flow 자식은
드래그 비활성(순서변경은 레이어트리 ↑↓·DnD로만 가능).

**현황(코드 근거)**: 캔버스 DnD는 `EditorShell`의 단일 `DndContext`(`@dnd-kit/core`) — `onDragEnd`가
팔레트/블록 add·리페어런트·같은 부모 reposition(`moveNodeBy`+snap) 분기. `NodeView`는 flow 자식을
`useDraggable({ disabled: isRoot || inFlow })`로 비활성. **`LayerTreePane`이 동일 reorder UX(드롭
인텐트 → before/after 삽입선 → `moveNodeAdjacent`)를 `@dnd-kit/core`만으로 이미 구현.** export(`code.ts`·
`spec.ts`)·미리보기는 모두 `node.children` 순서를 따른다.

**범위 (In / Out)**
- **In**: flow 자식 캔버스 드래그 활성화 + 삽입선 + 같은 컨테이너 내 순서변경, **+ flow 자식을 다른
  컨테이너로 드래그 시 그 끝에 append(리페어런트, 기존 `moveNode` 재사용)**. 순서가 캔버스·미리보기·
  코드/스펙 export에 일관 반영.
- **Out → Stage C**: grid 셀 reorder(2D), 다중 선택 드래그 reorder, 캔버스 키보드 reorder,
  per-breakpoint 레이아웃 오버라이드(#1 Stage B를 gap 오버라이드로 흡수).

**의존성**: **신규 의존성 없음.** `@dnd-kit/sortable` 도입 안 함 — ① `package.json`에 `core`/`utilities`만
(sortable 부재) ② `LayerTreePane`이 동일 reorder UX를 core만으로 이미 구현 ③ `moveNodeAdjacent`가 배열
reorder를 이미 담당. sortable은 별도 context/sensor 모델이라 기존 수동 DnD와 공존 시 복잡도만 증가.
**재사용 > 신규 의존성(게으른 시니어).**

**캔버스(`NodeView.tsx`·`EditorShell.tsx`)**
- `NodeView`: flow 자식 `useDraggable` 활성화(`disabled`에서 `inFlow` 제거, root만 비활성), flow 자식을
  droppable로(leaf도 reorder 타깃). 드래그 피드백은 opacity(transform 미사용 → flex 레이아웃 보존).
- 드롭 위치: `LayerTreePane.resolveDropIntent`와 동형 — 호버 형제 rect 대비 **주축**(부모
  `resolveFlow().flexDirection`: row=x, column=y) 중심으로 before/after. 빈 영역 drop → 끝에 append.
- 삽입선: 호버 형제에 before/after 인디케이터(레이어트리 `intentZone` span 동형), 로컬 상태로 렌더.
- `EditorShell.onDragEnd`: 드래그 노드의 부모가 flow면 reposition 대신 `moveNodeAdjacent(active, over,
  side)`; 다른 컨테이너로 drop이면 `moveNode`(append). 절대배치 부모는 기존 경로 그대로(회귀 0).

**store / export**: **둘 다 무변경.** 순서변경은 기존 `moveNodeAdjacent`(children 배열 splice, 단일
출처) 재사용. export·미리보기는 `node.children` 순서를 그대로 따르므로 reorder가 자동 반영(동작 보존).

**완료 기준(Acceptance)**: flex 컨테이너의 자식을 캔버스에서 드래그해 순서를 바꾸면 `children` 배열이
갱신되고 **캔버스·미리보기·코드 export·스펙 export 순서가 모두 일치**한다. 절대배치 자식의 기존
드래그(reposition/리페어런트)는 회귀 없음.

**vitest 케이스**(순수 로직·결과는 단위, DnD 인터랙션은 `/verify` 앱 실행으로 확인)
- ① 삽입 판정 헬퍼(신규 순수 함수 `flowInsertSide(activeRect, overRect, dir)`): row 좌→우·column 상→하
  before/after (4 케이스). ② store: flex 부모 A,B,C → `moveNodeAdjacent`로 reorder → children 갱신.
  ③ export code: reorder 후 새 순서로 emit. ④ export spec: 새 순서로 나열. ⑤ 회귀: 절대배치 자식
  드래그는 여전히 `moveNodeBy`(reorder 아님).

**영향 파일**: `src/components/NodeView.tsx` · `src/app/EditorShell.tsx` ·
`src/canvas/`(삽입 판정 헬퍼 1개) · 테스트(`editorStore.test.ts`·`export.test.ts` + 헬퍼). store/export 코어 무변경.

**위험·불확실**: (R1 중) dnd-kit `collisionDetection` — flow 자식 droppable 추가가 절대 드래그 충돌
판정에 영향 가능(단일 DndContext), 부정확 시 flow 한정 `closestCenter` 검토 — 착수 시 실험. (R2 중)
단일 DndContext가 절대 드래그+flow reorder를 모두 처리 → `onDragEnd` 분기 정확성 + 회귀 테스트 필수.
(R3 낮음) 드래그 피드백이 flex 레이아웃 흔들지 않게(opacity). (R4 확인) 중첩 flow reorder 1케이스 확인.
되돌리기 어려운 변경·신규 의존성·마이그레이션 없음(전부 가역).

### Stage C-1 — grid 컨테이너 (기본 템플릿)  · 상태 완료 (2026-06-30, 브랜치 `task/4-grid-container`)

**완료 (2026-06-30)** — 신규 의존성 0, flex 패턴 미러링:
- 데이터 모델: `LayoutMode`에 `"grid"`, `PageNode.gridColumns?`/`gridRows?`(숫자 카운트). `resolveGrid(node)`가
  열/행→`repeat(N, minmax(0,1fr))`(정수 강제), gap은 `sanitizeSpacing`, align/justify는 기존 `ALIGN_CSS`/
  `JUSTIFY_CSS` 재사용. `ResolvedGrid.columns`로 카운트 노출(스펙이 재파싱 안 하게). **resolveFlow는 grid에
  여전히 null** → `flowReorder`가 grid 자식에 flex reorder 미적용(불변 유지).
- store: `setNodeLayout` Pick에 grid 필드 + 삭제조건 `!== "flex" && !== "grid"`(grid 보존 버그 수정).
- 캔버스(`NodeView`): grid 래퍼(`display:grid`), grid 자식 relative(`flex:0 0 auto` 없음 — flex와 구분),
  드래그 비활성(`disabled: isRoot || inGrid`). export(`code.ts`): `gridDecls` + `inGrid` 분기로 자식
  relative emit(flex 전용 `flex:0 0 auto` 제외). spec(`spec.ts`): `gridSummary`("grid N열…") + 자식 x/y 생략.
- 인스펙터(`LayoutControl`): "Grid (자동 배치)" 옵션 + 열/행 개수 입력, gap/정렬 재사용.
- **A03**: 열/행은 정수 강제, gap·정렬은 sanitize/enum 매핑 → 인젝션 불가(인젝션 회귀 테스트로 증명).
- 리뷰(code-reviewer): A03 airtight·resolveFlow-null 불변 확인. critical 1(grid 자식 `flex:0 0 auto` export
  오염) + minor 1(gridSummary 정규식 재파싱) → 둘 다 해소.
- 검증: vitest **305 통과**, `tsc -b` 0, `eslint .` 0 errors, `vite build` 성공. (grid 테스트: resolveGrid 5 +
  store 3 + export/spec 5 = +13, +회귀.)

**목표**: 컨테이너 `layout`에 `"grid"`를 추가해 자식을 grid 트랙(열/행)에 자동 배치. flex와 동일한
"단일 출처 resolve 함수 + 캔버스/export 공유" 패턴. **전 문서 100% 하위호환**(additive·마이그레이션 없음).

**현황(코드 근거)**: `layout?: "absolute"|"flex"`(`page.ts`)뿐. `resolveFlow(node)`가 enum→CSS 매핑(gap은
`sanitizeSpacing`)이고 캔버스(`NodeView`)·`code.ts`·`spec.ts`·`flowReorder.ts`가 **모두 `resolveFlow` 공유**.
flex 자식은 `.pg-N-c` flex 래퍼+자식 relative `flex:0 0 auto`. ⚠️ `setNodeLayout`은
`if (next.layout !== "flex") delete next.layout` — **"grid"를 삭제해버리는 잠재 버그**(수정 필수).

**범위 (In / Out)**
- **In**: grid 컨테이너 타입 + 기본 템플릿(열 개수·행 개수·gap·정렬). 자식 자동 배치(grid auto-flow).
  순서가 캔버스·미리보기·코드/스펙 export에 일관 반영. 인스펙터 `LayoutControl`에 grid 옵션.
- **Out → 별도 항목**: 캔버스 2D 셀 드래그 배치/reorder, 셀 span/명시적 셀 좌표, 자유 템플릿 문자열
  (`1fr 2fr 100px`), per-breakpoint 레이아웃 오버라이드, grid 자식 셀-stretch 정밀 배치, thumbnail 정밀
  grid(flex와 동일하게 자식 absolute 근사 punt 유지).

**핵심 설계 결정**
- **D1 — 별도 `resolveGrid(node)` 신설(`resolveFlow` 확장 ❌)**: `flowReorder.resolveFlowDrag`가
  `resolveFlow(parent)` 비-null이면 flex reorder를 적용 → resolveFlow가 grid에 비-null이면 **grid 자식이
  flex 2D reorder를 잘못 받음**. resolveFlow는 flex 전용 유지, grid는 같은 *패턴*의 형제 함수로.
- **D2 — 숫자 열/행 개수 모델(자유 문자열 ❌)**: `gridColumns/gridRows: number` → `repeat(N, minmax(0,1fr))`.
  **A03이 구조적으로 0**(정수 강제, 문자열 보간 표면 없음). gap/정렬은 기존 `gap`·`alignItems`·
  `justifyContent` + `sanitizeSpacing`·`ALIGN_CSS`·`JUSTIFY_CSS` 재사용(grid 컨테이너에서도 유효, 신규
  매핑 0).
- **D3 — grid 자식 캔버스 드래그 비활성**(2D 셀 reorder는 Out): 순서변경은 레이어트리. (flex는 Stage B에서
  드래그 활성이지만 grid는 C-1에서 비활성 — 의도된 차이.)
- **D4 — grid 자식 박스 = relative + 고정 frame 크기**(flex 자식과 동형, `flex:0 0 auto`는 grid에서 무시되어
  무해). 셀-stretch 정밀 배치는 Out. `ponytail:` 주석으로 업그레이드 경로.

**데이터 모델(`src/types/page.ts`)** — 전부 선택, 기존 문서 무변경:
```ts
export type LayoutMode = "absolute" | "flex" | "grid";  // "grid" 추가
// PageNode grid 전용 신규 필드:
gridColumns?: number;  // 열 개수 → repeat(N, minmax(0,1fr)). 없음=1
gridRows?: number;     // 행 개수(선택) → grid-template-rows, 없으면 auto
// gap / alignItems / justifyContent 는 flex와 공유(재사용)
```
신규 `ResolvedGrid` + `resolveGrid(node)`: `node.layout !== "grid"` → null. cols =
`Math.max(1, sanitizeSpacing(gridColumns) ?? 1)`(0/음수/NaN→1), rows 동일(없으면 null). align/justify는
기존 매핑 재사용 — flex와 같은 "enum→CSS 키워드, unknown은 fallback" 패턴.

**resolveGrid(`page.ts`)**: `resolveFlow` 바로 옆에. gap은 `sanitizeSpacing`, 열/행은 정수 강제 후
`repeat(N, minmax(0,1fr))` 문자열로만 조립(N은 정수라 인젝션 불가). 캔버스·export가 이 함수를 공유(단일 출처).

**캔버스(`NodeView.tsx`)**: `resolveGrid` 분기로 grid 래퍼(`display:grid` + template/gap/정렬), 자식에
`inGrid` 전달. grid 자식 `useDraggable disabled`(드래그 비활성), 박스는 relative+고정 크기(flex 자식과 동형).

**store(`editorStore.ts`)**: `setNodeLayout` Pick에 `gridColumns|gridRows` 추가 + **삭제조건 수정**
(`next.layout !== "flex" && next.layout !== "grid"`일 때만 `delete next.layout`). grid↔flex↔absolute 토글 시
타 모드 옵션 보존(기존 동작 유지).

**인스펙터(`InspectorPane.tsx`)**: `LayoutControl` 배치 select에 "Grid (자동 배치)" 옵션. grid일 때 열 개수·
행 개수(선택) 입력 + gap/주축·교차축 정렬 재사용(방향은 flex만, 열/행은 grid만 노출).

**export(`code.ts`·`spec.ts`)**: 코드는 `gridDecls(grid)` 신설 → `.pg-N-c` 래퍼에 `display:grid` +
`grid-template-columns: repeat(N, minmax(0,1fr))`(+rows) + gap/align/justify, 자식 relative emit(flex와
동형 분기). 스펙은 `gridSummary(node)`("grid N열, gap 8, …") + grid 자식 `@(x,y)` 생략(`childInFlow`에 grid
포함). 신뢰경계(A03): 열/행은 정수, gap·정렬은 `sanitize`/enum 매핑 → 인젝션 불가.

**완료 기준(Acceptance)**: 컨테이너를 grid로 설정하고 columns·gap을 주면 **캔버스·미리보기·export 코드가
동일한 grid 레이아웃**을 만든다(`display:grid; grid-template-columns: repeat(N, minmax(0,1fr)); gap`).
열/행/gap/정렬 값은 정수 강제·enum 매핑 화이트리스트만 통과하며, **기존 absolute/flex 문서 동작은 그대로**
임이 특성화 테스트로 증명된다.

**vitest 케이스(~14)**
- resolver(`page.test.ts`): ①非grid→null ②cols/rows/gap/align/justify CSS 매핑(`repeat(N,minmax(0,1fr))`)
  ③`gridColumns` 누락/0/음수→`repeat(1,…)` ④unknown align/justify enum→fallback(인젝션 없음)
  ⑤**회귀**: `resolveFlow`는 grid에 여전히 null(flowReorder 안전 — grid 자식 flex reorder 미적용)
- store(`editorStore.test.ts`): ⑥`setNodeLayout({layout:"grid",gridColumns:3})`→필드 보존
  ⑦grid→absolute 토글 시 `layout` 삭제(grid 옵션은 보존) ⑧**회귀**: flex 토글 동작 불변
- export code(`export.test.ts`): ⑨grid 컨테이너→`.pg-N-c`에 `display:grid; grid-template-columns:
  repeat(N,minmax(0,1fr))` + gap ⑩grid 자식 relative(absolute 아님) ⑪**A03** 비정상 열/정렬→안전값(드롭)
  ⑫**회귀** flex/absolute export 불변
- export spec(`export.test.ts`): ⑬"grid N열…" 요약 + grid 자식 x/y 생략 ⑭**회귀** flex 요약 불변

**영향 파일**: `src/types/page.ts` · `src/store/editorStore.ts` · `src/export/code.ts` · `src/export/spec.ts` ·
`src/components/NodeView.tsx` · `src/components/InspectorPane.tsx` · 테스트 3종(`page.test.ts`·
`editorStore.test.ts`·`export.test.ts`). thumbnail은 무변경(flex와 동일 punt).

**위험·불확실**: (R1 중) `resolveFlow` 확장 시 flowReorder가 grid 자식에 flex reorder 오적용 → **별도
`resolveGrid`로 회피**(케이스 ⑤로 고정). (R2 필수) `setNodeLayout` 삭제조건이 "grid"를 지움 → 수정 +
케이스 ⑦. (R3 낮음) grid 자식 고정 크기(셀-stretch 미지원) — 의도된 단순화, 고급 배치는 Out. 되돌리기 어려운
변경·신규 의존성·마이그레이션 없음(전부 가역·additive).

### Stage C-2 — per-breakpoint 레이아웃 오버라이드  · 상태 완료 (2026-07-01, 브랜치 `task/4-bp-layout-override`)

**완료 (2026-07-01)** — 신규 의존성 0, B1/B2 per-bp 인프라 재사용:
- 데이터 모델: `NodeOverride`에 레이아웃 파라미터 6개(`flexDirection`·`gridColumns`·`gridRows`·`gap`·
  `alignItems`·`justifyContent`, 선택). **모드(`layout`)는 오버라이드 불가 — base 고정**(`.pg-N-c` 래퍼가
  구조적이라 @media로 DOM 재구성 불가). 신규 `resolveLayoutField(node,bp,field)`(데스크톱-퍼스트 필드별
  cascade, `resolvePadding` 패턴) + `resolveFlow`/`resolveGrid`에 `bp?` 인자(기본 desktop=base, 하위호환).
- store: `setNodeLayout` 라우팅(모드→base 항상, 6 파라미터→bp≠desktop이면 `overrides[bp]`). `clearOverrideField`
  필드 유니온에 6필드 추가. `cloneOverrides`(원시 필드 `...ov` 복제)·`resetOverride`(bp 통째 삭제) 무변경.
- export code: `hasLayoutOverride` + `pushWrapperOverrideRules` — 레이아웃 override 있으면 `.pg-N-c` **래퍼**에
  `resolveFlow/Grid(node,bp)` 풀 규칙을 `acc.tablet`/`mobile`로 emit(flex·grid 공통, `forceResets`로 base 누출
  차단: `gap:0`·`grid-template-rows:none`). spec `overrideLines`에 per-bp 레이아웃 요약.
- 캔버스(`NodeView`) 래퍼 스타일 `resolveFlow/Grid(node,bp)`(활성 bp 라이브). 인스펙터(`LayoutControl`) 파라미터
  bp-aware(resolved-at-bp+변경됨 배지+↺), **모드 select는 비-desktop 읽기전용**. `EditorShell` drop-side
  `resolveFlow(parent,activeBp)`.
- **A03**: override 값도 base와 동일 `sanitizeSpacing`(정수)·`ALIGN_CSS`/`JUSTIFY_CSS`(enum)만 통과 → 인젝션 불가.
- 리뷰(code-reviewer): mode-stays-base 불변·A03·하위호환 확인. Major 1(`grid-template-rows:none` 무효 주장) →
  **오탐**(`none`은 유효한 초깃값=명시 행 없음, 올바른 리셋; 제안된 `auto`는 의미가 달라 오히려 버그) → 유지.
  minor 2(래퍼-부재 회귀 테스트·주석) → 반영.
- 검증: vitest **324 통과**, `tsc -b` 0, `eslint .` 0 errors, `vite build` 성공.

**목표**: 컨테이너(base가 flex/grid)의 **레이아웃 파라미터**(`flexDirection`·`gridColumns`·`gridRows`·
`gap`·`alignItems`·`justifyContent`)를 태블릿/모바일에서 다르게 줄 수 있게 한다. B1/B2(padding·margin·
background)가 만든 per-bp 오버라이드 인프라(cascade resolver + `@media` emit + bp-aware 인스펙터)를
재사용한다. **#1 Stage B의 "per-bp gap/direction 오버라이드"를 여기로 흡수.** 전 문서 100% 하위호환(additive).

**현황(코드 근거)**: `NodeOverride`(`page.ts`)는 `{ frame?, hidden?, padding?, margin?, background? }`.
B1/B2가 `resolvePadding`/`resolveMargin`/`resolveBackground(node,bp)` cascade + `code.ts:overrideDecls`(→
`.pg-N`) + `spec.ts:overrideLines` + store bp-aware 쓰기(`setNodeSpacingValue`/`setNodeBackground`,
`clearOverrideField`, `resetOverride`, `cloneOverrides`) + 인스펙터 bp 컨텍스트를 이미 구축. flex/grid는
`resolveFlow`/`resolveGrid(node)`로 `.pg-N-c` **래퍼**에 emit(C-1까지 base만).

**핵심 구조 제약 (계획을 좌우)**
- 레이아웃 규칙은 자식 박스(`.pg-N`)가 아니라 **`.pg-N-c` 래퍼**에 산다 → B1/B2의 `overrideDecls`(→`.pg-N`)
  **재사용 불가**, 래퍼 전용 per-bp emit 경로가 **새로 필요**(R1, 핵심).
- `.pg-N-c` 래퍼 div는 **base 레이아웃이 flex/grid일 때만 DOM에 존재**. CSS `@media`는 DOM을 재구성 못 함 →
  **absolute ↔ flex/grid 모드 전환은 per-bp 불가**(구조적).

**핵심 설계 결정**
- **D1 — 오버라이드 대상은 레이아웃 "파라미터"만, "모드(`layout`)"는 base 고정**(사용자 확정 2026-06-30).
  per-bp 가능 = 위 6필드. `layout` 모드 자체는 base에서만. 이유 = 위 DOM 재구성 제약. flex↔grid 모드 스왑은
  별도 후속 Stage로 분리(교차 리셋 복잡도·오염 위험 회피).
- **D2 — resolver 확장 `resolveFlow(node, bp?)` / `resolveGrid(node, bp?)`**: optional `bp`(기본 desktop=
  base, 하위호환). 각 레이아웃 필드를 `resolvePadding`과 동일한 데스크톱-퍼스트 필드별 cascade
  (`mobile ?? tablet ?? base`)로 픽 후 기존 매핑. 캔버스·export·spec이 같은 함수 공유(단일 출처). `flowReorder`
  등 base 호출부는 인자 생략 → 무변경.
- **D3 — export 래퍼 per-bp emit**: `renderNode`에서 래퍼 존재 시 `resolveFlow/Grid(node,"tablet"|"mobile")`
  계산, 해당 bp에 레이아웃 override가 있으면 `acc.tablet`/`acc.mobile`에 `.pg-N-c { <풀 flowDecls/gridDecls
  at bp> }` push(항상 풀 emit → `@media`로 base를 이김, B2 `overrideBackgroundDecl` 철학). A03 동일.
- **D4 — store `setNodeLayout` 라우팅**: `layout` 모드 변경 → 항상 base. 6 파라미터 → bp≠desktop이면
  `overrides[bp]={...prev,[field]:value}`(B1/B2 sparse 패턴), desktop이면 base(현행). `clearOverrideField`
  필드 유니온에 6필드 추가. `resetOverride`(bp 통째 삭제)·`cloneOverrides`(원시 필드는 `...ov`로 이미 복제)
  **무변경**(테스트로 확인).
- **D5 — 캔버스/인스펙터/spec**: `NodeView` 래퍼 스타일을 `resolveFlow/Grid(node, bp)`로(활성 bp 라이브
  프리뷰). `LayoutControl` 파라미터 컨트롤 bp-aware(B1/B2처럼 resolved-at-bp + "이 화면서 변경됨" 배지 + ↺),
  **모드 select는 비-desktop에서 base 읽기전용**("모드는 데스크탑 기준"). spec `overrideLines`에 per-bp
  레이아웃 요약(`flowSummary/gridSummary` at bp 재사용). `childInFlow`는 base 기준 유지(모드 고정 → 일관).
- **D6 — flowReorder drop-side**: `EditorShell`이 `resolveFlow(parent, activeBp).flexDirection`을 쓰도록
  (override된 방향에서 before/after 정확). 소폭(R4).

**데이터 모델(`src/types/page.ts`)** — 전부 선택, 기존 문서 무변경:
```ts
interface NodeOverride {
  // 기존: frame?, hidden?, padding?, margin?, background?
  flexDirection?: "row" | "column";  // C-2 (base가 flex일 때만 유효)
  gridColumns?: number;              // C-2 (base가 grid)
  gridRows?: number;                 // C-2 (base가 grid)
  gap?: number;                      // C-2
  alignItems?: FlowAlign;            // C-2
  justifyContent?: FlowJustify;      // C-2
  // layout(모드)은 오버라이드 불가 — base 고정
}
```

**완료 기준(Acceptance)**: base가 flex/grid인 컨테이너에 **태블릿 gap·모바일 flexDirection(또는 grid
columns)** 오버라이드를 주면 → 캔버스가 활성 bp에서 그 값으로 렌더, export 코드의 `@media(max-width:768px)`
/`(375px)` 블록에 `.pg-N-c` 레이아웃 규칙이 생성, 스펙 `overrideLines`에 요약된다. **기존 base 레이아웃·
B1/B2 오버라이드·absolute/flex/grid·flowReorder 동작은 불변**(특성화 회귀 테스트로 증명). A03: override 값도
정수/`sanitize`/enum 화이트리스트만 통과.

**vitest 케이스(~19)**
- resolver(`page.test.ts`): ①`resolveFlow(node,bp)` cascade(태블릿→태블릿·모바일 상속, 모바일 승,
  미정의→base) ②`resolveGrid(node,bp)` 동일 ③override 없음→base 동일(회귀) ④unknown enum override→
  fallback(A03) ⑤필드별 독립(gap만 override, direction은 base 유지)
- store(`editorStore.test.ts`): ⑥gap@태블릿→`overrides.tablet.gap`, base 불변 ⑦flexDirection@모바일
  ⑧gridColumns@태블릿 ⑨desktop 편집→base(회귀) ⑩**모드 변경은 bp=tablet에서도 base** ⑪`clearOverrideField
  (gap)` ⑫`resetOverride` 레이아웃 포함 제거 ⑬`cloneOverrides`/`duplicateNode` 레이아웃 override 복제
- export code(`export.test.ts`): ⑭태블릿 gap→768 `.pg-N-c{…gap}` ⑮모바일 direction→375 ⑯grid columns
  override→`.pg-N-c` template @bp ⑰**A03** override 인젝션 드롭 ⑱**회귀** base·B1/B2 emit 불변
- export spec(`export.test.ts`): ⑲`overrideLines`에 태블릿 레이아웃 요약 + 회귀

**영향 파일**: `src/types/page.ts` · `src/store/editorStore.ts` · `src/export/code.ts` · `src/export/spec.ts` ·
`src/components/NodeView.tsx` · `src/components/InspectorPane.tsx` · `src/app/EditorShell.tsx`(drop-side
activeBp) · 테스트 3종(`page.test.ts`·`editorStore.test.ts`·`export.test.ts`).

**위험·불확실**: (R1 높음·핵심) 레이아웃은 `.pg-N-c`에 산다 → `overrideDecls`(`.pg-N`) 재사용 불가, 별도 래퍼
emit 필수. 놓치면 override가 노드 박스에 잘못 나가 무효. (R2 결정 완료) `layout` 모드 override 제외(DOM 재구성
불가). (R3 중) `setNodeLayout` 라우팅(mode→base, params→bp) + desktop 회귀. (R4 낮음) drop-side가 override된
direction 반영(activeBp 전달). (R5 확인) `cloneOverrides` 원시 필드 무변경 — 테스트로 고정. 되돌리기 어려운
변경·신규 의존성·마이그레이션 없음(전부 가역·additive).

### Stage C-3 — flex↔grid 모드 per-breakpoint 스왑  · 상태 완료 (2026-07-01, 브랜치 `task/4-bp-mode-swap`)

**완료 (2026-07-01)** — 신규 의존성 0, C-2 per-bp 인프라 재사용, 계획대로 resolver 1곳 + export 래퍼 1곳이 실질 신규 로직:
- 데이터 모델: `NodeOverride.layout?("flex"|"grid")` 추가(absolute 불가 — 래퍼 DOM 재구성 못 함). 신규
  `resolveLayoutMode(node,bp)`(base flex/grid일 때만 `mobile ?? tablet ?? base` cascade, flex/grid 값만 수용).
  `resolveFlow`/`resolveGrid` 게이트를 `node.layout` → `resolveLayoutMode(node,bp)`로 교체 — **desktop 기본
  인자라 base 호출부(`resolveFlow(node)`)·`flowReorder`는 무변경 = 하위호환**.
- store: `setNodeLayout` 라우팅(layout@desktop→base, @bp≠desktop은 값·base 모두 flex/grid일 때만
  `overrides[bp].layout`, absolute-base/값이면 무시). `clearOverrideField`에 `"layout"` 추가. `cloneOverrides`
  (원시 `...ov`)·`resetOverride`(bp 통째 삭제) 무변경.
- export code: `hasLayoutOverride` +`ov.layout`, `pushWrapperOverrideRules`가 `mode` 인자 제거 → bp마다
  `resolveFlow/Grid(node,bp)`로 모드 재해석해 해당 모드 풀 decls(`forceResets`)를 `.pg-N-c` 래퍼 media에 emit.
  spec `hasLayoutOverride` +`ov.layout`(요약은 이미 bp-aware라 스왑 자동 반영).
- 인스펙터 `LayoutControl`: 모드를 `resolveLayoutMode(node,bp)`로, 모드 select를 bp≠desktop+base=flex/grid면
  활성화(flex/grid 2옵션+변경됨 배지+↺), base=absolute면 disabled. **캔버스(`NodeView`)·드래그(`EditorShell`)는
  무변경**(이미 activeBp로 resolve → 스왑·드래그 자동 정합).
- **A03**: 스왑된 모드가 읽는 파라미터도 `sanitizeSpacing`(정수)·`ALIGN_CSS`/`JUSTIFY_CSS`(enum) 화이트리스트만
  통과, 모드는 `"flex"|"grid"` 리터럴만 수용. 리뷰(code-reviewer)에서 A03 체인 airtight 확인.
- R2 punt: base=grid→bp=flex 스왑 시 grid 자식은 base decls에 `flex:0 0 auto`가 없어 flex-item 축소 가능 →
  의도적 단순화(자식 고정 width + flex-wrap 오버플로 처리) + `ponytail:` 주석 명문화(리뷰 W1 반영).
- 리뷰(code-reviewer): critical/major 0. W1(punt 명문화)·S3(base 호출 의도 주석) 반영. A03·하위호환·store 합성 확인.
- 검증: `tsc -b` 0, `eslint .` 0 errors, vitest **339 통과**(C-3 +15: resolveLayoutMode 6·store 5·export/spec 6),
  `vite build` 성공. OKF 갱신(`docs(okf)` 별도 커밋 `a6124cb`).

**목표**: base가 flex/grid인 컨테이너의 **레이아웃 모드 자체**(flex↔grid)를 태블릿/모바일에서 다르게
줄 수 있게 한다. C-2가 "파라미터만, 모드는 base 고정"으로 남긴 것을 모드 스왑까지 확장. **전 문서
100% 하위호환**(additive·마이그레이션 없음·신규 의존성 0).

**핵심 통찰 (왜 이번엔 flex↔grid가 가능한가)**
- C-2가 "모드는 base 고정"이라 한 이유 = `.pg-N-c` 래퍼 div가 base=flex/grid일 때만 DOM에 존재하고
  `@media`는 DOM을 재구성 못 함. **하지만 flex·grid는 둘 다 같은 `.pg-N-c` 래퍼를 만든다** — DOM 구조가
  동일하고 `display:flex ↔ display:grid`만 다르다. 그래서 flex↔grid per-bp 스왑은 **구조적으로 가능**.
  (absolute↔flex/grid는 래퍼 생성/제거가 필요해 여전히 불가 — 계속 Out.)
- **결정적 사실**: 캔버스(`NodeView`)·드래그(`EditorShell`)·스펙(`spec.ts`)이 **이미 전부
  `resolveFlow/Grid(node, activeBp)`로 호출** 중. 두 resolver를 "bp에서 모드를 먼저 cascade"하도록 바꾸면
  **캔버스 렌더·드래그 활성/비활성·스펙 요약이 전부 공짜로 따라온다.** 실제 신규 로직은 resolver 1곳 +
  export 래퍼 emit 1곳뿐.
- **교차 리셋 오염 위험(C-2가 우려한 것)은 실제로 없다**: flex 전용 속성(`flex-direction`·`flex-wrap`)은
  grid 컨테이너에서 무시되고, grid 전용(`grid-template-columns/rows`)은 flex에서 무시된다 → 서로 inert.
  `flowDecls`/`gridDecls`의 기존 `forceResets=true`(gap·grid-template-rows 리셋)면 충분.

**현황(코드 근거)**: `NodeOverride`(`page.ts`)에 레이아웃 파라미터 6개는 있으나 `layout`(모드)은 없음
(C-2 D1). `resolveFlow(node,bp)`/`resolveGrid(node,bp)`는 **base `node.layout`**으로 게이트(`!== "flex"`/
`!== "grid"` → null). export(`code.ts:pushWrapperOverrideRules`)는 base `mode` 인자로 per-bp 래퍼 규칙 emit.
C-2가 남긴 "drop-side가 activeBp direction 반영" 후속 우려는 **이미 무효** — sortable 전환으로
`resolveFlowDrop`이 children 인덱스 기반이라 방향 무관(`EditorShell` 무변경).

**핵심 설계 결정**
- **D1 — 모드 오버라이드는 flex↔grid만, absolute 제외**(구조적: 래퍼 DOM 재구성 불가). `NodeOverride.layout?:
  "flex" | "grid"`. base가 absolute면 오버라이드 무시(store·resolver 양쪽 차단).
- **D2 — 신규 `resolveLayoutMode(node, bp)`**: base가 absolute면 그대로 반환(스왑 불가), flex/grid면
  `mobile ?? tablet ?? base` 데스크톱-퍼스트 cascade(오버라이드는 flex/grid 값만 수용 — 방어).
  `resolveFlow`/`resolveGrid`의 게이트를 `node.layout !== …` → `resolveLayoutMode(node, bp) !== …`로 교체.
  **desktop 기본값이라 base 호출부(`resolveFlow(node)`)는 무변경 = 하위호환.**
- **D3 — export 래퍼 per-bp emit**: `hasLayoutOverride`에 `ov.layout !== undefined` 추가(모드만 바꿔도
  트리거). `pushWrapperOverrideRules`에서 `mode` 인자 제거 → bp마다 `resolveFlow/Grid(node,bp)`로 모드를
  재해석해 해당 모드의 풀 decls emit(`forceResets=true`). base 래퍼 decls는 desktop 모드 그대로.
- **D4 — store `setNodeLayout` 라우팅**: `layout`이 desktop이면 현행대로 base. **bp≠desktop이면** 값이
  flex/grid이고 base가 flex/grid일 때만 `overrides[bp].layout`에 기록(absolute-base/absolute-값이면 무시).
  `clearOverrideField` 필드 유니온에 `"layout"` 추가. `resetOverride`(bp 통째 삭제)·`cloneOverrides`(원시
  `...ov`) **무변경**(테스트로 고정).
- **D5 — 캔버스/인스펙터/spec**: `NodeView`·`EditorShell`은 **무변경**(이미 activeBp로 resolve → 스왑·드래그
  자동 정합). `LayoutControl`의 `flex`/`grid`를 `resolveLayoutMode(node,bp)` 기반으로(스왑된 bp에서 grid
  파라미터 노출), 모드 `<select>`는 bp≠desktop+base=flex/grid면 활성화(flex/grid 2옵션만 + "이 화면서 변경됨"
  배지 + ↺), base=absolute면 기존대로 disabled. spec `overrideLines`의 `hasLayoutOverride`에 `ov.layout` 추가
  (요약 `flowSummary/gridSummary` at bp는 이미 bp-aware라 스왑 자동 반영).

**데이터 모델(`src/types/page.ts`)** — 전부 선택, 기존 문서 무변경:
```ts
interface NodeOverride {
  // 기존: frame?, hidden?, padding?, margin?, background?, flexDirection?, gridColumns?, gridRows?, gap?, alignItems?, justifyContent?
  layout?: "flex" | "grid";  // C-3 — absolute는 불가(래퍼 DOM 재구성 못 함)
}
```

**완료 기준(Acceptance)**: base가 flex인 컨테이너에 **태블릿=grid** 오버라이드를 주면 → ① 캔버스가 태블릿
bp에서 grid로 렌더(자식 드래그 비활성), ② export 코드 `@media(max-width:768px)`의 `.pg-N-c`에
`display:grid; grid-template-columns…` 규칙 생성, ③ 스펙 `overrideLines`에 "grid N열…" 요약. **base 레이아웃·
B1/B2 오버라이드·absolute/flex/grid·flowReorder 전부 불변**임이 특성화 회귀 테스트로 증명. A03: override
값도 정수/`sanitize`/enum 화이트리스트만 통과.

**vitest 케이스(~18)**
- resolver(`page.test.ts`): ①`resolveLayoutMode` base flex+오버라이드 없음→전 bp flex ②base flex+태블릿
  layout=grid→`resolveGrid(node,태블릿)` 비-null·`resolveFlow` null, 모바일 상속 grid ③base grid+모바일
  layout=flex→반대, 태블릿은 grid 유지 ④base absolute+stray `overrides.tablet.layout`→여전히 null(스왑 불가)
  ⑤**회귀** desktop: `resolveFlow(node)`/`resolveGrid(node)`=base 모드 ⑥스왑된 모드가 그 모드 파라미터를
  bp에서 읽음(flex→grid, `gridColumns` override 반영)
- store(`editorStore.test.ts`): ⑦`setNodeLayout({layout:"grid"})`@태블릿 on flex base→`overrides.tablet.
  layout="grid"`, base.layout="flex" 불변 ⑧layout@desktop→base(회귀) ⑨layout=grid@태블릿 on **absolute**
  base→무시(오버라이드 미기록) ⑩`clearOverrideField(태블릿,"layout")` 제거, base 무변 ⑪`resetOverride`가
  layout override 포함 제거 ⑫`cloneOverrides`/`duplicateNode`가 layout override 복제
- export code(`export.test.ts`): ⑬base flex+태블릿 grid→`@media(768)` `.pg-N-c{display:grid;grid-template-
  columns…}` ⑭base grid+모바일 flex→`@media(375)` `.pg-N-c{display:flex…}` ⑮모드만 override(파라미터 무변경)
  →`hasLayoutOverride`가 잡아 래퍼 규칙 emit ⑯**회귀** override 없음→base 래퍼만·`@media` 래퍼 규칙 없음 +
  B1/B2·absolute/flex/grid 불변 ⑰**A03** override 값 sanitize(열=정수, 정렬=enum)
- export spec(`export.test.ts`): ⑱`overrideLines`에 스왑된 모드 요약(base flex→태블릿 "grid N열…") + 회귀

**영향 파일**: `src/types/page.ts` · `src/store/editorStore.ts` · `src/export/code.ts` · `src/export/spec.ts` ·
`src/components/InspectorPane.tsx`(`LayoutControl`) · 테스트 3종(`page.test.ts`·`editorStore.test.ts`·
`export.test.ts`). **`NodeView.tsx`·`EditorShell.tsx`는 무변경**(검증만 — 이미 activeBp로 resolve).

**위험·불확실**: (R1 핵심) `resolveFlow`/`resolveGrid` 게이트를 base→resolved-mode로 교체 — base 호출부가
desktop 기본값을 쓰는지 **회귀 테스트로 고정**(⑤). 놓치면 전 문서 레이아웃이 흔들림. (R2 punt) base=grid→
bp=flex 스왑 시 grid 자식은 base decls에 `flex:0 0 auto`가 없어(C-1 리뷰서 의도적 제거) flex-item으로서 축소
가능(`flex:0 1 auto`) → **의도적 단순화로 punt** + `ponytail:` 주석(자식은 고정 width가 있고 flex-wrap이
오버플로 처리 → 실사용 영향 미미). base=flex→grid는 `flex:0 0 auto`가 grid서 inert라 무해. (R3) absolute-base에
모드 오버라이드 차단(⑨). (R4 A03) override 값은 base와 동일 sanitize/enum, 모드는 `"flex"|"grid"` 리터럴만
수용(⑰). (R5 무효) drop-side/EditorShell 우려는 sortable 전환으로 이미 해소 — 무변경. 되돌리기 어려운 변경·
신규 의존성·마이그레이션 없음(전부 가역·additive).

---

## 진행 규칙
- 각 항목은 품질 게이트(구현 → 리뷰 → 단순화(선택) → 검증)를 거친다.
- 항목 완료 시 이 표의 상태를 갱신하고, 의미 있는 구조 변경은 `/okf`로 `knowledge/`에 반영.
