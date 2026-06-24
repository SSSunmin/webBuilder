# webBuilder — 백로그 (포스트-MVP)

> MVP(드래그앤드롭·브레이크포인트·Supabase·MD export) 이후 순차 진행할 기능. 핵심 가치는
> **시각 빌드 → 자기완결 export(임의 LLM/개발자가 받아 구현 가능)**. 위에서부터 순서대로 진행.
>
> 원본 기획은 [PLAN.md](./PLAN.md). 이 문서는 그 다음 단계의 실행 백로그.

작성일: 2026-06-24

| # | 기능 | 상태 | 한 줄 |
|---|------|------|-------|
| 1 | 반응형 export 강건화 | Stage A 완료 | 코드 export가 `<style>`+`@media`로 frame/hidden 반응형 생성 (Stage B 연기) |
| 2 | 이벤트/액션 완성 | 예정 | submit·custom 액션을 실제 코드로 생성 |
| 3 | 디자인 토큰/테마 | 예정 | 전역 색·폰트·간격 토큰 시스템 |
| 4 | 레이아웃 모델(flex/grid) | 예정 | 절대위치 → flex/grid 컨테이너, 진짜 reflow |

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

**Stage B — 연기**: per-breakpoint padding/margin/배경 등 *추가* 오버라이드. 데이터 모델+Inspector
UI가 선행돼야 함(지금은 frame/hidden만 편집 가능). 깨끗한 단위로 분리하기 위해 분리.

**근거 파일**: `src/store/*`(오버라이드 cascade), `src/export/code.ts`, `src/types/page.ts`.

**완료 기준(Stage A)**: 노드에 태블릿 frame·모바일 hidden을 주고 export하면 코드에 해당 `@media`
규칙이 생성된다(증거: 위 테스트 + 샘플 출력으로 확인 완료).

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

**완료 기준**: 토큰 하나를 바꾸면 이를 참조하는 노드들이 캔버스·export에서 일괄 반영된다.

## 4. 레이아웃 모델(flex/grid)  ← 마지막(최대 변경)

**문제**: 절대위치(x,y,w,h)만 지원 → export 코드가 reflow되지 않음. 진짜 반응형의 근본 해법이나
캔버스·store·export 전반을 건드리는 가장 큰 아키텍처 변경이라 토대가 안정된 뒤 진행.

**범위**
- flex/grid 컨테이너 타입 + 자식 자동 배치.
- 캔버스 편집 UX, store 모델, export 코드 동시 반영.

**완료 기준**: flex 컨테이너에 자식 배치 후 컨테이너 폭을 줄이면 자식이 reflow되고,
export 코드도 동일하게 동작한다.

---

## 진행 규칙
- 각 항목은 품질 게이트(구현 → 리뷰 → 단순화(선택) → 검증)를 거친다.
- 항목 완료 시 이 표의 상태를 갱신하고, 의미 있는 구조 변경은 `/okf`로 `knowledge/`에 반영.
