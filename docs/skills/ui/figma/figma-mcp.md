---
name: figma-mcp
description: Figma MCP로 디자인을 읽고 값을 추출하는 절차. 피그마에서 화면·노드를 불러오거나 node-id·색상·크기를 뽑을 때 읽는다.
---

# 피그마 MCP 읽기·추출

> 디자인을 코드로 옮기기 전, 값을 **정확히 추출**하는 절차. → 묶음: `README.md`

## 활용 순서
1. `get_metadata` 또는 `get_design_context`로 프레임 크기/위치 파악
2. 노드 ID 탐색 — 이름·타입으로 검색(`"modal"`, `"button"`, 한글 라벨 등)
3. 대상 노드의 `get_design_context`로 스타일 값 추출
4. `get_screenshot`으로 시각 확인

- 노드 ID는 피그마 URL `node-id` 파라미터 또는 metadata 텍스트 검색으로 찾는다.
- **URL의 `-`는 `:`로 변환한다** (예: `492-11148` → `492:11148`). 이건 피그마 공통 규칙.

## 대용량 출력 처리
전체 화면(예: 1920×1080) 노드에 `get_design_context`를 호출하면 출력이 커져 파일로 저장될 수 있다.
- **컴포넌트 노드 직접 타겟**: 스크린 노드 대신 실제 컴포넌트 노드 ID 사용.
- **서브에이전트 파싱**: 저장된 파일 경로를 Agent에 넘겨 `jq`/python으로 필요한 값만 추출.

## asset(SVG) 색상 확인
`get_design_context` 출력의 `const imgXxx = "https://www.figma.com/api/mcp/asset/..."` URL은 다운로드하면 **SVG 텍스트**다.
```powershell
(Invoke-WebRequest -Uri "https://www.figma.com/api/mcp/asset/..." -UseBasicParsing).Content
```
내부 `fill="#..."` / `stroke="#..."` / `var(--stroke-0, #XXXXXX)` 값이 실제 색상 → 아이콘 구현 전 반드시 확인.
> ⚠️ asset URL은 보통 **수일 후 만료**된다. URL을 코드에 넣지 말고, 다운로드한 `<path d="...">`를 인라인 SVG로 등록(→ `figma-icons.md`).

## 관련 문서
- `figma-styling.md`(정확 반영) · `figma-icons.md`(아이콘) · `figma-shadcn.md`(shadcn, 조건부)
