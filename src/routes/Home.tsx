import { Link } from "react-router-dom";

export function Home() {
  return (
    <main className="min-h-screen bg-canvas px-6 py-8 text-ink">
      <section className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand">webBuilder</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              프로젝트
            </h1>
          </div>
          <Link
            to="/editor/demo-project"
            className="inline-flex h-10 items-center justify-center rounded-button bg-brand px-4 text-sm font-semibold text-white shadow-hero transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
          >
            새 프로젝트
          </Link>
        </header>

        <div className="flex min-h-[360px] items-center justify-center rounded-card border border-dashed border-brand-lightest bg-white p-8 text-center shadow-card">
          <div className="max-w-sm">
            <h2 className="text-xl font-semibold">프로젝트 없음</h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              아직 저장된 프로젝트가 없습니다. 새 프로젝트를 만들면 에디터
              셸에서 페이지 구성을 시작할 수 있습니다.
            </p>
            <Link
              to="/editor/demo-project"
              className="mt-6 inline-flex h-10 items-center justify-center rounded-button border border-line bg-white px-4 text-sm font-semibold text-brand transition hover:bg-brand-pale focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              새 프로젝트
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
