import type { SupabaseClient } from "@supabase/supabase-js";
import type { PageDocument, PageMeta } from "../types/page";
import { generateThumbnail } from "../thumbnail/generateThumbnail";
import { requireSupabase } from "../lib/supabaseClient";
import type { StorageAdapter } from "./StorageAdapter";

const TABLE = "projects";

/** Row shape of the `projects` table. `user_id` is set DB-side (default auth.uid()). */
interface ProjectRow {
  id: string;
  name: string;
  doc: PageDocument;
  thumbnail: string | null;
  updated_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Supabase-backed persistence, scoped per authenticated user. Row ownership and
 * isolation are enforced by Postgres RLS (see supabase/migrations), so this
 * adapter never filters by user_id itself — every query already sees only the
 * caller's rows.
 */
export class SupabaseStorageAdapter implements StorageAdapter {
  private get client(): SupabaseClient {
    return requireSupabase();
  }

  async list(): Promise<PageMeta[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("id, name, updated_at, thumbnail")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      updatedAt: r.updated_at as string,
      thumbnail: (r.thumbnail as string | null) ?? undefined,
    }));
  }

  async load(id: string): Promise<PageDocument> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("doc")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`Project not found: ${id}`);
    return (data as { doc: PageDocument }).doc;
  }

  async save(doc: PageDocument): Promise<void> {
    await this.persist(doc);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.client.from(TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async duplicate(id: string): Promise<PageMeta> {
    const source = await this.load(id);
    const stamp = nowIso();
    const copy: PageDocument = {
      ...source,
      id: crypto.randomUUID(),
      nodes: structuredClone(source.nodes),
      meta: {
        ...source.meta,
        name: `${source.meta.name} (복사본)`,
        createdAt: stamp,
        updatedAt: stamp,
      },
    };
    return this.persist(copy);
  }

  /**
   * Stamp updatedAt + thumbnail into the document and upsert it (keyed on id,
   * so an existing project is updated). Returns the saved project's meta.
   */
  private async persist(doc: PageDocument): Promise<PageMeta> {
    const updatedAt = nowIso();
    const thumbnail = generateThumbnail(doc);
    const stamped: PageDocument = {
      ...doc,
      meta: { ...doc.meta, updatedAt, thumbnail },
    };
    const row: ProjectRow = {
      id: stamped.id,
      name: stamped.meta.name,
      doc: stamped,
      thumbnail,
      updated_at: updatedAt,
    };
    const { error } = await this.client.from(TABLE).upsert(row, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { id: stamped.id, name: stamped.meta.name, updatedAt, thumbnail };
  }
}
