import { vi } from "vitest";
import { runStorageAdapterContract } from "./adapterContract";
import { InMemoryStorageAdapter } from "./InMemoryStorageAdapter";
import { LocalStorageAdapter } from "./LocalStorageAdapter";

/** Install a fresh in-memory localStorage (the suite runs in the node env). */
function installLocalStorage(): void {
  const store = new Map<string, string>();
  const mock: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    key: (i) => [...store.keys()][i] ?? null,
    removeItem: (k) => store.delete(k),
    setItem: (k, v) => void store.set(k, String(v)),
  };
  vi.stubGlobal("localStorage", mock);
}

// Both built-in adapters must satisfy the same contract.
runStorageAdapterContract("InMemory", () => new InMemoryStorageAdapter());
runStorageAdapterContract("Local", () => new LocalStorageAdapter(), installLocalStorage);
