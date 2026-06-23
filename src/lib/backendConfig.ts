/**
 * Backend selection, driven by env vars. When both Supabase vars are present
 * the app persists to Supabase and requires auth; otherwise it falls back to
 * local-only storage with no auth gate (the default for tests and offline dev).
 *
 * Reading env here keeps `import.meta.env` access in one place — adapters and
 * auth clients depend on these values, never on the raw env.
 */

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** True when Supabase credentials are configured. */
export const backendEnabled = Boolean(url && anonKey);

/** Supabase connection settings. Throws if read while `backendEnabled` is false. */
export function supabaseEnv(): { url: string; anonKey: string } {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase env가 설정되지 않았습니다 (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).",
    );
  }
  return { url, anonKey };
}
