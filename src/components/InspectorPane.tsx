import type { ReactNode } from "react";
import { getComponentDef } from "../registry";
import { useEditorStore } from "../store/editorStore";
import type { PropSchema } from "../types/component";

const inputCls =
  "h-9 w-full rounded-button border border-line px-2 text-sm focus:border-brand focus:outline-none";

function Field({
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
            className="h-9 w-10 rounded-button border border-line"
            value={typeof value === "string" && value ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            type="text"
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

export function InspectorPane() {
  const selectedId = useEditorStore((s) => s.selectedId);
  const node = useEditorStore((s) =>
    s.selectedId ? s.document?.nodes[s.selectedId] : undefined,
  );
  const updateNodeProps = useEditorStore((s) => s.updateNodeProps);

  const def = node ? getComponentDef(node.type) : undefined;

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-card border border-line bg-white shadow-card">
      <h2 className="border-b border-line px-4 py-2 text-sm font-semibold">
        속성{def ? ` · ${def.label}` : ""}
      </h2>
      <div className="flex-1 overflow-auto p-4">
        {!node || !def ? (
          <p className="text-sm text-muted">
            캔버스나 레이어에서 컴포넌트를 선택하세요.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {def.props.map((schema) => (
              <Field
                key={schema.key}
                schema={schema}
                value={node.props[schema.key]}
                onChange={(v) => updateNodeProps(selectedId!, { [schema.key]: v })}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
