---
name: figma-shadcn
description: (shadcn/ui 프로젝트 전용) shadcn 컴포넌트 기본 스타일을 피그마 디자인에 맞게 재정의하는 패턴. shadcn을 안 쓰면 이 파일을 삭제한다.
---

# shadcn 컴포넌트 디자인 맞추기 (조건부)

> ⚠️ **이 문서는 `shadcn/ui`를 쓰는 프로젝트에만 해당한다.** 안 쓰면 이 파일을 삭제한다.
> 피그마 스타일이 항상 shadcn 기본값을 이기게 만드는 패턴. → 묶음: `README.md`

## 추가 시 스타일 충돌 전수 확인
`npx shadcn@latest add`로 컴포넌트를 추가할 때마다, 내부 스타일과 피그마 스타일이 겹치는 항목을 **전부** 확인하고 피그마가 우선되게 한다:
```
height/width/padding · border-radius · background · border/color · shadow · font · focus ring · hover/active
```

## 문제: 외부 className으로 재정의 안 되는 경우
shadcn 내부에 `data-[size=default]:h-9` 같은 **속성 선택자**가 있으면 명시도가 높아, 외부에서 `h-[4.8rem]`을 줘도 안 먹는다(`tailwind-merge`도 해결 못 함).

## 해결: 조건부 기본값 패턴
`ui/` 컴포넌트 내부에서 외부 className에 해당 속성이 있는지 정규식으로 보고, **없을 때만** 기본값 적용. `data-[*]` 조건부 클래스는 제거하고 이 패턴으로 대체.
```tsx
function Input({ className, ...props }: React.ComponentProps<"input">) {
  const hasHeight  = /(?:^|\s)h-/.test(className ?? "");
  const hasWidth   = /(?:^|\s)w-/.test(className ?? "");
  const hasRounded = /(?:^|\s)rounded-/.test(className ?? "");
  return (
    <input
      className={cn(
        "...기본 스타일...",
        !hasHeight && "h-9",
        !hasWidth && "w-full",
        !hasRounded && "rounded-md",
        className,        // 외부 값이 항상 마지막 → 우선
      )}
      {...props}
    />
  );
}
```
SelectTrigger 등도 동일(`size` 분기 + `!hasBg && "bg-transparent"` 식).

## tailwind-merge로 되는 것 / 안 되는 것
| 케이스 | 처리 |
|---|---|
| 일반 클래스 충돌(`h-9` vs `h-[4.8rem]`) | 가능(뒤가 이김) |
| `shadow-xs` vs `shadow-none`, `ring-[3px]` vs `ring-0` | 가능 |
| `data-[size=default]:h-9` vs `h-[4.8rem]` | **불가** — 조건부 기본값 패턴 필요 |

## 그림자/포커스 링 제거
일반 클래스라 외부 전달로 충분: `<Input className="shadow-none focus-visible:ring-0" />`.

> 구체 수치(`h-[N.Nrem]`, 토큰명)는 프로젝트 디자인 값으로 채운다 — 이 문서의 값은 형식 예시.

## 관련 문서
- `figma-styling.md`(모든 속성 반영) · `figma-mcp.md`(값 추출)
