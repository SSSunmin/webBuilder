export function LayerTreePane() {
  return (
    <section className="rounded-card border border-line bg-white p-4 shadow-card">
      <h2 className="text-sm font-semibold">레이어 트리</h2>
      <div className="mt-4 space-y-2">
        <div className="h-8 rounded-button bg-brand-pale" />
        <div className="ml-4 h-8 rounded-button bg-line2" />
        <div className="ml-4 h-8 rounded-button bg-line2" />
      </div>
    </section>
  );
}
