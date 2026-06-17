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
          className="text-sm font-semibold text-brand hover:text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
        >
          webBuilder
        </Link>
        <div className="min-w-0 border-l border-line pl-4">
          <p className="truncate text-sm font-medium text-ink2">
            프로젝트 {projectId}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="h-9 rounded-button border border-line bg-white px-3 text-sm font-medium text-muted">
          저장
        </button>
        <button className="h-9 rounded-button bg-brand px-3 text-sm font-semibold text-white shadow-card hover:bg-brand-dark">
          Export
        </button>
      </div>
    </header>
  );
}
