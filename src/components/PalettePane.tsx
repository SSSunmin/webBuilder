const paletteItems = ["Layout", "Header", "Text", "Image", "Button", "Input"];

export function PalettePane() {
  return (
    <aside className="rounded-lg border border-line bg-white p-4 shadow-pane">
      <h2 className="text-sm font-semibold">팔레트</h2>
      <div className="mt-4 grid gap-2">
        {paletteItems.map((item) => (
          <button
            key={item}
            className="h-10 rounded-md border border-line bg-slate-50 px-3 text-left text-sm font-medium text-slate-700"
          >
            {item}
          </button>
        ))}
      </div>
    </aside>
  );
}
