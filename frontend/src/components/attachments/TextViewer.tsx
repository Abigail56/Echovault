import { Copy, FilePlus2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/lib/api/client";
import { attachmentsApi } from "@/lib/api/services";
import type { Attachment } from "@/lib/api/types";

interface TextViewerProps {
  attachment: Attachment | null;
  onClose: () => void;
  onAddToNote: (text: string, filename: string) => Promise<void>;
}

/** Shows the text read from a file, with Copy and "Add to note". */
export function TextViewer({ attachment, onClose, onAddToNote }: TextViewerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const toast = useToast();
  const [loaded, setLoaded] = useState<{ id: string; text: string } | null>(null);
  const text = attachment && loaded?.id === attachment.id ? loaded.text : null;
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (attachment && !dialog.open) dialog.showModal();
    if (!attachment && dialog.open) dialog.close();
    if (!attachment) return;
    let cancelled = false;
    attachmentsApi.get(attachment.id).then(
      (detail) => !cancelled && setLoaded({ id: detail.id, text: detail.extracted_text }),
      (error) => !cancelled && (toast.error(errorMessage(error)), onClose()),
    );
    return () => {
      cancelled = true;
    };
  }, [attachment, onClose, toast]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text ?? "");
      toast.success("Text copied");
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  };

  const add = async () => {
    if (!attachment || !text) return;
    setAdding(true);
    try {
      await onAddToNote(text, attachment.filename);
      onClose();
    } finally {
      setAdding(false);
    }
  };

  return (
    <dialog
      ref={ref}
      className="modal modal-bottom sm:modal-middle"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-box flex max-h-[85vh] max-w-3xl flex-col">
        <h2 id={titleId} className="text-section truncate">
          Text from {attachment?.filename}
        </h2>
        <p className="text-meta mt-1">
          Read automatically{attachment?.kind === "image" ? " with OCR, so check it for mistakes" : ""}. It&apos;s already searchable.
        </p>
        <div className="bg-base-200 mt-3 min-h-24 flex-1 overflow-auto rounded-lg p-3">
          {text === null ? (
            <span className="loading loading-dots loading-sm" aria-label="Loading text" />
          ) : (
            <pre className="text-sm break-words whitespace-pre-wrap" data-testid="extracted-text">
              {text}
            </pre>
          )}
        </div>
        <div className="modal-action flex-wrap">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn" onClick={copy} disabled={!text}>
            <Copy className="size-4" aria-hidden /> Copy
          </button>
          <button type="button" className="btn btn-primary" onClick={add} disabled={!text || adding}>
            {adding ? <span className="loading loading-spinner loading-xs" aria-hidden /> : <FilePlus2 className="size-4" aria-hidden />}
            Add to note
          </button>
        </div>
      </div>
      <button type="button" className="modal-backdrop" onClick={onClose} aria-label="Close dialog" tabIndex={-1}>
        close
      </button>
    </dialog>
  );
}
