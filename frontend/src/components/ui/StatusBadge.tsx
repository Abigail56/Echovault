import { Archive, CheckCircle2, CirclePause, CirclePlay } from "lucide-react";

import type { ProjectStatus } from "@/lib/api/types";

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const STYLES: Record<ProjectStatus, { className: string; Icon: typeof Archive }> = {
  active: { className: "badge-primary badge-soft", Icon: CirclePlay },
  on_hold: { className: "badge-warning badge-soft", Icon: CirclePause },
  completed: { className: "badge-success badge-soft", Icon: CheckCircle2 },
  archived: { className: "badge-ghost", Icon: Archive },
};

/** Status is shown with an icon and text, never colour alone. */
export function StatusBadge({ status }: { status: ProjectStatus }) {
  const { className, Icon } = STYLES[status];
  const label = PROJECT_STATUSES.find((s) => s.value === status)?.label ?? status;
  return (
    <span className={`badge badge-sm gap-1 whitespace-nowrap ${className}`}>
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}
