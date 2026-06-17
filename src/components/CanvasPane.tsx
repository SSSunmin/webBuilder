export function CanvasPane() {
  return (
    <main className="min-h-[520px] rounded-card border border-line bg-white p-4 shadow-card lg:min-h-0">
      <div className="flex h-full min-h-[480px] items-center justify-center rounded-button border border-dashed border-brand-lightest bg-line2">
        <div className="text-center">
          <p className="text-sm font-semibold text-ink2">캔버스</p>
          <p className="mt-2 text-sm text-muted">컴포넌트 배치 영역</p>
        </div>
      </div>
    </main>
  );
}
