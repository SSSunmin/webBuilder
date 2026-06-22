/** Turn a project name into a safe file stem (keeps Hangul, collapses spaces). */
export function slugify(name: string): string {
  return name.trim().replace(/\s+/g, "-").replace(/[^\w가-힣-]/g, "") || "page";
}

/** Trigger a browser download of in-memory text content. Lives in its own
 * module so it always reaches the real DOM `document` (some callers shadow the
 * name with the editor's PageDocument). */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Some browsers (Firefox) ignore .click() on a detached anchor; revoking the
  // URL synchronously can also abort the still-pending download (Firefox/Safari).
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
