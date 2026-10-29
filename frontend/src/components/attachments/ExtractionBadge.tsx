import type { ExtractionStatus } from "@/lib/api/types";

/** Tells the user honestly whether text was read from a file. */
export function ExtractionBadge({ status, chars }: { status: ExtractionStatus; chars: number }) {
  if (status === "pending") {
    return (
      <span className="badge badge-soft badge-info badge-sm gap-1">
        <span className="loading loading-spinner loading-xs" aria-hidden /> Reading text…
      </span>
    );
  }
  if (status === "done") {
    return chars > 0 ? (
      <span className="badge badge-soft badge-success badge-sm">Text extracted</span>
    ) : (
      <span className="badge badge-ghost badge-sm">No text found</span>
    );
  }
  if (status === "unsupported") return <span className="badge badge-ghost badge-sm">Stored (text not read)</span>;
  if (status === "unavailable") return <span className="badge badge-soft badge-warning badge-sm">OCR not installed</span>;
  return <span className="badge badge-soft badge-error badge-sm">Couldn&apos;t read text</span>;
}
