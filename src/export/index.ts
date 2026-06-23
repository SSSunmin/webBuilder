import type { PageDocument } from "../types/page";
import { generateCodeMarkdown } from "./code";
import { generateContext } from "./legend";
import { generateSpec } from "./spec";

export type ExportMode = "spec" | "code" | "both";

export const EXPORT_MODE_LABELS: Record<ExportMode, string> = {
  spec: "명세만",
  code: "코드만",
  both: "둘 다",
};

/** Body markdown for a mode, without the portable context preamble. */
function modeBody(doc: PageDocument, mode: ExportMode): string {
  const spec = generateSpec(doc);
  const code = generateCodeMarkdown(doc);
  switch (mode) {
    case "spec":
      return spec;
    case "code":
      return code;
    case "both":
      return `${spec}\n---\n\n${code}`;
  }
}

/**
 * Build the markdown export for a document in the requested mode. Every mode is
 * prefixed with a portable, provider-neutral context (reading guide + component
 * legend) so the output is self-contained outside this codebase.
 */
export function generateMarkdown(doc: PageDocument, mode: ExportMode): string {
  return `${generateContext(doc)}\n---\n\n${modeBody(doc, mode)}`;
}

export { generateSpec } from "./spec";
export { generateCode, generateCodeMarkdown } from "./code";
export { generateContext } from "./legend";
