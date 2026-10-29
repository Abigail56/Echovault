import { FolderKanban } from "lucide-react";
import Link from "next/link";

import { DecisionStatusBadge } from "@/components/decisions/DecisionStatusBadge";
import type { DecisionSummary } from "@/lib/api/types";
import { formatDate, formatDateTime } from "@/lib/format";

export function DecisionCard({ decision }: { decision: DecisionSummary }) {
  return (
    <article className="surface lift hover:border-primary/40 group relative min-w-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-section min-w-0 break-words">
          <Link href={`/decisions/${decision.id}`} className="after:absolute after:inset-0 focus-visible:outline-none group-hover:text-primary">
            {decision.title}
          </Link>
        </h3>
        <DecisionStatusBadge status={decision.status} />
      </div>
      {decision.excerpt && <p className="text-muted mt-1.5 line-clamp-2 text-sm [overflow-wrap:anywhere]">{decision.excerpt}</p>}
      <div className="text-meta mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <time dateTime={decision.created_at} title={formatDateTime(decision.created_at)}>
          Recorded {formatDate(decision.created_at)}
        </time>
        {decision.reviewed_at && (
          <time dateTime={decision.reviewed_at} title={formatDateTime(decision.reviewed_at)}>
            Last reviewed {formatDate(decision.reviewed_at)}
          </time>
        )}
        {decision.project && (
          <span className="flex min-w-0 items-center gap-1">
            <FolderKanban className="size-3.5 shrink-0" aria-hidden />
            <span className="max-w-[12rem] truncate">{decision.project.name}</span>
          </span>
        )}
      </div>
    </article>
  );
}
