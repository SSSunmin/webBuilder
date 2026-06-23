import { backendEnabled } from "../lib/backendConfig";
import { LocalStorageAdapter } from "./LocalStorageAdapter";
import { SupabaseStorageAdapter } from "./SupabaseStorageAdapter";
import type { StorageAdapter } from "./StorageAdapter";

/**
 * App-wide storage singleton. Selected by env: Supabase when configured,
 * otherwise browser-local. Every caller depends on this one value, so promoting
 * to another backend (e.g. ApiStorageAdapter) is a one-line change here.
 */
export const storage: StorageAdapter = backendEnabled
  ? new SupabaseStorageAdapter()
  : new LocalStorageAdapter();

export type { StorageAdapter };
export { LocalStorageAdapter } from "./LocalStorageAdapter";
