import { FolderKanban } from "lucide-react";
import Link from "next/link";

import type { KnowledgeSummary } from "@/lib/api/types";
import { formatDateTime, timeAgo } from "@/lib/format";

export function KnowledgeCard({ item }: { item: KnowledgeSummary }) {
  return (
    <article className="surface lift hover:border-primary/40 group relative p-5">
      <h3 className="text-section break-words">
        <Link href={`/vault/${item.id}`} className="after:absolute after:inset-0 focus-visible:outline-none group-hover:text-primary">
          {item.title}
        </Link>
      </h3>
      {item.excerpt ? (
        <p className="text-muted mt-1.5 line-clamp-2 text-sm break-words">{item.excerpt}</p>
      ) : (
        <p className="text-muted mt-1.5 text-sm italic">No content yet</p>
      )}
      <div className="text-meta mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <time dateTime={item.updated_at} title={formatDateTime(item.updated_at)}>
          Updated {timeAgo(item.updated_at)}
        </time>
        {item.project && (
          <span className="flex min-w-0 items-center gap-1">
            <FolderKanban className="size-3.5 shrink-0" aria-hidden />
            <span className="max-w-[12rem] truncate">{item.project.name}</span>
          </span>
        )}
        {item.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1" aria-label="Tags">
            {item.tags.slice(0, 5).map((tag) => (
              <li key={tag} className="badge badge-ghost badge-sm">
                {tag}
              </li>
            ))}
            {item.tags.length > 5 && <li className="badge badge-ghost badge-sm">+{item.tags.length - 5}</li>}
          </ul>
        )}
      </div>
    </article>
  );
}
