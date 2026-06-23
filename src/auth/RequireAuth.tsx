import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { backendEnabled } from "../lib/backendConfig";
import { useAuth } from "./AuthContext";

/**
 * Route guard. In local-only mode it passes through (no auth). With a backend,
 * it waits for the session to resolve, then redirects signed-out users to /login.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (!backendEnabled) return <>{children}</>;
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas text-sm text-muted">
        불러오는 중…
      </main>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
