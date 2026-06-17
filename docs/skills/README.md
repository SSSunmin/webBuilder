# docs/skills — 온디맨드 문서 라우터

주제별 상세 지식을 모아두는 곳. **항상 로드하지 않는다** — 작업할 때 해당 문서만 읽어 토큰을 아끼고 집중도를 지킨다.
(절대 불변규칙·라우터 표는 루트 `CLAUDE.md`에. 여기는 "필요할 때 펼치는" 상세.)

## 구조 (예시 — 프로젝트에 맞게 추가/삭제)

```
docs/skills/
├── foundation/   프로젝트 구조 · 코드 컨벤션 · 환경/명령어 · 유틸
├── state/        클라이언트 상태 · 서버 상태 · HTTP
├── ui/           컴포넌트 · 스타일링 · 디자인 시스템 (긴 주제는 하위 폴더로 분리)
│   └── figma/    (조건부) 피그마→코드 스킬팩. 피그마 안 쓰면 폴더 삭제, shadcn 안 쓰면 figma-shadcn.md 삭제
├── data/         DB · 스키마 · 쿼리 (해당 시)
├── testing/      유닛 · E2E · 테스트 전략
└── guide/        skill-guide(작성 기준) · 기타 협업 규칙
```

## 두 가지 사용 방식

1. **수동 라우팅**: 루트 `CLAUDE.md`의 "온디맨드 라우터" 표가 "이 작업엔 이 문서를 먼저 읽어라"라고 가리킨다 → Claude가 Read.
2. **자동 라우팅(권장, 선택)**: 문서 상단에 Skill 프론트매터(`name`/`description`)를 달면 하버스가 *description 한 줄*만 상주시키고 관련 작업에서 **자동으로** 본문을 펼친다 — "읽어라" 지시에 의존하지 않아 더 정확. 작성법은 [`guide/skill-guide.md`](/docs/skills/guide/skill-guide.md).

## 새 문서 추가 절차

1. 적절한 폴더에 `주제.md` 생성([`_TEMPLATE.md`](/docs/skills/_TEMPLATE.md) 복사).
2. 루트 `CLAUDE.md`의 라우터 표에 한 줄 등록.
3. (자동 라우팅 쓰면) 프론트매터 `name`/`description` 작성.

## 폴더 선택 기준

| 내용 | 폴더 |
|---|---|
| 구조 · 빌드 · 환경 · 코딩 규칙 | `foundation/` |
| 클라이언트/서버 상태 · 통신 | `state/` |
| UI · 스타일 · 디자인 시스템 | `ui/` |
| DB · 스키마 · 데이터 | `data/` |
| 테스트 전략 | `testing/` |
| 문서 작성 · 협업 규칙 | `guide/` |
