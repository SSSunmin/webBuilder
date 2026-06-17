---
name: figma-icons
description: 피그마 SVG 아이콘을 추출해 React 컴포넌트로 등록하는 규칙 — 라이브러리 대체 금지, fill/stroke 처리, viewBox 크기, 이미지 경로.
---

# 피그마 아이콘 & 이미지

> 피그마 아이콘은 **피그마 원본 SVG**로만. → 묶음: `README.md`
> (경로·토큰명은 프로젝트 구조에 맞춰 바꾼다.)

## 피그마 SVG를 그대로 쓴다 (라이브러리 대체 금지)
비슷하게 생긴 다른 SVG(`lucide-react` 등)로 대체하지 않는다. 피그마에서 추출한 SVG를 컴포넌트로 등록한다.
```tsx
// 금지              // 올바름
import { Pencil } from "lucide-react"   →   import { PenLineIcon } from "./icons"
```
- 등록 위치는 프로젝트 구조대로(공용 아이콘 폴더 / 페이지별 `icons.tsx`).
- **미러링 금지**: `transform: scale(-1,1)`로 좌우반전하지 않는다(fill winding 역전·arc 오류). 피그마 원본 path를 쓴다.

## 취득 우선순위
1. **Figma 에셋 URL 직접 다운로드** ← 가장 확실(권장)
2. 아이콘 CDN(있는 것만)
3. 사용자에게 Figma Export 요청(1·2 실패 시)

`get_design_context` 출력 상단의 `const imgIcon = ".../api/mcp/asset/..."`가 **실제 SVG**다(PNG 아님). 다운로드해 path·색상 확인.
> 아이콘 UUID는 **아이콘이 사용된 화면 노드**를 읽을 때 출력에 나타난다. 컴포넌트 정의 노드(외부 라이브러리)는 MCP 직접 접근 불가 → 배치된 화면 노드 대상으로 호출. asset URL은 수일 후 만료되니 URL이 아니라 path를 코드에 등록.

## fill vs stroke (혼동 금지)
색상은 사용처의 `text-*`로 제어되도록 `currentColor`로 바꾼다.
```tsx
// Fill 아이콘: 루트 fill="currentColor", path엔 fill 제거
<svg viewBox="0 0 18 20" width="18" height="20" fill="currentColor" aria-hidden="true"><path d="..."/></svg>

// Stroke 아이콘: 루트 fill="none", path stroke="currentColor"
<svg viewBox="0 0 19.5 19.5" width="19.5" height="19.5" fill="none" aria-hidden="true">
  <path d="..." stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
```
- Fill 아이콘에 stroke 처리(또는 반대)하면 안 보이거나 색 제어가 안 된다.
- 색상은 부모에서: `<button className="text-{muted} hover:text-{strong}"><EditIcon/></button>`.

## 크기: viewBox 그대로
SVG의 `viewBox` 값을 `width`/`height`로 그대로 쓴다. 외부 컨테이너(보통 24×24)로 강제 통일하면 비율이 깨진다.
- 이미 크기를 명시한 아이콘은 사용처에서 `className="h-[..] w-[..]"`로 **오버라이드하지 않는다**(색상 클래스만 전달).

## 이미지
이미지 영역은 `<img>` + 프로젝트 asset 경로에 **의미 있는 파일명**(kebab-case)으로 지정. 파일이 없어도 경로를 미리 두면 같은 이름으로 넣는 즉시 표시된다.

## 관련 문서
- `figma-mcp.md`(asset 다운로드) · `figma-styling.md`(색상 추측금지)
