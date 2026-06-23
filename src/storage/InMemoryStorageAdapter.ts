import type { PageDocument, PageMeta } from "../types/page";
import { generateThumbnail } from "../thumbnail/generateThumbnail";
import type { StorageAdapter } from "./StorageAdapter";

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Pure in-memory `StorageAdapter`. No browser or network deps, so it is the
 * substrate for the shared adapter contract tests and a reference for any future
 * adapter (e.g. ApiStorageAdapter when promoting to a self-hosted backend).
 */
export class InMemoryStorageAdapter implements StorageAdapter {
  private docs = new Map<string, PageDocument>();

  async list(): Promise<PageMeta[]> {
    return [...this.docs.values()]
      .map((d) => ({
        id: d.id,
        name: d.meta.name,
        updatedAt: d.meta.updatedAt,
        thumbnail: d.meta.thumbnail,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async load(id: string): Promise<PageDocument> {
    const doc = this.docs.get(id);
    if (!doc) throw new Error(`Project not found: ${id}`);
    return structuredClone(doc);
  }

  async save(doc: PageDocument): Promise<void> {
    this.persist(doc);
  }

  async remove(id: string): Promise<void> {
    this.docs.delete(id);
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

  private persist(doc: PageDocument): PageMeta {
    const updatedAt = nowIso();
    const thumbnail = generateThumbnail(doc);
    const stamped: PageDocument = {
      ...doc,
      meta: { ...doc.meta, updatedAt, thumbnail },
    };
    this.docs.set(stamped.id, stamped);
    return { id: stamped.id, name: stamped.meta.name, updatedAt, thumbnail };
  }
}
