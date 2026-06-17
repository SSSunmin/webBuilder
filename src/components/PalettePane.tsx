const paletteItems = ["Layout", "Header", "Text", "Image", "Button", "Input"];

export function PalettePane() {
  return (
    <aside className="rounded-card border border-line bg-white p-4 shadow-card">
      <h2 className="text-sm font-semibold">팔레트</h2>
      <div className="mt-4 grid gap-2">
        {paletteItems.map((item) => (
          <button
            key={item}
            className="h-10 rounded-button border border-line bg-line2 px-3 text-left text-sm font-medium text-ink2 transition hover:border-brand-lightest hover:bg-brand-pale"
          >
            {item}
          </button>
        ))}
      </div>
    </aside>
  );
}
