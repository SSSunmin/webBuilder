import { backendEnabled } from "../lib/backendConfig";
import { SupabaseAuthClient } from "./supabaseAuthClient";
import type { AuthClient } from "./types";

/**
 * App-wide auth singleton. `null` in local-only mode (no backend → no auth
 * gate). Swap this for an ApiAuthClient when promoting to a self-hosted backend.
 */
export const authClient: AuthClient | null = backendEnabled
  ? new SupabaseAuthClient()
  : null;

export type { AuthClient, AuthUser } from "./types";
