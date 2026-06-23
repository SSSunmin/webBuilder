import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDocument } from "../store/editorStore";

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

/**
 * A chainable, thenable stub of the Supabase query builder. Chain methods record
 * their args and return the builder; awaiting the builder (or maybeSingle())
 * resolves to a configurable result. Lets us assert the exact table/columns/
 * filters the adapter builds without a live backend.
 */
const mock = vi.hoisted(() => {
  const state: { result: QueryResult } = { result: { data: null, error: null } };
  const calls: Record<string, unknown[]> = {};
  const record = (name: string, args: unknown[]) => {
    calls[name] = args;
  };
  const builder = {
    select: (...a: unknown[]) => (record("select", a), builder),
    order: (...a: unknown[]) => (record("order", a), builder),
    eq: (...a: unknown[]) => (record("eq", a), builder),
    delete: (...a: unknown[]) => (record("delete", a), builder),
    upsert: (...a: unknown[]) => (record("upsert", a), builder),
    maybeSingle: () => Promise.resolve(state.result),
    then: (onfulfilled: (value: QueryResult) => unknown) =>
      Promise.resolve(state.result).then(onfulfilled),
  };
  const client = {
    from: (...a: unknown[]) => (record("from", a), builder),
  };
  return { state, calls, client };
});

vi.mock("../lib/supabaseClient", () => ({
  requireSupabase: () => mock.client,
  supabase: mock.client,
}));

// Imported after the mock is registered.
const { SupabaseStorageAdapter } = await import("./SupabaseStorageAdapter");

describe("SupabaseStorageAdapter", () => {
  let adapter: InstanceType<typeof SupabaseStorageAdapter>;

  beforeEach(() => {
    for (const key of Object.keys(mock.calls)) delete mock.calls[key];
    mock.state.result = { data: null, error: null };
    adapter = new SupabaseStorageAdapter();
  });

  it("list queries the lightweight columns, ordered by updated_at desc", async () => {
    mock.state.result = {
      data: [{ id: "1", name: "N", updated_at: "2026-01-01T00:00:00.000Z", thumbnail: null }],
      error: null,
    };
    const metas = await adapter.list();
    expect(mock.calls.from).toEqual(["projects"]);
    expect(mock.calls.select).toEqual(["id, name, updated_at, thumbnail"]);
    expect(mock.calls.order).toEqual(["updated_at", { ascending: false }]);
    expect(metas).toEqual([
      { id: "1", name: "N", updatedAt: "2026-01-01T00:00:00.000Z", thumbnail: undefined },
    ]);
  });

  it("load selects the doc column filtered by id and unwraps it", async () => {
    const doc = createDocument("Loaded");
    mock.state.result = { data: { doc }, error: null };
    const loaded = await adapter.load(doc.id);
    expect(mock.calls.select).toEqual(["doc"]);
    expect(mock.calls.eq).toEqual(["id", doc.id]);
    expect(loaded.id).toBe(doc.id);
  });

  it("load throws when no row is found", async () => {
    mock.state.result = { data: null, error: null };
    await expect(adapter.load("missing")).rejects.toThrow(/not found/i);
  });

  it("load surfaces a query error", async () => {
    mock.state.result = { data: null, error: { message: "boom" } };
    await expect(adapter.load("x")).rejects.toThrow("boom");
  });

  it("save upserts a row with stamped doc, name, thumbnail and updated_at", async () => {
    const doc = createDocument("Saved");
    await adapter.save(doc);
    const row = mock.calls.upsert?.[0] as {
      id: string;
      name: string;
      doc: { meta: { thumbnail?: string; updatedAt: string } };
      thumbnail: string;
      updated_at: string;
    };
    expect(row.id).toBe(doc.id);
    expect(row.name).toBe("Saved");
    expect(row.thumbnail).toBeTruthy();
    expect(row.doc.meta.thumbnail).toBe(row.thumbnail);
    expect(row.updated_at).toBe(row.doc.meta.updatedAt);
  });

  it("remove deletes by id", async () => {
    await adapter.remove("42");
    expect(mock.calls.delete).toBeDefined(); // delete() called (with no args)
    expect(mock.calls.eq).toEqual(["id", "42"]);
  });

  it("duplicate loads the source then upserts a fresh-id copy named 복사본", async () => {
    const source = createDocument("Orig");
    mock.state.result = { data: { doc: source }, error: null };
    const meta = await adapter.duplicate(source.id);
    expect(meta.id).not.toBe(source.id);
    expect(meta.name).toBe("Orig (복사본)");
    const row = mock.calls.upsert?.[0] as { id: string; name: string };
    expect(row.id).toBe(meta.id);
    expect(row.name).toBe("Orig (복사본)");
  });
});
