export function CanvasPane() {
  return (
    <main className="min-h-[520px] rounded-lg border border-line bg-white p-4 shadow-pane lg:min-h-0">
      <div className="flex h-full min-h-[480px] items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50">
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">캔버스</p>
          <p className="mt-2 text-sm text-slate-500">컴포넌트 배치 영역</p>
        </div>
      </div>
    </main>
  );
}
