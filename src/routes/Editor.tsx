import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EditorShell } from "../app/EditorShell";
import { storage } from "../storage";
import { useEditorStore } from "../store/editorStore";

type Status = "loading" | "ready" | "notfound";

export function Editor() {
  const { projectId = "" } = useParams();
  const loadDocument = useEditorStore((s) => s.loadDocument);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let active = true;
    setStatus("loading");
    storage
      .load(projectId)
      .then((doc) => {
        if (!active) return;
        loadDocument(doc);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("notfound");
      });
    return () => {
      active = false;
    };
  }, [projectId, loadDocument]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-muted">
        불러오는 중…
      </div>
    );
  }

  if (status === "notfound") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas text-center">
        <p className="text-sm text-muted">프로젝트를 찾을 수 없습니다.</p>
        <Link
          to="/"
          className="h-9 rounded-button bg-brand px-4 text-sm font-semibold leading-9 text-white hover:bg-brand-dark"
        >
          홈으로
        </Link>
      </div>
    );
  }

  return <EditorShell projectId={projectId} />;
}
