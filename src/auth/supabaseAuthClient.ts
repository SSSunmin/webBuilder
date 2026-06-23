import type { User } from "@supabase/supabase-js";
import { requireSupabase } from "../lib/supabaseClient";
import type { AuthClient, AuthUser } from "./types";

function toUser(user: User | null | undefined): AuthUser | null {
  return user ? { id: user.id, email: user.email ?? null } : null;
}

/**
 * Supabase implementation of AuthClient. One of the three files allowed to
 * import the Supabase SDK directly (client, storage adapter, this).
 */
export class SupabaseAuthClient implements AuthClient {
  private get auth() {
    return requireSupabase().auth;
  }

  async getUser(): Promise<AuthUser | null> {
    const { data } = await this.auth.getUser();
    return toUser(data.user);
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }

  async signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
    const { data, error } = await this.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    // With email confirmation on, Supabase returns no session until confirmed.
    return { needsConfirmation: data.session === null };
  }

  async signOut(): Promise<void> {
    const { error } = await this.auth.signOut();
    if (error) throw new Error(error.message);
  }

  onChange(callback: (user: AuthUser | null) => void): () => void {
    const { data } = this.auth.onAuthStateChange((_event, session) => {
      callback(toUser(session?.user));
    });
    return () => data.subscription.unsubscribe();
  }
}
