import { CheckCircle2, CircleDashed, CircleDot, History } from "lucide-react";

import type { DecisionStatus } from "@/lib/api/types";

export const DECISION_STATUSES: { value: DecisionStatus; label: string; hint: string }[] = [
  { value: "proposed", label: "Proposed", hint: "Being considered; not decided yet" },
  { value: "accepted", label: "Accepted", hint: "Decided and in effect" },
  { value: "superseded", label: "Superseded", hint: "Replaced by a later decision" },
  { value: "reviewed", label: "Reviewed", hint: "Outcome checked against expectations" },
];

const STYLES: Record<DecisionStatus, { className: string; Icon: typeof History }> = {
  proposed: { className: "badge-warning badge-soft", Icon: CircleDashed },
  accepted: { className: "badge-primary badge-soft", Icon: CircleDot },
  superseded: { className: "badge-ghost", Icon: History },
  reviewed: { className: "badge-success badge-soft", Icon: CheckCircle2 },
};

/** Status is shown with an icon and text, never colour alone. */
export function DecisionStatusBadge({ status }: { status: DecisionStatus }) {
  const { className, Icon } = STYLES[status];
  const label = DECISION_STATUSES.find((s) => s.value === status)?.label ?? status;
  return (
    <span className={`badge badge-sm gap-1 whitespace-nowrap ${className}`}>
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}
