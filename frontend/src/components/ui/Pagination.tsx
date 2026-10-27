import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
}

export function Pagination({ total, limit, offset, onChange }: PaginationProps) {
  if (total <= limit) return null;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(total / limit);
  const from = offset + 1;
  const to = Math.min(offset + limit, total);

  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-meta">
        Showing {from}–{to} of {total}
      </p>
      <div className="join">
        <button
          type="button"
          className="btn btn-sm join-item"
          onClick={() => onChange(Math.max(0, offset - limit))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span className="btn btn-sm join-item pointer-events-none" aria-current="page">
          Page {page} of {pages}
        </span>
        <button
          type="button"
          className="btn btn-sm join-item"
          onClick={() => onChange(offset + limit)}
          disabled={page >= pages}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
