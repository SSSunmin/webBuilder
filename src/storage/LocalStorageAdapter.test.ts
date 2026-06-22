import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorageAdapter } from "./LocalStorageAdapter";
import { createDocument } from "../store/editorStore";

/** Minimal in-memory localStorage (the suite runs in the node environment). */
function installLocalStorage(): Map<string, string> {
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
  return store;
}

describe("LocalStorageAdapter thumbnails", () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    installLocalStorage();
    adapter = new LocalStorageAdapter();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("writes a thumbnail into both the document and the index on save", async () => {
    const doc = createDocument("p1");
    await adapter.save(doc);

    const loaded = await adapter.load(doc.id);
    expect(loaded.meta.thumbnail).toMatch(/^data:image\/svg\+xml,/);

    const [meta] = await adapter.list();
    expect(meta.thumbnail).toBe(loaded.meta.thumbnail);
  });

  it("returns a complete meta (with thumbnail) from duplicate()", async () => {
    const doc = createDocument("p1");
    await adapter.save(doc);

    const dupMeta = await adapter.duplicate(doc.id);
    expect(dupMeta.thumbnail).toMatch(/^data:image\/svg\+xml,/);
    expect(dupMeta.name).toBe("p1 (복사본)");
  });

  it("falls back to a thumbnail-less save when storage is full", async () => {
    const doc = createDocument("p1");
    let calls = 0;
    const real = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, "setItem").mockImplementation((k, v) => {
      // Reject only the first (thumbnailed) document write, then allow retries.
      if (++calls === 1) {
        throw new DOMException("full", "QuotaExceededError");
      }
      real(k, v);
    });

    await expect(adapter.save(doc)).resolves.toBeUndefined();
    const loaded = await adapter.load(doc.id);
    expect(loaded.meta.thumbnail).toBeUndefined();
  });

  it("rethrows non-quota errors instead of silently dropping the thumbnail", async () => {
    const doc = createDocument("p1");
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new TypeError("boom");
    });
    await expect(adapter.save(doc)).rejects.toThrow("boom");
  });
});
