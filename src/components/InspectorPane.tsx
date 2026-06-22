import type { ReactNode } from "react";
import { getComponentDef } from "../registry";
import { iconDefs } from "../registry/icons";
import { useEditorStore } from "../store/editorStore";
import type { PropSchema } from "../types/component";
import { BREAKPOINTS, resolveFrame, resolveHidden, toSides } from "../types/page";
import type { NodeFrame, ShadowSpec, Sides } from "../types/page";
import { ACTION_TYPES, EVENT_TRIGGERS } from "../types/events";
import type { ActionType, EventBinding, EventTrigger } from "../types/events";

const SIDES: { key: keyof Sides; label: string }[] = [
  { key: "top", label: "상" },
  { key: "right", label: "우" },
  { key: "bottom", label: "하" },
  { key: "left", label: "좌" },
];

const SHADOW_FIELDS: { key: "x" | "y" | "blur" | "spread"; label: string }[] = [
  { key: "x", label: "X" },
  { key: "y", label: "Y" },
  { key: "blur", label: "흐림" },
  { key: "spread", label: "확산" },
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

/** Visual grid picker for a component's icon prop ("" = no icon). */
function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const cell = (active: boolean) =>
    `flex h-9 items-center justify-center rounded-button border ${
      active ? "border-brand bg-brand-pale text-brand" : "border-line text-ink2 hover:bg-line2"
    }`;
  return (
    <div className="grid grid-cols-6 gap-1">
      <button type="button" title="없음" onClick={() => onChange("")} className={cell(!value)}>
        <span className="text-xs">✕</span>
      </button>
      {iconDefs.map((ic) => (
        <button
          key={ic.name}
          type="button"
          title={ic.label}
          onClick={() => onChange(ic.name)}
          className={cell(value === ic.name)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            width={18}
            height={18}
            dangerouslySetInnerHTML={{ __html: ic.svg }}
          />
        </button>
      ))}
    </div>
  );
}

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
    case "icon":
      control = (
        <IconPicker
          value={typeof value === "string" ? value : ""}
          onChange={(v) => onChange(v)}
        />
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

function EventRow({
  ev,
  onChange,
  onRemove,
}: {
  ev: EventBinding;
  onChange: (partial: Partial<Omit<EventBinding, "id">>) => void;
  onRemove: () => void;
}) {
  const targetLabel = ACTION_TYPES.find((a) => a.id === ev.action)?.targetLabel ?? "값";
  return (
    <div className="flex flex-col gap-1.5 rounded-button border border-line p-2">
      <div className="flex items-center gap-1.5">
        <select
          className={inputCls}
          value={ev.trigger}
          onChange={(e) => onChange({ trigger: e.target.value as EventTrigger })}
        >
          {EVENT_TRIGGERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          className={inputCls}
          value={ev.action}
          onChange={(e) => onChange({ action: e.target.value as ActionType })}
        >
          {ACTION_TYPES.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <button
          onClick={onRemove}
          title="이벤트 삭제"
          className="h-9 shrink-0 rounded-button border border-line px-2 text-xs text-muted hover:bg-line2"
        >
          ✕
        </button>
      </div>
      <input
        type="text"
        placeholder={targetLabel}
        className={inputCls}
        value={ev.target ?? ""}
        onChange={(e) => onChange({ target: e.target.value })}
      />
    </div>
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
  const addNodeEvent = useEditorStore((s) => s.addNodeEvent);
  const updateNodeEvent = useEditorStore((s) => s.updateNodeEvent);
  const removeNodeEvent = useEditorStore((s) => s.removeNodeEvent);
  const updateNodeFrame = useEditorStore((s) => s.updateNodeFrame);
  const setNodeBackground = useEditorStore((s) => s.setNodeBackground);
  const setNodeRadius = useEditorStore((s) => s.setNodeRadius);
  const updateNodeShadow = useEditorStore((s) => s.updateNodeShadow);
  const clearNodeShadow = useEditorStore((s) => s.clearNodeShadow);
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
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">그림자</span>
                  <input
                    type="checkbox"
                    checked={Boolean(node.boxShadow)}
                    onChange={(e) =>
                      e.target.checked
                        ? updateNodeShadow(selectedId, {})
                        : clearNodeShadow(selectedId)
                    }
                  />
                </label>
                {node.boxShadow && (
                  <>
                    <div className="grid grid-cols-4 gap-1">
                      {SHADOW_FIELDS.map((f) => (
                        <div key={f.key} className="flex flex-col items-center gap-0.5">
                          <input
                            type="number"
                            title={f.label}
                            className="h-8 w-full rounded-button border border-line px-1 text-center text-xs focus:border-brand focus:outline-none"
                            value={node.boxShadow![f.key]}
                            onChange={(e) =>
                              updateNodeShadow(selectedId, {
                                [f.key]: e.target.value === "" ? 0 : Number(e.target.value),
                              } as Partial<ShadowSpec>)
                            }
                          />
                          <span className="text-[10px] text-muted">{f.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="h-9 w-10 rounded-button border border-line"
                        value={node.boxShadow.color || "#000000"}
                        onChange={(e) => updateNodeShadow(selectedId, { color: e.target.value })}
                      />
                      <label className="flex flex-1 items-center gap-1 text-xs text-muted">
                        투명도
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className={inputCls}
                          value={Math.round(node.boxShadow.opacity * 100)}
                          onChange={(e) =>
                            updateNodeShadow(selectedId, {
                              opacity:
                                Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100,
                            })
                          }
                        />
                        %
                      </label>
                    </div>
                  </>
                )}
              </div>
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

            <div className="flex flex-col gap-3 border-t border-line2 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  이벤트 · 액션
                </p>
                <button
                  onClick={() => addNodeEvent(selectedId)}
                  className="h-7 rounded-button border border-line px-2 text-xs font-medium text-ink2 hover:bg-line2"
                >
                  + 추가
                </button>
              </div>
              {(node.events ?? []).length === 0 ? (
                <p className="text-xs text-muted">
                  클릭·제출 등에 동작을 연결합니다. Export 시 핸들러로 출력됩니다.
                </p>
              ) : (
                (node.events ?? []).map((ev) => (
                  <EventRow
                    key={ev.id}
                    ev={ev}
                    onChange={(partial) => updateNodeEvent(selectedId, ev.id, partial)}
                    onRemove={() => removeNodeEvent(selectedId, ev.id)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
