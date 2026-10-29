import { Download, FileSpreadsheet, FileText, FileType2, ImageIcon, Presentation, Paperclip, RotateCw, ScanText, Trash2, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/lib/api/client";
import { attachmentsApi } from "@/lib/api/services";
import type { Attachment, StorageUsage, UUID } from "@/lib/api/types";
import { ACCEPT, familyOf } from "@/lib/attachments";
import { formatBytes } from "@/lib/format";

import { ExtractionBadge } from "./ExtractionBadge";
import { TextViewer } from "./TextViewer";

/** The panel's hidden file input; the "Attach files" header button opens it. */
export const ATTACH_INPUT_ID = "attachment-file-input";

/** Space/Enter on a <label> doesn't open the picker by default; make it keyboard-friendly. */
export function openPickerOnKey(event: React.KeyboardEvent) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    document.getElementById(ATTACH_INPUT_ID)?.click();
  }
}

const POLL_MS = 2000;
const POLL_LIMIT = 90; // about three minutes
const STUCK_AFTER_MS = 2 * 60_000;

/** Failed, unavailable, or still "pending" long after upload (e.g. the server restarted). */
function canRetry(a: Attachment, now = Date.now()): boolean {
  if (a.extraction_status === "failed" || a.extraction_status === "unavailable") return true;
  return a.extraction_status === "pending" && now - new Date(a.created_at).getTime() > STUCK_AFTER_MS;
}

interface Uploading {
  key: number;
  name: string;
}

/** A readable name for a pasted screenshot, e.g. "screenshot-2026-10-29-1405.png". */
export function screenshotName(file: File, now = new Date()): string {
  if (file.name && file.name !== "image.png") return file.name;
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
  return `screenshot-${stamp}.${ext}`;
}

function KindIcon({ kind, filename }: { kind: Attachment["kind"]; filename: string }) {
  const family = familyOf(filename);
  const Icon =
    kind === "image" ? ImageIcon : kind === "pdf" ? FileType2 : family === "spreadsheet" ? FileSpreadsheet : family === "presentation" ? Presentation : FileText;
  return <Icon className="text-muted size-6" aria-hidden />;
}

interface AttachmentPanelProps {
  noteId: UUID;
  initial: Attachment[];
  /** Appends text to the note (used by "Add to note" in the text viewer). */
  onAddToNote: (text: string, filename: string) => Promise<void>;
}

