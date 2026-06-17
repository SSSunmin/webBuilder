import { useEffect, useState } from "react";

type TextPromptModalProps = {
  open: boolean;
  title: string;
  label: string;
  initialValue?: string;
  confirmText?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

/** Minimal modal with a single text field. Enter confirms, Esc cancels. */
export function TextPromptModal({
  open,
  title,
  label,
  initialValue = "",
  confirmText = "확인",
  onConfirm,
  onCancel,
}: TextPromptModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  if (!open) return null;

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-card border border-line bg-white p-5 shadow-cardHover"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <label className="mt-4 flex flex-col gap-1">
          <span className="text-sm text-muted">{label}</span>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") onCancel();
            }}
            className="h-10 rounded-button border border-line px-3 text-sm focus:border-brand focus:outline-none"
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-9 rounded-button border border-line bg-white px-4 text-sm font-medium text-muted hover:bg-line2"
          >
            취소
          </button>
          <button
            onClick={submit}
            disabled={!value.trim()}
            className="h-9 rounded-button bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
