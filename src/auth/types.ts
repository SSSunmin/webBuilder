/** Minimal authenticated user the app needs. Backend-agnostic. */
export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * Auth boundary, mirroring the StorageAdapter pattern. The app depends only on
 * this interface (never on @supabase/supabase-js), so a self-hosted backend can
 * drop in an ApiAuthClient later without touching components.
 */
export interface AuthClient {
  /** Current user from the persisted session, or null if signed out. */
  getUser(): Promise<AuthUser | null>;
  /** Sign in with email/password. Throws with a message on failure. */
  signIn(email: string, password: string): Promise<void>;
  /** Sign up. `needsConfirmation` is true when email verification is required
   * before the account can sign in. */
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;
  /** Subscribe to auth state changes. Returns an unsubscribe function. */
  onChange(callback: (user: AuthUser | null) => void): () => void;
}
