/**
 * What files can be attached, checked in the browser for quick feedback.
 * The server checks again from the file's actual bytes (see backend/app/services/file_types.py).
 */
import { formatBytes } from "@/lib/format";

export const ACCEPTED_GROUPS = [
  { label: "PDF", extensions: ["pdf"] },
  { label: "Documents", extensions: ["doc", "docx", "txt", "md", "rtf"] },
  { label: "Spreadsheets", extensions: ["csv", "xls", "xlsx"] },
  { label: "Presentations", extensions: ["ppt", "pptx"] },
  { label: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] },
] as const;

export const ACCEPTED_EXTENSIONS: string[] = ACCEPTED_GROUPS.flatMap((g) => [...g.extensions]);
/** For <input type="file" accept>. */
export const ACCEPT = ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

/** Used until the server's real limits have loaded. */
export const DEFAULT_LIMITS = { maxFileBytes: 10_000_000, maxFiles: 20 };

export type FileFamily = "image" | "pdf" | "document" | "spreadsheet" | "presentation" | "text";

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function familyOf(name: string): FileFamily {
  const ext = extensionOf(name);
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["csv", "xls", "xlsx"].includes(ext)) return "spreadsheet";
  if (["ppt", "pptx"].includes(ext)) return "presentation";
  if (["doc", "docx", "rtf"].includes(ext)) return "document";
  return "text";
}

/** A reason the file can't be attached, or null if it looks fine. */
export function validateFile(file: File, maxFileBytes: number): string | null {
  if (!ACCEPTED_EXTENSIONS.includes(extensionOf(file.name))) {
    return "This file type isn't supported.";
  }
  if (file.size === 0) return "The file is empty.";
  if (file.size > maxFileBytes) return `Too large (${formatBytes(file.size)}). The limit is ${formatBytes(maxFileBytes)}.`;
  return null;
}

/** Identifies "the same file chosen twice": same name and same size. */
export function fileKey(file: File): string {
  return `${file.name.toLowerCase()}:${file.size}`;
}