export function AttachmentPanel({ noteId, initial, onAddToNote }: AttachmentPanelProps) {
  const toast = useToast();
  const [items, setItems] = useState<Attachment[]>(initial);
  const [uploading, setUploading] = useState<Uploading[]>([]);
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [dragging, setDragging] = useState(false);
  const [viewing, setViewing] = useState<Attachment | null>(null);
  const [deleting, setDeleting] = useState<Attachment | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const keyRef = useRef(0);

  const closeViewer = useCallback(() => setViewing(null), []);
  const refreshUsage = useCallback(() => {
    attachmentsApi.usage().then(setUsage, () => setUsage(null));
  }, []);
  useEffect(refreshUsage, [refreshUsage]);

  // While any file is still being read, check back every couple of seconds.
  const pending = items.some((a) => a.extraction_status === "pending");
  useEffect(() => {
    if (!pending) return;
    let polls = 0;
    const timer = window.setInterval(() => {
      polls += 1;
      if (polls > POLL_LIMIT) return window.clearInterval(timer);
      attachmentsApi.list(noteId).then(setItems, () => undefined);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [pending, noteId]);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const name = screenshotName(file);
        if (usage && file.size > usage.max_file_bytes) {
          toast.error(`${name} is too large. Files can be at most ${formatBytes(usage.max_file_bytes)}.`);
          continue;
        }
        const key = ++keyRef.current;
        setUploading((u) => [...u, { key, name }]);
        try {
          const created = await attachmentsApi.upload(noteId, file, name);
          setItems((current) => [...current, created]);
        } catch (error) {
          toast.error(`${name}: ${errorMessage(error)}`);
        } finally {
          setUploading((u) => u.filter((x) => x.key !== key));
        }
      }
      refreshUsage();
    },
    [noteId, refreshUsage, toast, usage],
  );

  // Ctrl+V / Cmd+V anywhere on the page attaches a copied screenshot.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (!files.length) return;
      event.preventDefault();
      void uploadFiles(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [uploadFiles]);

  const retry = async (a: Attachment) => {
    try {
      const updated = await attachmentsApi.retry(a.id);
      setItems((current) => current.map((x) => (x.id === a.id ? updated : x)));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyDelete(true);
    try {
      await attachmentsApi.remove(deleting.id);
      setItems((current) => current.filter((x) => x.id !== deleting.id));
      toast.success("Attachment deleted");
      refreshUsage();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyDelete(false);
      setDeleting(null);
    }
  };

  return (
    <section id="attachments" className="mt-6 scroll-mt-20" aria-labelledby="attachments-heading">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="attachments-heading" className="text-section flex items-center gap-2">
          <Paperclip className="size-4" aria-hidden /> Attachments
          {items.length > 0 && <span className="badge badge-ghost badge-sm">{items.length}</span>}
        </h2>
        {usage && (
          <p className="text-meta">
            {formatBytes(usage.used_bytes)} of {formatBytes(usage.quota_bytes)} used
          </p>
        )}
      </div>

      <div
        className={`surface border-2 border-dashed p-5 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-base-300"}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void uploadFiles(Array.from(e.dataTransfer.files));
        }}
        data-testid="attachment-dropzone"
      >
        <UploadCloud className="text-primary mx-auto size-8" aria-hidden />
        {/* A <label> opens the file picker natively: no script needed, so it works in every browser. */}
        <label
          htmlFor={ATTACH_INPUT_ID}
          role="button"
          tabIndex={0}
          onKeyDown={openPickerOnKey}
          className="btn btn-primary mt-3"
        >
          <Paperclip className="size-4" aria-hidden /> Choose files from your computer
        </label>
        <p className="text-muted mt-3 text-sm">
          or drag files here, or paste a screenshot with <kbd className="kbd kbd-sm">Ctrl</kbd>+<kbd className="kbd kbd-sm">V</kbd>
        </p>
        <p className="text-meta mt-1">
          Images, PDFs, Word, Excel, PowerPoint and text files{usage ? `, up to ${formatBytes(usage.max_file_bytes)} each` : ""}. Text inside them is
          extracted so you can search it and ask the assistant about it.
        </p>
        {usage && !usage.ocr_available && (
          <p className="text-warning mt-2 text-xs">
            Reading text from screenshots isn&apos;t set up on this server yet (Tesseract OCR isn&apos;t installed). Images are still
            saved, and you can retry once it&apos;s installed.
          </p>
        )}
        <input
          id={ATTACH_INPUT_ID}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          aria-label="Choose files to attach"
          onChange={(e) => {
            void uploadFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {(items.length > 0 || uploading.length > 0) && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
          {items.map((a) => (
            <li key={a.id} className="surface flex min-w-0 gap-3 p-3" data-testid="attachment-item">
              <a
                href={attachmentsApi.fileUrl(a.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-base-200 flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                aria-label={`Open ${a.filename}`}
              >
                {a.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- private, cookie-authenticated file
                  <img src={attachmentsApi.fileUrl(a.id)} alt="" className="size-full object-cover" loading="lazy" />
                ) : (
                  <KindIcon kind={a.kind} filename={a.filename} />
                )}
              </a>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={a.filename}>
                  {a.filename}
                </p>
                <p className="text-meta">{formatBytes(a.size_bytes)}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <ExtractionBadge status={a.extraction_status} chars={a.text_chars} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.text_chars > 0 && (
                    <button type="button" className="btn btn-xs btn-soft btn-primary" onClick={() => setViewing(a)}>
                      <ScanText className="size-3.5" aria-hidden /> View text
                    </button>
                  )}
                  {canRetry(a) && (
                    <button type="button" className="btn btn-xs btn-ghost" onClick={() => retry(a)}>
                      <RotateCw className="size-3.5" aria-hidden /> Retry
                    </button>
                  )}
                  <a className="btn btn-xs btn-ghost" href={attachmentsApi.fileUrl(a.id, true)} aria-label={`Download ${a.filename}`}>
                    <Download className="size-3.5" aria-hidden />
                  </a>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost text-error"
                    onClick={() => setDeleting(a)}
                    aria-label={`Delete ${a.filename}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {uploading.map((u) => (
            <li key={`up-${u.key}`} className="surface flex items-center gap-3 p-3 text-sm">
              <span className="loading loading-spinner loading-sm text-primary" aria-hidden />
              <span className="truncate">Uploading {u.name}…</span>
            </li>
          ))}
        </ul>
      )}

      <TextViewer attachment={viewing} onClose={closeViewer} onAddToNote={onAddToNote} />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this attachment?"
        description={`"${deleting?.filename ?? ""}" and the text read from it will be permanently deleted. Text you already added to the note stays.`}
        busy={busyDelete}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
