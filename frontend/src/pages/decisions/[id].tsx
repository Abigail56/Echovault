import { FolderKanban, PencilLine, Trash2 } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import { DECISION_SECTIONS, DecisionForm } from "@/components/decisions/DecisionForm";
import { appLayout } from "@/components/layout/AppShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { DetailSkeleton, ErrorState } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/lib/api/client";
import { decisionsApi } from "@/lib/api/services";
import { formatDateTime, queryParam } from "@/lib/format";
import type { PageWithLayout } from "@/lib/layout";

const DecisionDetailPage: PageWithLayout = () => {
  const router = useRouter();
  const toast = useToast();
  const id = queryParam(router.query.id);
  const editing = router.query.edit === "1";
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const decision = useAsync(() => decisionsApi.get(id), [id], router.isReady && Boolean(id));

  const setEditing = (on: boolean) =>
    void router.replace({ pathname: router.pathname, query: on ? { id, edit: "1" } : { id } }, undefined, { shallow: true });

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
        breadcrumbs={[{ label: "Decision Journal", href: "/decisions" }, { label: d.title }]}
        description={
          !editing && (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Recorded {formatDateTime(d.created_at)}</span>
              {d.updated_at !== d.created_at && <span>Updated {formatDateTime(d.updated_at)}</span>}
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
              decision: d.decision,
              reasoning: d.reasoning,
              alternatives: d.alternatives,
              expected_outcome: d.expected_outcome,
              actual_outcome: d.actual_outcome,
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
        <div className="surface divide-base-300 max-w-3xl divide-y">
          {DECISION_SECTIONS.map((section) => {
            const text = d[section.name];
            const isOutcome = section.name === "actual_outcome";
            return (
              <section key={section.name} className="p-5 sm:px-6" aria-labelledby={`sec-${section.name}`}>
                <h2 id={`sec-${section.name}`} className="text-meta mb-1.5 font-medium tracking-wide uppercase">
                  {section.label}
                </h2>
                {text.trim() ? (
                  <p className="text-sm break-words whitespace-pre-line">{text}</p>
                ) : isOutcome ? (
                  <p className="text-muted text-sm">
                    Not reviewed yet.{" "}
                    <button type="button" className="link link-primary" onClick={() => setEditing(true)}>
                      Add review notes
                    </button>
                  </p>
                ) : (
                  <p className="text-muted text-sm italic">Not recorded</p>
                )}
              </section>
            );
          })}
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
