import { findParentChild, sameParent, useEditorStore } from "../store/editorStore";
import type { AlignMode } from "../store/editorStore";

const ALIGN: { mode: AlignMode; label: string; title: string }[] = [
  { mode: "left", label: "⊣", title: "왼쪽 정렬" },
  { mode: "hcenter", label: "≡", title: "가로 가운데" },
  { mode: "right", label: "⊢", title: "오른쪽 정렬" },
  { mode: "top", label: "⊤", title: "위 정렬" },
  { mode: "vcenter", label: "≣", title: "세로 가운데" },
  { mode: "bottom", label: "⊥", title: "아래 정렬" },
];

const btn =
  "flex h-7 w-7 items-center justify-center rounded-chip border border-line bg-white text-sm text-ink2 hover:bg-brand-pale hover:text-brand disabled:opacity-40";

export function AlignToolbar() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const nodes = useEditorStore((s) => s.document?.nodes);
  const alignNodes = useEditorStore((s) => s.alignNodes);
  const distributeNodes = useEditorStore((s) => s.distributeNodes);
  const centerInParent = useEditorStore((s) => s.centerInParent);

  if (selectedIds.length < 2) return null;

  // When a parent and its direct children are selected together, the sibling
  // align/distribute tools don't apply (different coordinate planes); offer
  // "center within parent" instead.
  const parentChild = nodes ? findParentChild(nodes, selectedIds) : null;
  if (parentChild) {
    return (
      <div className="flex items-center gap-1">
        <span className="mr-1 text-xs text-muted">
          부모 기준 ({parentChild.childIds.length})
        </span>
        <button title="부모 기준 가로 가운데" onClick={() => centerInParent(selectedIds, "h")} className={btn}>
          ⤢
        </button>
        <button title="부모 기준 세로 가운데" onClick={() => centerInParent(selectedIds, "v")} className={btn}>
          ⤡
        </button>
      </div>
    );
  }

  // Align/distribute only make sense among siblings (one coordinate plane).
  const canAlign = nodes ? sameParent(nodes, selectedIds) : false;
  const canDistribute = canAlign && selectedIds.length >= 3;

  return (
    <div className="flex items-center gap-1">
      <span className="mr-1 text-xs text-muted">{selectedIds.length}개 선택</span>
      {ALIGN.map((a) => (
        <button
          key={a.mode}
          title={a.title}
          disabled={!canAlign}
          onClick={() => alignNodes(selectedIds, a.mode)}
          className={btn}
        >
          {a.label}
        </button>
      ))}
      <span className="mx-1 h-5 w-px bg-line" />
      <button
        title="가로 등간격"
        disabled={!canDistribute}
        onClick={() => distributeNodes(selectedIds, "h")}
        className={btn}
      >
        ↔
      </button>
      <button
        title="세로 등간격"
        disabled={!canDistribute}
        onClick={() => distributeNodes(selectedIds, "v")}
        className={btn}
      >
        ↕
      </button>
    </div>
  );
}
