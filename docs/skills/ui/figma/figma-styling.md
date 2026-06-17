---
name: figma-styling
description: 피그마 디자인을 코드로 정확히 옮기는 규칙 — 색상 추측 금지, 모든 스타일 속성 반영, 디자인 토큰 우선, 레이아웃, 완료 전 스크린샷 대조.
---

# 피그마 정확 반영 & 토큰

> 눈대중 금지, 수치는 MCP로 직접 추출. → 묶음: `README.md`
> (아래 토큰명·rem 수치는 *형식 예시*다. 실제 토큰 명명·단위 환산은 프로젝트 불변규칙을 따른다.)

## ① 색상은 추측 금지 — `get_design_context`로 확인
아이콘·텍스트·배경·보더 색상을 "비슷한 톤/토큰"으로 고르지 않는다. 모두 해당 노드의 `get_design_context` 출력에서 직접 읽는다.
- 자주 나는 실수: chevron·버튼 텍스트 색을 더 진한/옅은 톤으로 추측 → 실제 토큰과 불일치.

## ② 디자인 토큰 우선
임의 hex 대신 프로젝트에 정의된 **디자인 토큰(CSS 변수)** 을 우선 쓴다. 토큰에 없으면 토큰을 추가한 뒤 사용.
```tsx
// 금지            // 권장(토큰명은 프로젝트 규칙대로)
<p className="text-[#334155]" />   →   <p className="text-{neutral-darkest}" />
<div className="bg-[#f8f9fa]" />   →   <div className="bg-{neutral-pale}" />
```
> CSS 변수를 inline으로 참조할 때는 프로젝트의 **정확한 변수명/prefix**를 쓴다(예: `var(--color-primary-main)`). prefix 누락·케이스 오류는 조용히 무효가 된다.

## ③ 모든 스타일 속성 빠짐없이
보이는 것만 옮기지 말고, MCP로 수치를 추출해 아래를 **전부** 확인·반영한다.

| 카테고리 | 확인 항목 |
|---|---|
| 크기 | `width`, `height`(고정/가변) |
| 간격 | `padding`(상하좌우), `gap`, `margin` |
| 테두리 | `border` 유무·`width`·`color`·`radius`(모서리별) |
| 배경 | `background-color`(단색/그라데이션), `background-image` |
| 그림자 | `box-shadow` 방향·흐림·색·불투명도 |
| 타이포 | `font-size`·`weight`·`line-height`·`letter-spacing`·`text-align`·`color` |
| 레이아웃 | `display`·`flex-direction`·`align-items`·`justify-content`·`flex-wrap` |
| 상태 | hover·focus·disabled·active |

## ④ 인터랙티브 서브노드는 별도 `get_design_context`
전체 스크린샷만 보고 버튼·패널·탭을 추측 구현하지 않는다. 버튼 1개라도 노드 ID를 찾아 따로 호출(아이콘 종류·텍스트·배경·텍스트색·shadow 등).

## ⑤ 레이아웃 원칙
- **콘텐츠 너비**: 캔버스 너비 ≠ 콘텐츠 너비. 메인 프레임의 `x`·`width`를 MCP로 확인해 `max-w-[...] mx-auto` 래퍼 적용. 전체폭 요소(페이지네이션·푸터)는 래퍼 바깥.
- **배경색 상속**: bg 미명시 요소는 부모 배경 상속 — 임의로 `bg-white` 추가 금지.
- **flex 늘어남**: `flex flex-col`은 기본 `align-items: stretch`라 버튼이 부모 폭으로 늘어남. 피그마에서 `shrink-0`(콘텐츠 너비)이면 `flex` row wrapper로 감싸 차단.
- **flex-1 위치**: 피그마 `flex-[1_0_0]`은 컴포넌트 내부가 아니라 **루트/래퍼**에 적용(`<MyPanel className="flex-1" />`).

## ⑥ inline 요소 크기
`<span>`은 inline이라 `width`/`height`가 안 먹는다. 크기가 필요한 마커·원형 인디케이터엔 `flex`/`block`/`inline-block` 중 하나 명시.

## ⑦ 완료 전 스크린샷 대조 — 코드 리뷰만으로 완료 금지
각 컴포넌트 구현 후 `get_screenshot`으로 원본과 시각 대조:
```
□ 아이콘 모양 동일?  □ 색상(아이콘·텍스트·배경) 동일?  □ 크기 동일?  □ 0px로 사라진 요소 없나?
```

## 관련 문서
- `figma-mcp.md`(추출) · `figma-icons.md`(아이콘) · `figma-shadcn.md`(shadcn, 조건부)
