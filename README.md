# claude-codex 키트 — 하이브리드 (복사용 템플릿)

새 프로젝트에서 **Claude(계획·관리·리뷰) + Codex(구현)** 구성을 쓰고 싶을 때,
이 폴더의 항목을 새 프로젝트 루트에 **복사**하면 됩니다.

> **하이브리드 = 기본 `_claude-kit` + "SKILL 형태"의 장점 결합.** 목표는 **정확도 + 코드품질**.
> - 항상 켜지는 `CLAUDE.md`엔 **절대 불변규칙 + 라우터**만(상시 준수 + 토큰 절약)
> - 상세는 **온디맨드 `docs/skills/`** (필요할 때만 펼침, 자동 라우팅 선택 가능)
> - 역할 작업은 **에이전트/커맨드**(별도 컨텍스트)
> - 코드품질 게이트: **리뷰 → 단순화 → 검증**
> 기본 키트(`_claude-kit`)는 그대로 두고, 이건 **별도** 업그레이드 버전입니다.

## 📋 복사할 항목 (프로젝트마다)

```
CLAUDE.md                      →  새프로젝트\CLAUDE.md   (불변규칙·라우터·품질게이트 — 슬롯 채우기)
USAGE.md                       →  새프로젝트\USAGE.md    (커맨드·에이전트·skills 사용법)
docs\skills\                   →  새프로젝트\docs\skills\ (온디맨드 문서 + 라우터·템플릿·가이드)
.claude\commands\*.md          →  새프로젝트\.claude\commands\
.claude\agents\*.md            →  새프로젝트\.claude\agents\
.claude\settings.local.json    →  새프로젝트\.claude\settings.local.json
knowledge\                     →  새프로젝트\knowledge\   (OKF 지식 번들 시드)
```

PowerShell 한 번에 복사:
```powershell
$dst = "D:\project\새프로젝트"        # 대상 폴더
$src = "D:\project\_claude-kit-hybrid"
New-Item -ItemType Directory $dst -Force | Out-Null
Copy-Item "$src\CLAUDE.md"  $dst
Copy-Item "$src\USAGE.md"   $dst
Copy-Item "$src\docs"       $dst -Recurse
Copy-Item "$src\.claude"    $dst -Recurse
Copy-Item "$src\knowledge"  $dst -Recurse
```
> 이 README는 복사하지 않습니다 (CLAUDE.md · USAGE.md · docs · .claude · knowledge 만 복사).
> 복사 후 **`/setup-rules`를 실행**하면 Claude가 코드 근거 + 질문으로 "절대 불변규칙" 슬롯을 채웁니다(직접 편집도 가능). "온디맨드 라우터"는 문서가 생기는 대로 등록.

## 각 항목이 하는 일

| 항목 | 역할 |
|---|---|
| `CLAUDE.md` | 행동 원칙 + **절대 불변규칙(상시)** + **온디맨드 라우터** + **품질 게이트** + OKF 규칙. 매 세션 자동 로드(얇게 유지) |
| `USAGE.md` | 커맨드·에이전트·skills **사용법 레퍼런스**(용도·호출법·예시·워크플로우). 사람이 참고 |
| `docs\skills\` | **온디맨드 주제 문서**. 라우터(`README.md`) + 작성가이드(`guide/skill-guide.md`) + 템플릿(`_TEMPLATE.md`). 필요할 때만 읽힘 |
| `.claude\commands\` | `/setup-rules` `/plan` `/review` `/simplify` `/verify` `/ultraqa` `/okf` 슬래시 커맨드 |
| `.claude\agents\` | `analyst` `product-planner` `impl-planner` `architect` `code-reviewer` `code-simplifier` `debugger` `qa-tester` `knowledge-curator` 서브에이전트 |
| `.claude\settings.local.json` | 한글 조언형 훅 + 코덱스/파이썬 권한 허용 |
| `knowledge\` | **OKF 지식 번들**. 빈 시드(index.md·log.md)로 시작 → `/okf` 실행 시 코드 근거로 개요·DB·API 문서 자동 생성 |

## 기본 키트(`_claude-kit`) 대비 추가된 것

- **CLAUDE.md**: "⛔ 절대 불변규칙(상시, 빈 슬롯)" + "📂 온디맨드 라우터" + "✅ 품질 게이트" 섹션
- **docs/skills/**: 온디맨드 문서 체계(라우터·가이드·템플릿) — SKILL 형태의 장점 흡수
- **/setup-rules** 커맨드 — 코드 근거 + 질문으로 불변규칙을 채움(planner식, 추측 금지)
- **/simplify** 커맨드 + **code-simplifier** 에이전트 — 동작 보존 단순화 패스(코드품질)
- **docs/skills/ui/figma/** — (조건부) 피그마→코드 범용 스킬팩(MCP·정확반영·아이콘). **피그마 안 쓰면 폴더 삭제**, shadcn 안 쓰면 `figma-shadcn.md`만 삭제. 토큰명·단위 등 특화값은 `/setup-rules`로

## 🚫 복사 안 해도 되는 것 (전역에 1회 설정 완료, 모든 프로젝트 공유)

| 항목 | 위치 |
|---|---|
| Codex MCP 서버 정의 | `~/.claude/codex-mcp.json` |
| 역할분담 규칙 | `~/.claude/codex-role.md` |
| `claude-codex` 런처 함수 | PowerShell `$PROFILE` |
| Codex CLI 설치·인증 | `@openai/codex`, `~/.codex/auth.json` |

## ▶ 사용법

1. 위 "복사할 항목"을 새 프로젝트에 복사
2. **CLAUDE.md의 불변규칙·라우터 슬롯**을 프로젝트에 맞게 채우거나 지운다
3. 터미널에서 그 프로젝트 폴더로 `cd`
4. 실행:
   - `claude-codex` → Codex 연결 + 역할분담(Claude 관리/리뷰, Codex 구현)
   - `claude` → Codex 없이 일반 모드
