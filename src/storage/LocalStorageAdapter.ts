import type { PageDocument, PageMeta } from "../types/page";
import { generateThumbnail } from "../thumbnail/generateThumbnail";
import type { StorageAdapter } from "./StorageAdapter";

const INDEX_KEY = "webbuilder:index";
const projectKey = (id: string) => `webbuilder:project:${id}`;

function nowIso(): string {
  return new Date().toISOString();
}

/** True for the storage-full error, across browsers (name vs legacy codes). */
function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" ||
      e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      e.code === 22 ||
      e.code === 1014)
  );
}

/** Browser localStorage-backed persistence. */
export class LocalStorageAdapter implements StorageAdapter {
  private readIndex(): PageMeta[] {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as PageMeta[];
    } catch {
      return [];
    }
  }

  private writeIndex(metas: PageMeta[]): void {
    localStorage.setItem(INDEX_KEY, JSON.stringify(metas));
  }

  private upsertIndex(meta: PageMeta): void {
    const metas = this.readIndex().filter((m) => m.id !== meta.id);
    metas.unshift(meta);
    this.writeIndex(metas);
  }

  async list(): Promise<PageMeta[]> {
    return this.readIndex().sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  async load(id: string): Promise<PageDocument> {
    const raw = localStorage.getItem(projectKey(id));
    if (!raw) {
      throw new Error(`Project not found: ${id}`);
    }
    return JSON.parse(raw) as PageDocument;
  }

  async save(doc: PageDocument): Promise<void> {
    const updatedAt = nowIso();
    const thumbnail = generateThumbnail(doc);
    try {
      this.persist(doc, updatedAt, thumbnail);
    } catch (e) {
      // If storage is full, drop the (largest, optional) thumbnail and retry so
      // the project itself still saves rather than failing wholesale.
      if (isQuotaError(e)) {
        this.persist(doc, updatedAt, undefined);
        return;
      }
      throw e;
    }
  }

  /** Write the document and its index entry with the given thumbnail. */
  private persist(doc: PageDocument, updatedAt: string, thumbnail?: string): void {
    const updated: PageDocument = {
      ...doc,
      meta: { ...doc.meta, updatedAt, thumbnail },
    };
    localStorage.setItem(projectKey(updated.id), JSON.stringify(updated));
    this.upsertIndex({
      id: updated.id,
      name: updated.meta.name,
      updatedAt,
      thumbnail,
    });
  }

  async remove(id: string): Promise<void> {
    localStorage.removeItem(projectKey(id));
    this.writeIndex(this.readIndex().filter((m) => m.id !== id));
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
    await this.save(copy);
    // save() stamped updatedAt and the thumbnail into the index — return that
    // complete meta rather than the pre-save copy (which lacks both).
    const saved = this.readIndex().find((m) => m.id === copy.id);
    return saved ?? { id: copy.id, name: copy.meta.name, updatedAt: copy.meta.updatedAt };
  }
}
