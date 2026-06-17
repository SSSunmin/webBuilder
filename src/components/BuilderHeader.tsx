import { Link } from "react-router-dom";

type BuilderHeaderProps = {
  projectId: string;
};

export function BuilderHeader({ projectId }: BuilderHeaderProps) {
  return (
    <header className="flex min-h-14 items-center justify-between border-b border-line bg-white px-4 shadow-pane">
      <div className="flex min-w-0 items-center gap-4">
        <Link
          to="/"
          className="text-sm font-semibold text-ink hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
        >
          webBuilder
        </Link>
        <div className="min-w-0 border-l border-line pl-4">
          <p className="truncate text-sm font-medium">프로젝트 {projectId}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="h-9 rounded-md border border-line bg-white px-3 text-sm font-medium text-slate-600">
          저장
        </button>
        <button className="h-9 rounded-md bg-ink px-3 text-sm font-semibold text-white">
          Export
        </button>
      </div>
    </header>
  );
}
