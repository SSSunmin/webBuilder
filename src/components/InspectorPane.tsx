import { useState } from "react";
import type { ReactNode } from "react";
import { getComponentDef } from "../registry";
import { iconDefs } from "../registry/icons";
import { useEditorStore } from "../store/editorStore";
import type { PropSchema } from "../types/component";
import {
  BREAKPOINTS,
  colorTokenKey,
  isColorTokenRef,
  isSpacingTokenRef,
  isValidTokenKey,
  makeColorTokenRef,
  makeSpacingTokenRef,
  resolveColor,
  resolveFrame,
  resolveHidden,
  spacingTokenKey,
  toSides,
} from "../types/page";
import type {
  DocumentTokens,
  FlowAlign,
  FlowJustify,
  NodeFrame,
  PageNode,
  ShadowSpec,
  Sides,
} from "../types/page";
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

/** The four per-side number inputs (no label/wrapper). */
function SidesGrid({
  value,
  onChange,
}: {
  value: Sides;
  onChange: (side: keyof Sides, v: number) => void;
}) {
  return (
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
  );
}

/** Padding/margin control: a literal per-side grid, or a uniform spacing token.
 * Mirrors BackgroundControl — a token dropdown (shown only when spacing tokens
 * exist) toggles between 커스텀 (the grid) and a token (read-only resolved px). */
function SpacingControl({
  label,
  value,
  tokens,
  onSetSides,
  onSetToken,
}: {
  label: string;
  value: Sides | string | undefined;
  tokens: DocumentTokens | undefined;
  onSetSides: (side: keyof Sides, v: number) => void;
  onSetToken: (key: string) => void;
}) {
  const tokenKeys = Object.keys(tokens?.spacing ?? {});
  const isToken = isSpacingTokenRef(value);
  const resolved = isToken ? tokens?.spacing?.[spacingTokenKey(value)] : undefined;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      {tokenKeys.length > 0 && (
        <select
          className={inputCls}
          value={isToken ? spacingTokenKey(value) : ""}
          onChange={(e) => onSetToken(e.target.value)}
        >
          <option value="">커스텀</option>
          {tokenKeys.map((k) => (
            <option key={k} value={k}>
              토큰: {k}
            </option>
          ))}
        </select>
      )}
      {isToken ? (
        <span className="text-sm text-ink2">
          토큰 <code className="text-xs">{spacingTokenKey(value)}</code>{" "}
          {typeof resolved === "number" ? `(${resolved}px · 모든 변)` : "(미정의)"}
        </span>
      ) : (
        <SidesGrid value={toSides(value, tokens)} onChange={onSetSides} />
      )}
    </div>
  );
}

const inputCls =
  "h-9 w-full rounded-button border border-line px-2 text-sm focus:border-brand focus:outline-none";

const FLEX_DIRS: { value: "row" | "column"; label: string }[] = [
  { value: "row", label: "가로" },
  { value: "column", label: "세로" },
];
const FLEX_JUSTIFY: { value: FlowJustify; label: string }[] = [
  { value: "start", label: "시작" },
  { value: "center", label: "가운데" },
  { value: "end", label: "끝" },
  { value: "between", label: "양끝(공백 분배)" },
];
const FLEX_ALIGN: { value: FlowAlign; label: string }[] = [
  { value: "start", label: "시작" },
  { value: "center", label: "가운데" },
  { value: "end", label: "끝" },
  { value: "stretch", label: "늘이기" },
];

/** Container child-layout control: 자유 배치(absolute, frame 좌표) ↔ Flex(자동 흐름).
 * When flex, exposes direction/gap/주축·교차축 정렬. Flex children flow and wrap,
 * so reorder them from the layer tree (canvas drag is disabled in flow). */
