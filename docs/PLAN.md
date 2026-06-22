# webBuilder — 기획서 (PLAN)

> 노코드 페이지 빌더. 디자인을 **프로젝트 단위로 관리**하고, 시각적으로 조립한 페이지를 **AI/개발자가 읽고 구현할 수 있는 마크다운(명세서 + 코드)** 으로 출력한다.

작성일: 2026-06-17 · 스택: React + TypeScript

---

## 1. 제품 개요

| 항목 | 내용 |
|------|------|
| 한 줄 정의 | 프로젝트별로 페이지를 드래그&드롭 조립하고, 결과를 MD 명세서/코드로 export 하는 빌더 |
| 핵심 차별점 | 결과물이 "완성 사이트"가 아니라 **AI·개발자용 구조화 MD 문서** |
| 타깃 사용자 | 코드 또는 AI를 활용해 페이지를 만드는 사람 (기획자·개발자·AI 협업) |
| 연계 | `claude-kit-hybrid`의 에이전트/스킬이 이 MD를 받아 실제 코드를 구현하는 파이프라인 |

### 전체 화면 흐름
```
[홈 / 프로젝트 리스트]
   │  · 프로젝트 카드 목록 (없으면 빈 상태)
   │  · "새 프로젝트" 버튼
   │
   ├── 새 프로젝트 ─────────────┐
   │                          ▼
   └── 기존 프로젝트 클릭 ──→ [에디터]
                              │  팔레트 → 캔버스 드롭 → 트리 확인
                              │  → 인스펙터 옵션 편집
                              │  → 저장(작업 지속) / 홈으로
                              │  → Export(MD 산출물, 저장과 별개)
```

### 핵심 구분: 저장 vs Export
| | 저장 (Save) | Export |
|--|-----------|--------|
| 목적 | 작업 내용을 보존하고 **나중에 이어서 작업** | AI/개발자에게 넘길 **산출물(MD) 생성** |
| 대상 | 프로젝트(PageDocument) 전체 | 명세서 / 코드 / 둘 다 |
| 결과 | 스토리지에 영속, 홈 목록에 반영 | .md 파일 다운로드 |

---

## 2. 화면 구조

### 2-1. 홈 (프로젝트 리스트)
| 요소 | 기능 |
|------|------|
| 프로젝트 카드 | 이름, 수정일, (추후 썸네일). 클릭 → 에디터로 이동해 이어서 작업 |
| 빈 상태 | 프로젝트가 없으면 안내 문구 + "새 프로젝트" CTA |
| 새 프로젝트 버튼 | 이름 입력 → 빈 PageDocument 생성 → 에디터로 이동 |
| 카드 액션 | 이름변경 / 복제 / 삭제 |

### 2-2. 에디터 (5-zone)
```
┌─────────────────────────────────────────────────────────┐
│  Header: ←홈 · 프로젝트명 · 저장 · Export · Undo/Redo · 미리보기 │
├──────────┬───────────────────────────────┬──────────────┤
│ 팔레트    │         에디터 캔버스           │ 레이어 트리    │
│ (좌)     │          (중앙)                ├──────────────┤
│          │                               │ 속성 인스펙터  │
└──────────┴───────────────────────────────┴──────────────┘
```

| 영역 | 기능 | MVP |
|------|------|-----|
| **Header** | 홈 이동, 프로젝트명, 저장, Export, Undo/Redo, 미리보기, 디바이스 폭 | ✅ |
| **좌 — 팔레트** | 등록된 컴포넌트 목록. 검색·카테고리. 드래그 시작점 | ✅ |
| **중앙 — 캔버스** | 드롭/선택/이동/삭제/중첩. 선택 시 하이라이트 | ✅ |
| **우상 — 레이어 트리** | 캔버스 노드 트리 뷰. 선택 동기화, 순서변경, 삭제 | ✅ |
| **우하 — 인스펙터** | 선택 노드의 props 편집. 스키마 기반 자동 폼 생성 | ✅ |

