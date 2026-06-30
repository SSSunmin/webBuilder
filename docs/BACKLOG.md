# webBuilder — 백로그 (포스트-MVP)

> MVP(드래그앤드롭·브레이크포인트·Supabase·MD export) 이후 순차 진행할 기능. 핵심 가치는
> **시각 빌드 → 자기완결 export(임의 LLM/개발자가 받아 구현 가능)**. 위에서부터 순서대로 진행.
>
> 원본 기획은 [PLAN.md](./PLAN.md). 이 문서는 그 다음 단계의 실행 백로그.

작성일: 2026-06-24

| # | 기능 | 상태 | 한 줄 |
|---|------|------|-------|
| 1 | 반응형 export 강건화 | Stage A 완료 · B [대기] | frame/hidden 반응형 생성(A). B=per-bp padding/margin(B1)·background(B2) 오버라이드 |
| 2 | 이벤트/액션 완성 | 완료 | submit·custom 액션을 실제 코드로 생성 |
| 3 | 디자인 토큰/테마 | v2(색상·폰트·간격) 완료 | 문서 전역 색상·글꼴·간격 토큰 + 노드 참조 + export(:root/var) |
| 4 | 레이아웃 모델(flex/grid) | Stage A 완료 · B 구현(수동 QA 대기) | flex 컨테이너(A). B=flex 자식 캔버스 드래그 순서변경(삽입선). grid·반응형 레이아웃은 C |

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

### Stage B — per-breakpoint 스타일 오버라이드 (padding·margin·background)  · 상태 [대기]

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

### Stage B — flex 자식 캔버스 드래그 순서변경  · 상태 구현 완료 · 수동 QA 대기

**구현 완료 (2026-06-30, 브랜치 `task/4-flex-reorder`)** — 신규 의존성 0(기존 `@dnd-kit/core` +
`moveNodeAdjacent` 재사용, LayerTreePane 패턴):
- 순수 로직 `canvas/flowReorder.ts`: `resolveFlowDrag(nodes, active, over, rects)` → reorder/reparent/null.
  같은 flex 부모 형제 = 주축 중심 before/after(`flowDropSide`), 다른 컨테이너 = append.
- `NodeView`: flow 자식 드래그/드롭 활성화(leaf도 reorder 타깃), `flowDropStore` 구독해 삽입선 렌더.
- `EditorShell`: `onDragOver`→인디케이터, `onDragEnd` flow 분기(reorder→`moveNodeAdjacent`/reparent→`moveNode`,
  절대배치 경로는 비-flow에만 → 회귀 0). store/export 코어 무변경(children 순서 자동 반영).
- 검증(자동): lint 0 errors, build·typecheck 통과, 테스트 235개(`flowReorder` 순수 로직 9 + export 순서 1).
- ⚠️ **수동 QA 대기**: 캔버스 드래그 인터랙션 자체(삽입선 위치·reorder 체감·R1 collisionDetection의
  절대 드래그 간섭)는 자율 루프가 검증 불가 — 브라우저에서 시각 확인 후 머지. PR #에 명시.

**Stage C — 예정**: grid 템플릿 · per-breakpoint 레이아웃 오버라이드.

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

**Stage C — 예정**: grid 템플릿 · per-breakpoint 레이아웃 오버라이드(#1 Stage B를 gap 오버라이드로 흡수).

---

## 진행 규칙
- 각 항목은 품질 게이트(구현 → 리뷰 → 단순화(선택) → 검증)를 거친다.
- 항목 완료 시 이 표의 상태를 갱신하고, 의미 있는 구조 변경은 `/okf`로 `knowledge/`에 반영.
