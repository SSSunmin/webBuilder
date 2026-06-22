import type { ReactNode } from "react";
import { getComponentDef } from "../registry";
import { useEditorStore } from "../store/editorStore";
import type { PropSchema } from "../types/component";
import { BREAKPOINTS, resolveFrame, resolveHidden, toSides } from "../types/page";
import type { NodeFrame, Sides } from "../types/page";

const SIDES: { key: keyof Sides; label: string }[] = [
  { key: "top", label: "상" },
  { key: "right", label: "우" },
  { key: "bottom", label: "하" },
  { key: "left", label: "좌" },
];

function SidesField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Sides;
  onChange: (side: keyof Sides, v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="grid grid-cols-4 gap-1">
        {SIDES.map((s) => (
          <div key={s.key} className="flex flex-col items-center gap-0.5">
            <input
              type="number"
              title={s.label}
              className="h-8 w-full rounded-button border border-line px-1 text-center text-xs focus:border-brand focus:outline-none"
              value={Math.round(value[s.key])}
              onChange={(e) => onChange(s.key, e.target.value === "" ? 0 : Number(e.target.value))}
            />
            <span className="text-[10px] text-muted">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputCls =
  "h-9 w-full rounded-button border border-line px-2 text-sm focus:border-brand focus:outline-none";

function PropField({
  schema,
  value,
  onChange,
}: {
  schema: PropSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  let control: ReactNode;
  switch (schema.control) {
    case "number":
      control = (
        <input
          type="number"
          className={inputCls}
          value={typeof value === "number" ? value : 0}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        />
      );
      break;
    case "select":
      control = (
        <select
          className={inputCls}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          {(schema.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
      break;
    case "boolean":
      control = (
        <label className="flex h-9 items-center gap-2 text-sm text-ink2">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          사용
        </label>
      );
      break;
    case "color":
      control = (
        <div className="flex items-center gap-2">
          <input
            type="color"
            // Disabled while empty ("기본색") so opening the picker can't silently
            // commit #000000 as the value.
            disabled={!(typeof value === "string" && value)}
            className="h-9 w-10 rounded-button border border-line disabled:opacity-40"
            value={typeof value === "string" && value ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            type="text"
            placeholder="비우면 기본"
            className={inputCls}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
      break;
    default:
      control = (
        <input
          type="text"
          className={inputCls}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{schema.label}</span>
      {control}
    </label>
  );
}

function FrameField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <input
        type="number"
        className={inputCls}
        value={Math.round(value)}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </label>
  );
}

export function InspectorPane() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
  const node = useEditorStore((s) =>
    s.selectedIds.length === 1 ? s.document?.nodes[s.selectedIds[0]] : undefined,
  );
  const isRoot = useEditorStore(
    (s) => s.selectedIds.length === 1 && s.document?.rootId === s.selectedIds[0],
  );
  const updateNodeProps = useEditorStore((s) => s.updateNodeProps);
  const updateNodeFrame = useEditorStore((s) => s.updateNodeFrame);
  const setNodeBackground = useEditorStore((s) => s.setNodeBackground);
  const setNodeRadius = useEditorStore((s) => s.setNodeRadius);
  const updateNodeSpacing = useEditorStore((s) => s.updateNodeSpacing);
  const bp = useEditorStore((s) => s.activeBreakpoint);
  const setNodeHidden = useEditorStore((s) => s.setNodeHidden);
  const resetOverride = useEditorStore((s) => s.resetOverride);

  const def = node ? getComponentDef(node.type) : undefined;

  // Show resolved frame for the active breakpoint; editing stays bp-aware via the store.
  const frame = node ? resolveFrame(node, bp) : null;
  const bpLabel = BREAKPOINTS.find((b) => b.id === bp)?.label ?? bp;
  const isCustomBp = bp !== "desktop";
  const hasOverride = isCustomBp && node ? Boolean(node.overrides?.[bp]) : false;

  const setFrame = (key: keyof NodeFrame, v: number) =>
    selectedId && updateNodeFrame(selectedId, { [key]: v }, `frame:${selectedId}:${key}`);

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-card border border-line bg-white shadow-card">
      <h2 className="border-b border-line px-4 py-2 text-sm font-semibold">
        속성{def ? ` · ${def.label}` : ""}
      </h2>
      <div className="flex-1 overflow-auto p-4">
        {selectedIds.length >= 2 ? (
          <p className="text-sm text-muted">
            여러 개 선택됨 ({selectedIds.length}). 캔버스 상단의 정렬 도구를
            사용하세요.
          </p>
        ) : !node || !def || !selectedId ? (
          <p className="text-sm text-muted">
            캔버스나 레이어에서 컴포넌트를 선택하세요. (Shift+클릭으로 다중 선택)
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                위치 · 크기
              </p>
              {isCustomBp && (
                <div className="rounded-button border border-brand-light bg-brand-pale px-2.5 py-1.5 text-xs text-brand">
                  📱 [{bpLabel}] 편집 중 — 변경은 이 브레이크포인트에만 적용됩니다.
                </div>
              )}
              {isCustomBp && hasOverride && (
                <button
                  onClick={() => resetOverride(selectedId, bp)}
                  className="h-8 rounded-button border border-line px-2 text-xs font-medium text-muted hover:bg-line2"
                >
                  이 브레이크포인트 초기화
                </button>
              )}
              {isCustomBp && !isRoot && (
                <label className="flex items-center gap-2 text-sm text-ink2">
                  <input
                    type="checkbox"
                    checked={resolveHidden(node, bp)}
                    onChange={(e) => setNodeHidden(selectedId, bp, e.target.checked)}
                  />
                  이 화면에서 숨김
                </label>
              )}
              <div className="grid grid-cols-2 gap-2">
                {!isRoot && (
                  <>
                    <FrameField label="X" value={frame!.x} onChange={(v) => setFrame("x", v)} />
                    <FrameField label="Y" value={frame!.y} onChange={(v) => setFrame("y", v)} />
                  </>
                )}
                <FrameField label="너비(W)" value={frame!.w} onChange={(v) => setFrame("w", v)} />
                <FrameField label="높이(H)" value={frame!.h} onChange={(v) => setFrame("h", v)} />
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted">배경색</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-9 w-10 rounded-button border border-line"
                    value={node.background || "#ffffff"}
                    onChange={(e) => setNodeBackground(selectedId, e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="비우면 투명"
                    className={inputCls}
                    value={node.background ?? ""}
                    onChange={(e) => setNodeBackground(selectedId, e.target.value)}
                  />
                  <button
                    onClick={() => setNodeBackground(selectedId, "")}
                    className="h-9 shrink-0 rounded-button border border-line px-2 text-xs text-muted hover:bg-line2"
                  >
                    투명
                  </button>
                </div>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted">모서리 둥글기(px)</span>
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  value={Math.round(node.borderRadius ?? 0)}
                  onChange={(e) =>
                    setNodeRadius(selectedId, e.target.value === "" ? 0 : Number(e.target.value))
                  }
                />
              </label>
              {def.isContainer && (
                <SidesField
                  label="패딩"
                  value={toSides(node.padding)}
                  onChange={(side, v) =>
                    updateNodeSpacing(selectedId, { padding: { [side]: v } })
                  }
                />
              )}
              {!isRoot && (
                <SidesField
                  label="마진"
                  value={toSides(node.margin)}
                  onChange={(side, v) =>
                    updateNodeSpacing(selectedId, { margin: { [side]: v } })
                  }
                />
              )}
            </div>

            {def.props.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-line2 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {def.label} 옵션
                </p>
                {def.props.map((schema) => (
                  <PropField
                    key={schema.key}
                    schema={schema}
                    value={node.props[schema.key]}
                    onChange={(v) => updateNodeProps(selectedId, { [schema.key]: v })}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
