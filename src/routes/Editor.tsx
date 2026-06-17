import { useParams } from "react-router-dom";
import { EditorShell } from "../app/EditorShell";

export function Editor() {
  const { projectId = "unknown" } = useParams();

  return <EditorShell projectId={projectId} />;
}
