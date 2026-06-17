import type { PageDocument, PageMeta } from "../types/page";
import type { StorageAdapter } from "./StorageAdapter";

const INDEX_KEY = "webbuilder:index";
const projectKey = (id: string) => `webbuilder:project:${id}`;

function nowIso(): string {
  return new Date().toISOString();
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
    const updated: PageDocument = {
      ...doc,
      meta: { ...doc.meta, updatedAt: nowIso() },
    };
    localStorage.setItem(projectKey(updated.id), JSON.stringify(updated));
    this.upsertIndex({
      id: updated.id,
      name: updated.meta.name,
      updatedAt: updated.meta.updatedAt,
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
    return { id: copy.id, name: copy.meta.name, updatedAt: copy.meta.updatedAt };
  }
}
