import type { PageDocument } from "../types/page";
import { generateCodeMarkdown } from "./code";
import { generateSpec } from "./spec";

export type ExportMode = "spec" | "code" | "both";

export const EXPORT_MODE_LABELS: Record<ExportMode, string> = {
  spec: "명세만",
  code: "코드만",
  both: "둘 다",
};

/** Build the markdown export for a document in the requested mode. */
export function generateMarkdown(doc: PageDocument, mode: ExportMode): string {
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

export { generateSpec } from "./spec";
export { generateCode, generateCodeMarkdown } from "./code";
