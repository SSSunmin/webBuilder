import { beforeEach, describe, expect, it } from "vitest";
import { createDocument } from "../store/editorStore";
import type { StorageAdapter } from "./StorageAdapter";

/**
 * Behavioral contract every StorageAdapter must satisfy. Run against any
 * implementation (in-memory, local, and — once provisioned — Supabase) so they
 * stay interchangeable behind the `storage` singleton.
 *
 * `makeAdapter` is called once per test for isolation; `setup` (optional) runs
 * in beforeEach for backends that need per-test global state (e.g. localStorage).
 */
export function runStorageAdapterContract(
  label: string,
  makeAdapter: () => StorageAdapter,
  setup?: () => void,
) {
  describe(`StorageAdapter contract: ${label}`, () => {
    beforeEach(() => setup?.());

    it("save then load round-trips the document", async () => {
      const adapter = makeAdapter();
      const doc = createDocument("P1");
      await adapter.save(doc);
      const loaded = await adapter.load(doc.id);
      expect(loaded.id).toBe(doc.id);
      expect(loaded.rootId).toBe(doc.rootId);
      expect(loaded.meta.name).toBe("P1");
    });

    it("save stamps updatedAt and a thumbnail into meta", async () => {
      const adapter = makeAdapter();
      const doc = createDocument("P");
      await adapter.save(doc);
      const loaded = await adapter.load(doc.id);
      expect(typeof loaded.meta.updatedAt).toBe("string");
      expect(loaded.meta.thumbnail).toBeTruthy();
    });

    it("list returns every saved project as lightweight meta", async () => {
      const adapter = makeAdapter();
      const d1 = createDocument("A");
      const d2 = createDocument("B");
      await adapter.save(d1);
      await adapter.save(d2);
      const metas = await adapter.list();
      expect(metas.map((m) => m.id).sort()).toEqual([d1.id, d2.id].sort());
      expect(metas.every((m) => typeof m.name === "string")).toBe(true);
    });

    it("remove deletes a project", async () => {
      const adapter = makeAdapter();
      const doc = createDocument("X");
      await adapter.save(doc);
      await adapter.remove(doc.id);
      expect((await adapter.list()).find((m) => m.id === doc.id)).toBeUndefined();
      await expect(adapter.load(doc.id)).rejects.toThrow();
    });

    it("duplicate creates an independent copy with a new id", async () => {
      const adapter = makeAdapter();
      const doc = createDocument("Orig");
      await adapter.save(doc);
      const meta = await adapter.duplicate(doc.id);
      expect(meta.id).not.toBe(doc.id);
      expect(meta.name).toContain("복사본");
      const ids = (await adapter.list()).map((m) => m.id);
      expect(ids).toContain(doc.id);
      expect(ids).toContain(meta.id);
    });

    it("load throws for a missing project", async () => {
      const adapter = makeAdapter();
      await expect(adapter.load("does-not-exist")).rejects.toThrow();
    });
  });
}
