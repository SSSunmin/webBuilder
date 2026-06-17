import type { PageDocument, PageMeta } from "../types/page";

/**
 * Persistence boundary for projects. The app depends only on this interface,
 * so the local implementation can be swapped for a backend (ApiStorageAdapter)
 * later without touching callers.
 */
export interface StorageAdapter {
  /** Lightweight list for the home screen. */
  list(): Promise<PageMeta[]>;
  /** Load a full project document. Throws if not found. */
  load(id: string): Promise<PageDocument>;
  /** Persist a project. Updates meta.updatedAt. */
  save(doc: PageDocument): Promise<void>;
  /** Delete a project. */
  remove(id: string): Promise<void>;
  /** Duplicate a project, returning the new project's meta. */
  duplicate(id: string): Promise<PageMeta>;
}