---

## 3. 데이터 모델 (핵심)

### 프로젝트 = 저장 단위
```ts
interface PageDocument {
  id: string;                 // 프로젝트 id (uuid)
  version: 1;
  rootId: string;
  nodes: Record<string, PageNode>;   // id -> node (정규화 트리)
  meta: {
    name: string;
    createdAt: string;
    updatedAt: string;
    thumbnail?: string;       // 추후 (홈 카드 미리보기)
  };
}

// 홈 목록용 경량 메타 (전체 로드 없이 카드 렌더)
interface PageMeta {
  id: string;
  name: string;
  updatedAt: string;
}
```

### 노드 트리
```ts
interface PageNode {
  id: string;            // uuid
  type: string;          // 컴포넌트 레지스트리 키 (예: "Button")
  props: Record<string, unknown>;
  children: string[];    // 자식 노드 id (컨테이너형만)
}
```

### 컴포넌트 레지스트리
팔레트·인스펙터·코드생성이 모두 참조. **MVP는 범용 기본 세트**, 레지스트리 구조라 추후 실서비스 컴포넌트로 교체·확장 가능.

```ts
interface ComponentDef {
  type: string;              // "Button"
  label: string;             // 팔레트 표시명
  category: string;          // "기본" | "폼" | "레이아웃" ...
  isContainer: boolean;      // children 허용 여부
  props: PropSchema[];       // 인스펙터 폼 + 기본값
  render: (props) => ReactNode;            // 캔버스 미리보기
  toCode: (node, childrenCode) => string;  // 코드 export
}

interface PropSchema {
  key: string;
  label: string;
  control: "text" | "number" | "select" | "boolean" | "color";
  options?: string[];        // select용
  default: unknown;
}
```

> 인스펙터는 `PropSchema[]`를 읽어 **자동으로 편집 폼 생성** → 컴포넌트 추가 시 인스펙터 코드 수정 불필요.

### MVP 기본 컴포넌트 세트
`Layout(Container)`, `Header`, `Sidebar`, `Form`, `Input`, `Button`, `Text`, `Image`

---

## 4. 저장 계층 (프로젝트 영속)

홈 목록·이어서 작업·저장이 모두 이 어댑터를 통한다. **지금은 로컬, 추후 백엔드로 인터페이스만 교체.**

```ts
interface StorageAdapter {
  list(): Promise<PageMeta[]>;          // 홈 프로젝트 목록
  load(id: string): Promise<PageDocument>;
  save(doc: PageDocument): Promise<void>;
  remove(id: string): Promise<void>;
  duplicate(id: string): Promise<PageMeta>;
}

// MVP: LocalStorageAdapter (또는 IndexedDB) — 브라우저 영속
//      + 프로젝트 JSON 파일 import/export (백업·이동)
// 추후: ApiStorageAdapter (백엔드 + DB, 멀티유저) — 구현체만 교체
```

> **Export(MD)** 는 이 계층과 무관 — 별도 `export/` 모듈에서 산출물만 생성.

---

## 5. MD Export 형식 (산출물)

Export 버튼 → **모드 선택(명세만 / 코드만 / 둘 다)**. 두 출력을 독립 생성기로 분리.

### (A) 명세서 모드 — 사람·AI가 읽는 구조
```md
# Page: 랜딩 페이지

## Layout (container)
- direction: column, padding: 24

  ### Header
  - title: "BigValue"

  ### Button
  - variant: primary
  - text: "제출"
```

### (B) 코드 모드 — 바로 붙일 수 있는 React+TS
```md
## Generated Code

\`\`\`tsx
export function Page() {
  return (
    <Layout direction="column" padding={24}>
      <Header title="BigValue" />
      <Button variant="primary">제출</Button>
    </Layout>
  );
}
\`\`\`
```

### (C) 둘 다 — 명세서 + 하단 코드블록 결합