function LayoutControl({
  node,
  onChange,
}: {
  node: PageNode;
  onChange: (
    partial: Partial<
      Pick<PageNode, "layout" | "flexDirection" | "gap" | "alignItems" | "justifyContent">
    >,
  ) => void;
}) {
  const flex = node.layout === "flex";
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">자식 배치</span>
        <select
          className={inputCls}
          value={flex ? "flex" : "absolute"}
          onChange={(e) => onChange({ layout: e.target.value === "flex" ? "flex" : "absolute" })}
        >
          <option value="absolute">자유 배치 (좌표)</option>
          <option value="flex">Flex (자동 흐름)</option>
        </select>
      </label>
      {flex && (
        <div className="flex flex-col gap-2 rounded-button border border-line2 p-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">방향</span>
            <select
              className={inputCls}
              value={node.flexDirection === "column" ? "column" : "row"}
              onChange={(e) =>
                onChange({ flexDirection: e.target.value === "column" ? "column" : "row" })
              }
            >
              {FLEX_DIRS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">간격 (gap, px)</span>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={Math.max(0, Math.round(node.gap ?? 0))}
              onChange={(e) => onChange({ gap: e.target.value === "" ? 0 : Number(e.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">주축 정렬</span>
            <select
              className={inputCls}
              value={node.justifyContent ?? "start"}
              onChange={(e) => onChange({ justifyContent: e.target.value as FlowJustify })}
            >
              {FLEX_JUSTIFY.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">교차축 정렬</span>
            <select
              className={inputCls}
              value={node.alignItems ?? "start"}
              onChange={(e) => onChange({ alignItems: e.target.value as FlowAlign })}
            >
              {FLEX_ALIGN.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

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

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

/** Background picker that can point at a literal color or a color token. A token
 * reference shows a read-only resolved swatch (the native color input can't hold
 * a `token:` value); a literal shows the editable picker + text + 투명 button. */
function BackgroundControl({
  background,
  tokens,
  onChange,
}: {
  background: string | undefined;
  tokens: DocumentTokens | undefined;
  onChange: (value: string) => void;
}) {
  const tokenKeys = Object.keys(tokens?.colors ?? {});
  const isToken = isColorTokenRef(background);
  const resolved = resolveColor(background, tokens);

  const onSelect = (v: string) => {
    // "" → literal color, seeded from whatever color is showing now.
    onChange(v === "" ? resolved ?? "" : makeColorTokenRef(v));
  };

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">배경색</span>
      {tokenKeys.length > 0 && (
        <select
          className={inputCls}
          value={isToken ? colorTokenKey(background!) : ""}
          onChange={(e) => onSelect(e.target.value)}
        >
          <option value="">커스텀 색상</option>
          {tokenKeys.map((k) => (
            <option key={k} value={k}>
              토큰: {k}
            </option>
          ))}
        </select>
      )}
      {isToken ? (
        <div className="flex items-center gap-2">
          <span
            className="h-9 w-10 shrink-0 rounded-button border border-line"
            style={{ background: resolved ?? "transparent" }}
          />
          <span className="text-sm text-ink2">
            토큰 <code className="text-xs">{colorTokenKey(background!)}</code>
            {resolved ? "" : " (미정의)"}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-9 w-10 rounded-button border border-line"
            value={background || "#ffffff"}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            type="text"
            placeholder="비우면 투명"
            className={inputCls}
            value={background ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          <button
            onClick={() => onChange("")}
            className="h-9 shrink-0 rounded-button border border-line px-2 text-xs text-muted hover:bg-line2"
          >
            투명
          </button>
        </div>
      )}
    </label>
  );
}

/** Document-level color token list + add row. Editing a token's value updates
 * every node that references it (canvas + export) at once. */
function ColorTokenManager({
  tokens,
  onSet,
  onRemove,
}: {
  tokens: DocumentTokens | undefined;
  onSet: (key: string, value: string) => void;
  onRemove: (key: string) => void;
}) {
  const colors = tokens?.colors ?? {};
  const entries = Object.entries(colors);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("#3b82f6");

  const keyTaken = newKey in colors;
  const canAdd = isValidTokenKey(newKey) && !keyTaken;
  const add = () => {
    if (!canAdd) return;
    onSet(newKey, newValue);
    setNewKey("");
  };

  return (
    <div className="flex flex-col gap-3 border-t border-line2 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        디자인 토큰 · 색상
      </p>
      {entries.length === 0 ? (
        <p className="text-xs text-muted">
          색상 토큰을 추가하면 여러 노드에서 재사용하고 한 번에 바꿀 수 있습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <input
                type="color"
                className="h-8 w-9 shrink-0 rounded-button border border-line"
                value={HEX_RE.test(v) ? v : "#ffffff"}
                onChange={(e) => onSet(k, e.target.value)}
              />
              <code className="w-16 shrink-0 truncate text-xs" title={k}>
                {k}
              </code>
              <input
                type="text"
                className="h-8 flex-1 rounded-button border border-line px-2 text-xs focus:border-brand focus:outline-none"
                value={v}
                onChange={(e) => onSet(k, e.target.value)}
              />
              <button
                onClick={() => onRemove(k)}
                title="삭제"
                className="h-8 shrink-0 rounded-button border border-line px-2 text-xs text-muted hover:bg-line2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-8 w-9 shrink-0 rounded-button border border-line"
          value={HEX_RE.test(newValue) ? newValue : "#ffffff"}
          onChange={(e) => setNewValue(e.target.value)}
        />
        <input
          type="text"
          placeholder="이름 (예: brand)"
          className="h-8 w-24 shrink-0 rounded-button border border-line px-2 text-xs focus:border-brand focus:outline-none"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button
          onClick={add}
          disabled={!canAdd}
          className="h-8 shrink-0 rounded-button border border-line px-3 text-xs font-medium text-ink2 hover:bg-line2 disabled:opacity-40"
        >
          추가
        </button>
      </div>
      {newKey && !isValidTokenKey(newKey) && (
        <p className="text-[11px] text-red-500">이름은 영문자로 시작, 영문·숫자·하이픈만.</p>
      )}
      {keyTaken && <p className="text-[11px] text-red-500">이미 있는 이름입니다.</p>}
    </div>
  );
}

/** Document-level font token list + add row. The `body` token becomes the
 * page's base font (applied to the root in canvas/preview/export). */
function FontTokenManager({
  tokens,
  onSet,
  onRemove,
}: {
  tokens: DocumentTokens | undefined;
  onSet: (key: string, value: string) => void;
  onRemove: (key: string) => void;
}) {
  const fonts = tokens?.fonts ?? {};
  const entries = Object.entries(fonts);
  const [newKey, setNewKey] = useState("body");
  const [newValue, setNewValue] = useState("Pretendard, sans-serif");

  const keyTaken = newKey in fonts;
  const canAdd = isValidTokenKey(newKey) && !keyTaken && newValue.trim() !== "";
  const add = () => {
    if (!canAdd) return;
    onSet(newKey, newValue.trim());
    setNewKey("");
  };

  return (
    <div className="flex flex-col gap-3 border-t border-line2 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">디자인 토큰 · 글꼴</p>
      {entries.length === 0 ? (
        <p className="text-xs text-muted">
          글꼴 토큰을 추가하면 페이지 전체 글꼴을 한 번에 바꿀 수 있습니다 (이름 <code>body</code> = 페이지 기본 글꼴).
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <code className="w-16 shrink-0 truncate text-xs" title={k}>
                {k}
              </code>
              <input
                type="text"
                className="h-8 flex-1 rounded-button border border-line px-2 text-xs focus:border-brand focus:outline-none"
                style={{ fontFamily: v }}
                value={v}
                onChange={(e) => onSet(k, e.target.value)}
              />
              <button
                onClick={() => onRemove(k)}
                title="삭제"
                className="h-8 shrink-0 rounded-button border border-line px-2 text-xs text-muted hover:bg-line2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="이름 (예: body)"
          className="h-8 w-20 shrink-0 rounded-button border border-line px-2 text-xs focus:border-brand focus:outline-none"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
        />
        <input
          type="text"
          placeholder="글꼴 (예: Pretendard, sans-serif)"
          className="h-8 flex-1 rounded-button border border-line px-2 text-xs focus:border-brand focus:outline-none"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button
          onClick={add}
          disabled={!canAdd}
          className="h-8 shrink-0 rounded-button border border-line px-3 text-xs font-medium text-ink2 hover:bg-line2 disabled:opacity-40"
        >
          추가
        </button>
      </div>
      {newKey && !isValidTokenKey(newKey) && (
        <p className="text-[11px] text-red-500">이름은 영문자로 시작, 영문·숫자·하이픈만.</p>
      )}
      {keyTaken && <p className="text-[11px] text-red-500">이미 있는 이름입니다.</p>}
    </div>
  );
}

/** Document-level spacing token list + add row. Padding/margin can reference a
 * spacing token (uniform) via SpacingControl; editing the value updates all refs. */
function SpacingTokenManager({
  tokens,
  onSet,
  onRemove,
}: {
  tokens: DocumentTokens | undefined;
  onSet: (key: string, value: number) => void;
  onRemove: (key: string) => void;
}) {
  const spacing = tokens?.spacing ?? {};
  const entries = Object.entries(spacing);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState(16);

  const keyTaken = newKey in spacing;
  const canAdd = isValidTokenKey(newKey) && !keyTaken;
  const add = () => {
    if (!canAdd) return;
    onSet(newKey, newValue);
    setNewKey("");
  };

  return (
    <div className="flex flex-col gap-3 border-t border-line2 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">디자인 토큰 · 간격</p>
      {entries.length === 0 ? (
        <p className="text-xs text-muted">
          간격 토큰(예: <code>md</code> = 16)을 추가하면 패딩·마진에서 재사용하고 한 번에 바꿀 수 있습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <code className="w-16 shrink-0 truncate text-xs" title={k}>
                {k}
              </code>
              <input
                type="number"
                min={0}
                className="h-8 flex-1 rounded-button border border-line px-2 text-xs focus:border-brand focus:outline-none"
                value={v}
                onChange={(e) => onSet(k, e.target.value === "" ? 0 : Number(e.target.value))}
              />
              <span className="text-xs text-muted">px</span>
              <button
                onClick={() => onRemove(k)}
                title="삭제"
                className="h-8 shrink-0 rounded-button border border-line px-2 text-xs text-muted hover:bg-line2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="이름 (예: md)"
          className="h-8 w-24 shrink-0 rounded-button border border-line px-2 text-xs focus:border-brand focus:outline-none"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <input
          type="number"
          min={0}
          className="h-8 w-20 rounded-button border border-line px-2 text-xs focus:border-brand focus:outline-none"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value === "" ? 0 : Number(e.target.value))}
        />
        <span className="text-xs text-muted">px</span>
        <button
          onClick={add}
          disabled={!canAdd}
          className="h-8 shrink-0 rounded-button border border-line px-3 text-xs font-medium text-ink2 hover:bg-line2 disabled:opacity-40"
        >
          추가
        </button>
      </div>
      {newKey && !isValidTokenKey(newKey) && (
        <p className="text-[11px] text-red-500">이름은 영문자로 시작, 영문·숫자·하이픈만.</p>
      )}
      {keyTaken && <p className="text-[11px] text-red-500">이미 있는 이름입니다.</p>}
    </div>
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
  const setNodeLayout = useEditorStore((s) => s.setNodeLayout);
  const tokens = useEditorStore((s) => s.document?.meta.tokens);
  const setColorToken = useEditorStore((s) => s.setColorToken);
  const removeColorToken = useEditorStore((s) => s.removeColorToken);
  const setFontToken = useEditorStore((s) => s.setFontToken);
  const removeFontToken = useEditorStore((s) => s.removeFontToken);
  const setSpacingToken = useEditorStore((s) => s.setSpacingToken);
  const removeSpacingToken = useEditorStore((s) => s.removeSpacingToken);
  const updateNodeShadow = useEditorStore((s) => s.updateNodeShadow);
  const clearNodeShadow = useEditorStore((s) => s.clearNodeShadow);
  const updateNodeSpacing = useEditorStore((s) => s.updateNodeSpacing);
  const setNodeSpacingValue = useEditorStore((s) => s.setNodeSpacingValue);
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
      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
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
              <BackgroundControl
                background={node.background}
                tokens={tokens}
                onChange={(v) => setNodeBackground(selectedId, v)}
              />
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
                <LayoutControl
                  node={node}
                  onChange={(partial) => setNodeLayout(selectedId, partial)}
                />
              )}
              {def.isContainer && (
                <SpacingControl
                  label="패딩"
                  value={node.padding}
                  tokens={tokens}
                  onSetSides={(side, v) =>
                    updateNodeSpacing(selectedId, { padding: { [side]: v } })
                  }
                  onSetToken={(key) =>
                    setNodeSpacingValue(
                      selectedId,
                      "padding",
                      key === "" ? toSides(node.padding, tokens) : makeSpacingTokenRef(key),
                    )
                  }
                />
              )}
              {!isRoot && (
                <SpacingControl
                  label="마진"
                  value={node.margin}
                  tokens={tokens}
                  onSetSides={(side, v) =>
                    updateNodeSpacing(selectedId, { margin: { [side]: v } })
                  }
                  onSetToken={(key) =>
                    setNodeSpacingValue(
                      selectedId,
                      "margin",
                      key === "" ? toSides(node.margin, tokens) : makeSpacingTokenRef(key),
                    )
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
        <ColorTokenManager
          tokens={tokens}
          onSet={setColorToken}
          onRemove={removeColorToken}
        />
        <FontTokenManager tokens={tokens} onSet={setFontToken} onRemove={removeFontToken} />
        <SpacingTokenManager
          tokens={tokens}
          onSet={setSpacingToken}
          onRemove={removeSpacingToken}
        />
      </div>
    </section>
  );
}
