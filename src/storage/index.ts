import { LocalStorageAdapter } from "./LocalStorageAdapter";
import type { StorageAdapter } from "./StorageAdapter";

/** App-wide storage singleton. Swap this for ApiStorageAdapter to use a backend. */
export const storage: StorageAdapter = new LocalStorageAdapter();

export type { StorageAdapter };