> 각 컴포넌트의 `toCode()`를 트리 순회하며 재귀 합성. 명세서는 `props` 직렬화로 생성.

---

## 6. 기술 스택 & 아키텍처

| 레이어 | 선택 | 이유 |
|--------|------|------|
| 빌드 | **Vite + React + TypeScript** | 빠른 DX, 가벼움 |
| 라우팅 | **React Router** | 홈(리스트) ↔ 에디터 화면 전환 |
| 상태관리 | **Zustand** | 에디터 트리/선택 상태에 적합, 보일러플레이트 적음 |
| 드래그&드롭 | **dnd-kit** | 모던·접근성·중첩 드롭 지원 |
| 스타일 | **Tailwind CSS** | 추후 shadcn/ui 확장 용이 |
| 히스토리 | Zustand + 스냅샷 스택 | Undo/Redo |

### 폴더 구조(안)
```
webBuilder/
├─ src/
│  ├─ routes/             # 홈(ProjectList), 에디터(Editor)
│  ├─ app/                # 레이아웃 셸 (5-zone)
│  ├─ components/         # 빌더 UI (Palette, Canvas, LayerTree, Inspector, Header)
│  ├─ registry/           # ComponentDef 정의 (기본 세트)
│  ├─ store/              # Zustand: pageDocument, selection, history
│  ├─ export/             # spec.ts(명세 생성), code.ts(코드 생성)
│  ├─ storage/            # StorageAdapter 인터페이스 + 구현체
│  └─ types/              # PageDocument, PageNode, ComponentDef 등
└─ docs/PLAN.md
```

---

## 7. MVP 범위

**포함**:
- 홈(프로젝트 리스트) · 빈 상태 · 새 프로젝트 · 카드(열기/이름변경/복제/삭제)
- 5-zone 에디터 · 기본 컴포넌트 8종 · 드롭/선택/이동/삭제
- 스키마 기반 인스펙터 · 레이어 트리 · Undo/Redo
- 프로젝트 저장/이어서 작업(로컬 영속) · 프로젝트 JSON import/export
- MD Export(명세/코드/둘 다)

**MVP 이후 완료**: 반응형 브레이크포인트별 편집(#5) · 액션/이벤트 바인딩

**제외(추후)**: 실서비스 컴포넌트 연동 · shadcn 세트 · 백엔드/멀티유저 · 카드 썸네일 · 협업

---

## 8. 구현 로드맵

| 단계 | 내용 | 산출 |
|------|------|------|
| **P0** | Vite+React+TS 스캐폴딩, Tailwind, React Router | 기동되는 빈 앱 |
| **P1** | 타입 + StorageAdapter(Local) + 스토어(Zustand) + 레지스트리 | 데이터 계층 |
| **P2** | 홈: 프로젝트 리스트 · 빈 상태 · 생성/삭제/열기 | 프로젝트 관리 |
| **P3** | 에디터 셸(5-zone) + 팔레트 → 캔버스 드롭(dnd-kit) | 컴포넌트 배치 |
| **P4** | 레이어 트리 + 스키마 기반 인스펙터 | 옵션 편집 |
| **P5** | 저장/이어서 작업 + MD Export(3모드) | 핵심 가치 완성 |
| **P6** | Undo/Redo, 미리보기, 다듬기 | MVP 완성 |

---

## 9. 확정된 결정사항
- **프로젝트 관리**: 홈에 리스트(빈 상태 지원), 새 프로젝트 → 에디터, 저장 시 영속, 재진입해 이어서 작업. **저장 ≠ Export**
- **MD Export**: 명세서 + 코드, **버튼으로 분리 선택**
- **컴포넌트**: **범용 기본 세트**로 MVP, 레지스트리 구조로 확장 대비
- **저장**: 로컬 영속(LocalStorage/IndexedDB) + JSON import/export, 저장 계층 추상화로 **추후 백엔드 승격**
- **스택**: React + TypeScript (Vite, React Router, Zustand, dnd-kit, Tailwind)
