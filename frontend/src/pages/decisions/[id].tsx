import { CheckCircle2, FolderKanban, PencilLine, Target, Trash2 } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { type ReactNode, useState } from "react";

import { DecisionForm } from "@/components/decisions/DecisionForm";
import { DECISION_STATUSES, DecisionStatusBadge } from "@/components/decisions/DecisionStatusBadge";
import { appLayout } from "@/components/layout/AppShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { DetailSkeleton, ErrorState } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/lib/api/client";
import { decisionsApi } from "@/lib/api/services";
import type { DecisionStatus } from "@/lib/api/types";
import { formatDate, formatDateTime, queryParam } from "@/lib/format";
import type { PageWithLayout } from "@/lib/layout";

function Block({ title, text, empty = "Not recorded", children }: { title: string; text: string; empty?: ReactNode; children?: ReactNode }) {
  return (
    <section className="min-w-0" aria-label={title}>
      <h2 className="text-meta mb-1.5 font-medium tracking-wide uppercase">{title}</h2>
      {text.trim() ? <p className="text-[0.9375rem] break-words whitespace-pre-line">{text}</p> : <p className="text-muted text-sm italic">{empty}</p>}
      {children}
    </section>
  );
}

const DecisionDetailPage: PageWithLayout = () => {
  const router = useRouter();
  const toast = useToast();
  const id = queryParam(router.query.id);
  const editing = router.query.edit === "1";
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const decision = useAsync(() => decisionsApi.get(id), [id], router.isReady && Boolean(id));

  const setEditing = (on: boolean) =>
    void router.replace({ pathname: router.pathname, query: on ? { id, edit: "1" } : { id } }, undefined, { shallow: true });

  const changeStatus = async (status: DecisionStatus) => {
    setStatusSaving(true);
    try {
      decision.setData(await decisionsApi.update(id, { status }));
      toast.success("Status updated");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setStatusSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await decisionsApi.remove(id);
      toast.success("Decision deleted");
      await router.push("/decisions");
    } catch (error) {
      toast.error(errorMessage(error));
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (decision.error) return <ErrorState error={decision.error} onRetry={decision.reload} />;
  if (!decision.data) return <DetailSkeleton />;
  const d = decision.data;

  return (
    <>
      <Head>
        <title>{d.title} · EchoVault Nexus</title>
      </Head>
      <PageHeader
        title={editing ? "Edit decision" : d.title}
        breadcrumbs={[{ label: "Decisions", href: "/decisions" }, { label: d.title }]}
        description={
          !editing && (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <DecisionStatusBadge status={d.status} />
              <span>Recorded {formatDate(d.created_at)}</span>
              {d.reviewed_at && <span title={formatDateTime(d.reviewed_at)}>Last reviewed {formatDate(d.reviewed_at)}</span>}
              {d.project && (
                <Link href={`/projects/${d.project.id}`} className="link link-hover flex items-center gap-1">
                  <FolderKanban className="size-3.5" aria-hidden /> {d.project.name}
                </Link>
              )}
            </span>
          )
        }
        actions={
          !editing && (
            <>
              <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>
                <PencilLine className="size-4" aria-hidden /> Edit
              </button>
              <button type="button" className="btn btn-sm btn-ghost text-error" onClick={() => setConfirming(true)}>
                <Trash2 className="size-4" aria-hidden /> Delete
              </button>
            </>
          )
        }
      />

      {editing ? (
        <div className="surface max-w-3xl p-5 sm:p-6">
          <DecisionForm
            submitLabel="Save changes"
            initial={{
              title: d.title,
              context: d.context,
              problem: d.problem,
              decision: d.decision,
              reasoning: d.reasoning,
              alternatives: d.alternatives,
              expected_outcome: d.expected_outcome,
              actual_outcome: d.actual_outcome,
              status: d.status,
              project_id: d.project?.id ?? null,
            }}
            onCancel={() => setEditing(false)}
            onSubmit={async (values) => {
              decision.setData(await decisionsApi.update(id, values));
              toast.success("Decision updated");
              setEditing(false);
            }}
          />
        </div>
      ) : (
        <div className="grid max-w-5xl gap-5">
          {/* The choice and the reason for it come first. */}
          <section className="border-primary/40 bg-primary/5 rounded-box border p-5 sm:p-6" aria-label="Selected option">
            <p className="eyebrow mb-2 flex items-center gap-1.5">
              <Target className="size-3.5" aria-hidden /> Selected option
            </p>
            {d.decision.trim() ? (
              <p className="text-lg leading-snug font-semibold break-words whitespace-pre-line">{d.decision}</p>
            ) : (
              <p className="text-muted italic">Not recorded yet</p>
            )}
            <div className="border-primary/20 mt-4 border-t pt-4">
              <Block title="Reasoning" text={d.reasoning} />
            </div>
          </section>

          <div className="surface grid gap-6 p-5 sm:p-6 md:grid-cols-2">
            <Block title="Context" text={d.context} />
            <Block title="Problem statement" text={d.problem} />
          </div>

          <div className="surface p-5 sm:p-6">
            <Block title="Alternatives considered" text={d.alternatives} empty="No alternatives recorded" />
          </div>

          <section className="surface grid md:grid-cols-2" aria-label="Expected vs actual outcome">
            <div className="border-base-300 p-5 sm:p-6 md:border-r">
              <Block title="Expected outcome" text={d.expected_outcome} />
            </div>
            <div className="border-base-300 border-t p-5 sm:p-6 md:border-t-0">
              <Block
                title="Actual outcome / review"
                text={d.actual_outcome}
                empty={
                  <>
                    Not reviewed yet.{" "}
                    <button type="button" className="link link-primary not-italic" onClick={() => setEditing(true)}>
                      Add review notes
                    </button>
                  </>
                }
              />
            </div>
          </section>

          <section className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between" aria-label="Status">
            <div>
              <h2 className="text-section">Status</h2>
              <p className="text-meta">{DECISION_STATUSES.find((s) => s.value === d.status)?.hint}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="decision-status" className="sr-only">
                Change status
              </label>
              <select
                id="decision-status"
                className="select select-sm w-40"
                value={d.status}
                disabled={statusSaving}
                onChange={(e) => changeStatus(e.target.value as DecisionStatus)}
              >
                {DECISION_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              {d.status !== "reviewed" && (
                <button type="button" className="btn btn-sm btn-outline border-base-300" onClick={() => changeStatus("reviewed")} disabled={statusSaving}>
                  <CheckCircle2 className="size-4" aria-hidden /> Mark reviewed
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title="Delete this decision?"
        description={`"${d.title}" and its reasoning will be permanently deleted.`}
        busy={deleting}
        onCancel={() => setConfirming(false)}
        onConfirm={remove}
      />
    </>
  );
};

DecisionDetailPage.getLayout = appLayout;
export default DecisionDetailPage;
