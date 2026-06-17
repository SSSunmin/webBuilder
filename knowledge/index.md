# Knowledge Bundle

> **Open Knowledge Format (OKF v0.1) 번들.**
> 각 `.md` = 개념(concept) 1개, YAML 프론트매터의 `type`이 필수.
> 사람이 읽고(`cat`/`git`), AI 에이전트가 컨텍스트로 읽으며, 조직 간 교환이 가능합니다.

## 개념 목록 (Concepts)

<!-- 아직 비어 있습니다. `/okf` 를 실행하면 knowledge-curator가 코드를 읽어
     개요·DB·API 등 개념 문서를 생성하고 이 목록을 채웁니다.

예시 구조:
### 개요
- [프로젝트 개요](/overview/<project>.md) — 무엇을·왜·아키텍처
### 데이터 (DB가 있는 프로젝트만)
- [데이터 모델](/database/data-model.md) — 스키마·관계·인덱스
- [ERD](/database/erd.md) — 엔티티 관계도(Mermaid)
### API
- [<리소스> API](/api/<resource>-api.md) — 엔드포인트
-->

## 번들 규칙 (OKF)
- **예약 파일**: `index.md`(이 파일, 목차), `log.md`(변경 이력). 그 외 모든 `.md`는 개념.
- **필수 프론트매터**: `type` (비어있지 않을 것). 권장: `title` `description` `resource` `tags` `timestamp`.
- **링크**: 번들 루트 기준 절대경로(`/...`)를 사용 — 파일이 옮겨가도 안정적.
- **소비 측 관용**: 누락 필드·모르는 `type`·깨진 링크는 너그럽게 무시.
- **DB 개념은 조건부**: 데이터베이스가 실제로 있는 프로젝트만 `database/`(data-model·erd)를 둔다. 프론트엔드 전용 등 DB 없는 프로젝트는 생략하고, 개요에 "자체 DB 없음(외부 API 소비)"을 명시한다.
- **디자인 토큰 개념도 조건부**: 디자인 시스템/토큰(`tokens.css`·`*.tokens.json` 등)이 있을 때만 `design/tokens`를 둔다. 없거나 별도 관리면 생략·삭제(자기완결형이라 파일 + index 항목만 지우면 됨).
