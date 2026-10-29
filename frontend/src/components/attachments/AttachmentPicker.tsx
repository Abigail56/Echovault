import {
  AlertCircle,
  CheckCircle2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  Presentation,
  UploadCloud,
  X,
} from "lucide-react";
import { useId, useState } from "react";

import { ACCEPT, ACCEPTED_GROUPS, extensionOf, type FileFamily, familyOf } from "@/lib/attachments";
import { formatBytes } from "@/lib/format";

export type StagedStatus = "ready" | "uploading" | "uploaded" | "failed";

/** A file chosen in the browser. It isn't on the server until its status is "uploaded". */
export interface StagedFile {
  key: string;
  file: File;
  status: StagedStatus;
  progress: number;
  error?: string;
  /** Object URL for image thumbnails (revoked when the file is removed). */
  previewUrl?: string;
}

export interface Rejection {
  name: string;
  reason: string;
}

const FAMILY_ICONS: Record<FileFamily, typeof FileText> = {
  image: FileImage,
  pdf: FileType2,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  text: FileText,
};

function StatusLine({ item }: { item: StagedFile }) {
  if (item.status === "uploading") {
    const percent = Math.round(item.progress * 100);
    return (
      <div className="mt-1.5 flex items-center gap-2">
        <progress className="progress progress-primary h-1.5 w-full" value={percent} max={100} aria-label={`Uploading ${item.file.name}`} />
        <span className="text-meta w-9 shrink-0 text-right tabular-nums">{percent}%</span>
      </div>
    );
  }
  if (item.status === "uploaded") {
    return (
      <p className="text-success mt-1 flex items-center gap-1 text-xs">
        <CheckCircle2 className="size-3.5" aria-hidden /> Uploaded
      </p>
    );
  }
  if (item.status === "failed") {
    return (
      <p className="text-error mt-1 flex items-start gap-1 text-xs break-words">
        <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden /> {item.error ?? "Upload failed"}
      </p>
    );
  }
  return <p className="text-meta mt-1 text-xs">Ready. Uploads when you save.</p>;
}

interface AttachmentPickerProps {
  files: StagedFile[];
  rejections: Rejection[];
  maxFileBytes: number;
  maxFiles: number;
  /** True while saving: the list can't be changed. */
  locked: boolean;
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
  onDismissRejections: () => void;
}

export function AttachmentPicker({
  files,
  rejections,
  maxFileBytes,
  maxFiles,
  locked,
  onAdd,
  onRemove,
  onDismissRejections,
}: AttachmentPickerProps) {
  const [dragging, setDragging] = useState(false);
  const inputId = useId();
  const headingId = useId();
  const hintId = useId();

  const takeFiles = (list: FileList | null) => {
    const chosen = Array.from(list ?? []);
    if (chosen.length && !locked) onAdd(chosen);
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div>
        <h2 id={headingId} className="text-sm font-medium">
          Attachments <span className="text-muted font-normal">(optional)</span>
        </h2>
        <p className="text-muted text-sm">Add documents, images, or other files to this knowledge item.</p>
      </div>

      <div
        className={`rounded-box flex flex-col items-center border-2 border-dashed px-4 py-8 text-center transition-colors duration-200 motion-reduce:transition-none sm:py-10 ${
          dragging ? "border-primary bg-primary/10" : "border-base-300 bg-sunken/60 hover:border-primary/50"
        } ${locked ? "pointer-events-none opacity-60" : ""}`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = locked ? "none" : "copy";
        }}
        onDragLeave={(e) => {
          // Ignore leaving into a child element of the drop area.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          takeFiles(e.dataTransfer.files);
        }}
        data-testid="attachment-picker"
      >
        <span className={`grid size-12 place-items-center rounded-full transition-colors ${dragging ? "bg-primary text-primary-content" : "bg-primary/12 text-primary"}`}>
          <UploadCloud className="size-6" aria-hidden />
        </span>
        <p className="mt-3 font-medium">{dragging ? "Drop to add these files" : "Drag and drop files here"}</p>
        <p className="text-muted text-sm">or browse your computer</p>
        {/* A <label> opens the native file picker directly, which works in every browser. */}
        <label
          htmlFor={inputId}
          role="button"
          tabIndex={locked ? -1 : 0}
          aria-describedby={hintId}
          aria-disabled={locked || undefined}
          className="btn btn-primary mt-4 min-h-11 w-full max-w-xs sm:w-auto"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById(inputId)?.click();
            }
          }}
        >
          Choose Files
        </label>
        <input
          id={inputId}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          disabled={locked}
          aria-label="Choose files to attach to this note"
          onChange={(e) => {
            takeFiles(e.target.files);
            e.target.value = ""; // allow choosing the same file again after removing it
          }}
        />
        <p id={hintId} className="text-meta mt-4 max-w-xl text-xs leading-relaxed">
          {ACCEPTED_GROUPS.map((g) => `${g.label} (${g.extensions.map((x) => `.${x}`).join(", ")})`).join(" · ")}
          <br />
          Up to {formatBytes(maxFileBytes)} per file, {maxFiles} files per note. Text inside them becomes searchable.
        </p>
      </div>

      {rejections.length > 0 && (
        <div role="alert" className="alert alert-soft alert-error items-start text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{rejections.length === 1 ? "1 file wasn't added" : `${rejections.length} files weren't added`}</p>
            <ul className="mt-1 space-y-0.5">
              {rejections.map((r) => (
                <li key={`${r.name}-${r.reason}`} className="break-words">
                  <span className="font-medium">{r.name}</span>: {r.reason}
                </li>
              ))}
            </ul>
          </div>
          <button type="button" className="btn btn-ghost btn-xs btn-square" onClick={onDismissRejections} aria-label="Dismiss these messages">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2" aria-label="Files to attach" data-testid="staged-files">
          {files.map((item) => {
            const family = familyOf(item.file.name);
            const Icon = FAMILY_ICONS[family];
            const ext = extensionOf(item.file.name).toUpperCase() || "FILE";
            return (
              <li
                key={item.key}
                className={`surface flex min-w-0 items-center gap-3 p-3 ${item.status === "failed" ? "border-error/60" : ""}`}
                data-testid="staged-file"
              >
                <span className="bg-base-200 grid size-12 shrink-0 place-items-center overflow-hidden rounded-field">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local preview of a file the user picked
                    <img src={item.previewUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <Icon className="text-primary size-6" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={item.file.name}>
                    {item.file.name}
                  </p>
                  <p className="text-meta text-xs">
                    {ext} · {formatBytes(item.file.size)}
                  </p>
                  <StatusLine item={item} />
                </div>
                {item.status !== "uploaded" && item.status !== "uploading" && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square shrink-0"
                    onClick={() => onRemove(item.key)}
                    disabled={locked}
                    aria-label={`Remove ${item.file.name}`}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
