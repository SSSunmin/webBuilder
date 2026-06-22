import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { TextPromptModal } from "../components/TextPromptModal";
import { storage } from "../storage";
import { ProjectFileError, parseProject, prepareImport } from "../storage/projectFile";
import { createDocument } from "../store/editorStore";
import type { PageMeta } from "../types/page";

type ModalState =
  | { mode: "create" }
  | { mode: "rename"; id: string; initial: string }
  | null;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("ko-KR");
}

export function Home() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<PageMeta[] | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setProjects(await storage.list());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = async (name: string) => {
    const doc = createDocument(name);
    await storage.save(doc);
    navigate(`/editor/${doc.id}`);
  };

  const handleRename = async (id: string, name: string) => {
    const doc = await storage.load(id);
    doc.meta.name = name;
    await storage.save(doc);
    setModal(null);
    await refresh();
  };

  const handleDuplicate = async (id: string) => {
    await storage.duplicate(id);
    await refresh();
  };

  const handleDelete = async (meta: PageMeta) => {
    if (!window.confirm(`"${meta.name}" 프로젝트를 삭제할까요?`)) return;
    await storage.remove(meta.id);
    await refresh();
  };

  // Import a .json backup as a new project (fresh id, never overwrites).
  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again later
    if (!file) return;
    setImportError(null);
    try {
      const doc = prepareImport(parseProject(await file.text()));
      await storage.save(doc);
      navigate(`/editor/${doc.id}`);
    } catch (err) {
      // Bad file → show the specific reason; anything else (e.g. storage full)
      // → a generic notice rather than a raw browser error string.
      setImportError(
        err instanceof ProjectFileError
          ? err.message
          : "가져오지 못했습니다. 저장 공간이 부족하거나 파일을 읽을 수 없습니다.",
      );
    }
  };

  return (
    <main className="min-h-screen bg-canvas px-6 py-8 text-ink">
      <section className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand">webBuilder</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">프로젝트</h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="프로젝트 .json 파일을 새 프로젝트로 가져오기"
              className="inline-flex h-10 items-center justify-center rounded-button border border-line bg-white px-4 text-sm font-semibold text-brand transition hover:bg-brand-pale focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              가져오기
            </button>
            <button
              onClick={() => setModal({ mode: "create" })}
              className="inline-flex h-10 items-center justify-center rounded-button bg-brand px-4 text-sm font-semibold text-white shadow-hero transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              새 프로젝트
            </button>
          </div>
        </header>

        {importError && (
          <p
            role="alert"
            className="-mt-4 rounded-card border border-error/30 bg-error/5 px-4 py-2 text-sm text-error"
          >
            가져오기 실패: {importError}
          </p>
        )}

        {projects === null ? (
          <p className="py-12 text-center text-sm text-muted">불러오는 중…</p>
        ) : projects.length === 0 ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-card border border-dashed border-brand-lightest bg-white p-8 text-center shadow-card">
            <div className="max-w-sm">
              <h2 className="text-xl font-semibold">프로젝트 없음</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                아직 저장된 프로젝트가 없습니다. 새 프로젝트를 만들면 에디터에서
                페이지 구성을 시작할 수 있습니다.
              </p>
              <button
                onClick={() => setModal({ mode: "create" })}
                className="mt-6 inline-flex h-10 items-center justify-center rounded-button border border-line bg-white px-4 text-sm font-semibold text-brand transition hover:bg-brand-pale focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
              >
                새 프로젝트
              </button>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li
                key={p.id}
                className="group flex flex-col rounded-card border border-line bg-white p-4 shadow-card transition hover:border-brand-lightest hover:shadow-cardHover"
              >
                <button
                  onClick={() => navigate(`/editor/${p.id}`)}
                  className="flex flex-1 flex-col items-start text-left"
                >
                  {p.thumbnail ? (
                    <img
                      src={p.thumbnail}
                      alt=""
                      className="mb-3 aspect-[4/3] w-full rounded-chip border border-line2 bg-canvas object-contain"
                    />
                  ) : (
                    <div className="mb-3 flex aspect-[4/3] w-full items-center justify-center rounded-chip border border-dashed border-line2 bg-canvas text-xs text-muted">
                      미리보기 없음
                    </div>
                  )}
                  <span className="line-clamp-2 font-semibold text-ink">{p.name}</span>
                  <span className="mt-2 text-xs text-muted">
                    수정: {formatDate(p.updatedAt)}
                  </span>
                </button>
                <div className="mt-4 flex gap-2 border-t border-line2 pt-3 text-xs">
                  <button
                    onClick={() => setModal({ mode: "rename", id: p.id, initial: p.name })}
                    className="rounded-chip px-2 py-1 text-muted hover:bg-line2 hover:text-ink"
                  >
                    이름변경
                  </button>
                  <button
                    onClick={() => handleDuplicate(p.id)}
                    className="rounded-chip px-2 py-1 text-muted hover:bg-line2 hover:text-ink"
                  >
                    복제
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="ml-auto rounded-chip px-2 py-1 text-error hover:bg-error/10"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TextPromptModal
        open={modal?.mode === "create"}
        title="새 프로젝트"
        label="프로젝트 이름"
        initialValue="제목 없는 프로젝트"
        confirmText="만들기"
        onConfirm={handleCreate}
        onCancel={() => setModal(null)}
      />
      <TextPromptModal
        open={modal?.mode === "rename"}
        title="이름 변경"
        label="프로젝트 이름"
        initialValue={modal?.mode === "rename" ? modal.initial : ""}
        confirmText="저장"
        onConfirm={(name) =>
          modal?.mode === "rename" ? handleRename(modal.id, name) : undefined
        }
        onCancel={() => setModal(null)}
      />
    </main>
  );
}
