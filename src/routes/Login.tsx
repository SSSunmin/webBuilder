import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { backendEnabled } from "../lib/backendConfig";
import { useAuth } from "../auth/AuthContext";

type Mode = "signin" | "signup";

export function Login() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in (or backend off) → no reason to be on /login. Wait for the
  // session to resolve so we don't flash the form before redirecting.
  useEffect(() => {
    if (!backendEnabled || (!loading && user)) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          setNotice("확인 이메일을 보냈습니다. 메일의 링크로 인증한 뒤 로그인하세요.");
          setMode("signin");
          return;
        }
      } else {
        await signIn(email, password);
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-8 text-ink">
      <div className="w-full max-w-sm rounded-card border border-line bg-white p-8 shadow-card">
        <p className="text-sm font-medium text-brand">webBuilder</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "로그인" : "회원가입"}
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink2">
            이메일
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-button border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink2">
            비밀번호
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 rounded-button border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-card border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-card border border-brand-lightest bg-brand-pale px-3 py-2 text-sm text-brand">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-button bg-brand px-4 text-sm font-semibold text-white shadow-hero transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-60"
          >
            {busy ? "처리 중…" : mode === "signin" ? "로그인" : "회원가입"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="mt-4 text-sm text-muted hover:text-ink"
        >
          {mode === "signin" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
        </button>
      </div>
    </main>
  );
}
