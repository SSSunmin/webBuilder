import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authClient } from "./index";
import type { AuthUser } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const noClient = () => Promise.reject(new Error("인증이 활성화되지 않았습니다."));

/**
 * Provides auth state to the tree. In local-only mode (no authClient) it renders
 * children immediately with a null user, so the app works without a backend.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // No backend → nothing to load, no session to track.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(authClient !== null);

  useEffect(() => {
    if (!authClient) return;
    let active = true;
    // onChange is the source of truth (covers sign-in/out after mount). getUser
    // only seeds the initial state IF no change event has arrived yet — so a
    // late getUser response can never clobber a fresher onChange result.
    let sawEvent = false;
    const apply = (u: AuthUser | null) => {
      if (!active) return;
      setUser(u);
      setLoading(false);
    };
    const unsubscribe = authClient.onChange((u) => {
      sawEvent = true;
      apply(u);
    });
    authClient
      .getUser()
      .then((u) => {
        if (!sawEvent) apply(u);
      })
      .catch(() => {
        // Couldn't read the session → treat as signed out, stop blocking the UI.
        if (!sawEvent) apply(null);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback((email: string, password: string) => {
    return authClient ? authClient.signIn(email, password) : noClient();
  }, []);

  const signUp = useCallback((email: string, password: string) => {
    return authClient ? authClient.signUp(email, password) : noClient();
  }, []);

  const signOut = useCallback(async () => {
    if (authClient) await authClient.signOut();
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access auth state. Must be used under <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth는 <AuthProvider> 안에서만 사용할 수 있습니다.");
  return ctx;
}
