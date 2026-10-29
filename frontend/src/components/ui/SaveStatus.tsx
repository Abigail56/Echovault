import { CircleCheck, CircleDot } from "lucide-react";

/** Tells the user whether the form has unsaved edits. */
export function SaveStatus({ dirty, saving, existing }: { dirty: boolean; saving: boolean; existing: boolean }) {
  let content = null;
  if (saving) {
    content = (
      <>
        <span className="loading loading-spinner loading-xs" aria-hidden /> Saving…
      </>
    );
  } else if (dirty) {
    content = (
      <>
        <CircleDot className="text-warning size-3.5" aria-hidden /> Unsaved changes
      </>
    );
  } else if (existing) {
    content = (
      <>
        <CircleCheck className="text-success size-3.5" aria-hidden /> No unsaved changes
      </>
    );
  }
  return (
    <p className="text-meta flex items-center gap-1.5 sm:mr-auto" role="status" aria-live="polite">
      {content}
    </p>
  );
}
