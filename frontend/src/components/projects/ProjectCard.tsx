import { BookOpen, Scale } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Project } from "@/lib/api/types";
import { formatDateTime, plural, timeAgo } from "@/lib/format";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="surface lift hover:border-primary/40 group relative flex min-w-0 flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-section min-w-0 break-words">
          <Link href={`/projects/${project.id}`} className="after:absolute after:inset-0 focus-visible:outline-none group-hover:text-primary">
            {project.name}
          </Link>
        </h3>
        <StatusBadge status={project.status} />
      </div>
      <p className="text-muted mt-1.5 line-clamp-2 flex-1 text-sm break-words">
        {project.description || <span className="italic">No description</span>}
      </p>
      <div className="text-meta mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1">
          <BookOpen className="size-3.5" aria-hidden /> {plural(project.knowledge_count, "note")}
        </span>
        <span className="flex items-center gap-1">
          <Scale className="size-3.5" aria-hidden /> {plural(project.decision_count, "decision")}
        </span>
        <time dateTime={project.updated_at} title={formatDateTime(project.updated_at)} className="ml-auto">
          {timeAgo(project.updated_at)}
        </time>
      </div>
    </article>
  );
}
