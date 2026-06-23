import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { backendEnabled, supabaseEnv } from "./backendConfig";

/**
 * The single Supabase client for the app. This module is the ONLY place that
 * constructs the SDK client; the storage adapter and auth client import it from
 * here. Keeping SDK construction here (plus those two consumers) is what makes a
 * later swap to a self-hosted backend a two-file change.
 *
 * `null` when Supabase is not configured — callers gated on `backendEnabled`
 * never reach for it in that case.
 */
const env = backendEnabled ? supabaseEnv() : null;

export const supabase: SupabaseClient | null = env
  ? createClient(env.url, env.anonKey)
  : null;

/** Narrowing accessor: returns the client or throws if backend is disabled. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error("Supabase가 설정되지 않았습니다.");
  }
  return supabase;
}
