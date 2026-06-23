---
type: Reference
title: 인증 계층 (AuthClient)
description: 이메일/비밀번호 인증·멀티유저. AuthClient 추상화, Supabase 구현, AuthProvider/useAuth, RequireAuth 게이트, backendEnabled 분기, 자체 서버 승격 seam.
resource: src/auth/types.ts, src/auth/supabaseAuthClient.ts, src/auth/AuthContext.tsx, src/auth/RequireAuth.tsx, src/auth/index.ts, src/routes/Login.tsx, src/lib/backendConfig.ts
tags: [auth, supabase, multiuser, session, rls]
timestamp: 2026-06-23
---

# 인증 계층 (AuthClient)

백엔드(Supabase) 사용 시에만 활성화되는 이메일/비밀번호 인증. **저장 계층과 같은 패턴**: 앱은 `AuthClient` 인터페이스에만 의존하고 Supabase SDK를 직접 보지 않는다 → 자체 서버 승격 시 `ApiAuthClient`로 교체.

## AuthClient 인터페이스 (`auth/types.ts`)

```ts
interface AuthUser { id: string; email: string | null; }

interface AuthClient {
  getUser(): Promise<AuthUser | null>;                 // 영속 세션의 현재 유저
  signIn(email, password): Promise<void>;              // 실패 시 throw
  signUp(email, password): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;
  onChange(cb: (u: AuthUser | null) => void): () => void; // 구독, unsubscribe 반환
}
```

## 싱글톤 + 활성화 (`auth/index.ts`)

```ts
export const authClient: AuthClient | null = backendEnabled
  ? new SupabaseAuthClient()
  : null;  // 로컬 전용 모드 → 인증 없음
```

`SupabaseAuthClient`(`supabaseAuthClient.ts`)는 Supabase SDK import 3곳 중 하나. `signUp`의 `needsConfirmation`은 `data.session === null`(이메일 확인 활성 시)로 도출.

## AuthProvider / useAuth (`AuthContext.tsx`)

- `<AuthProvider>`가 `{ user, loading, signIn, signUp, signOut }`를 컨텍스트로 제공. `App`에서 트리 전체를 감싼다.
- 초기화: **onChange를 진실원본으로** 두고, `getUser()`는 아직 이벤트가 없을 때만 초기값을 시드한다(`sawEvent` 플래그) — 늦게 도착한 `getUser` 응답이 더 최신인 onChange 결과를 덮어쓰지 못하게(경쟁 상태 방지). `getUser` 실패 시 로그아웃으로 간주하고 `loading` 해제.
- `authClient`가 null(로컬 모드)이면 user=null·loading=false로 즉시 렌더 — 백엔드 없이도 앱 동작.

## 라우트 게이트 (`RequireAuth.tsx`) + 로그인 (`routes/Login.tsx`)

- `RequireAuth`: `backendEnabled=false`면 통과(게이트 없음). 백엔드면 `loading` 동안 대기 → 미인증 시 `/login` 리다이렉트.
- `App`: `/login`(공개) + `/`·`/editor/:id`를 `<RequireAuth>`로 보호.
- `Login`: 이메일/비밀번호 로그인·회원가입 토글. 성공 시 `/`로. 회원가입이 이메일 확인을 요구하면 안내 후 로그인 모드로. 이미 로그인됐거나 로컬 모드면 `/`로(단 `loading` 동안엔 대기 — 폼 깜박임 방지).
- `Home`: backendEnabled일 때 사용자 이메일·로그아웃 노출.

## 멀티유저 격리

DB가 강제한다 — `projects.user_id default auth.uid()` + RLS `own_rows`(`auth.uid() = user_id`, using+with check). 클라이언트 어댑터는 user_id를 다루지 않으므로 클라이언트 버그로 격리가 뚫리지 않는다. 상세: [/storage/storage-layer.md](/storage/storage-layer.md).

## 환경 설정

`.env.example` → `.env.local`로 복사 후 `VITE_SUPABASE_URL`·`VITE_SUPABASE_ANON_KEY` 주입(Supabase 대시보드 → Project Settings → API). `0001_projects.sql`을 Supabase SQL 에디터에서 1회 실행. 키가 없으면 로컬 전용으로 동작.

# 관련 개념

- [/storage/storage-layer.md](/storage/storage-layer.md) — 어댑터 선택·SupabaseStorageAdapter·RLS·승격 경로
- [/overview/project.md](/overview/project.md) — 저장 vs Export, 백엔드 승격 맥락
