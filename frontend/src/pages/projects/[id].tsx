import { BookOpen, PencilLine, Plus, Scale, Trash2 } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import { DecisionCard } from "@/components/decisions/DecisionCard";
import { KnowledgeCard } from "@/components/knowledge/KnowledgeCard";
import { appLayout } from "@/components/layout/AppShell";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { DetailSkeleton, ErrorState, ListSkeleton } from "@/components/ui/States";
import { PROJECT_STATUSES, StatusBadge } from "@/components/ui/StatusBadge";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/lib/api/client";
import { decisionsApi, knowledgeApi, projectsApi } from "@/lib/api/services";
import type { ProjectStatus } from "@/lib/api/types";
import { formatDate, queryParam } from "@/lib/format";
import type { PageWithLayout } from "@/lib/layout";

const ProjectDetailPage: PageWithLayout = () => {
  const router = useRouter();
  const toast = useToast();
  const id = queryParam(router.query.id);
  const editing = router.query.edit === "1";
  const ready = router.isReady && Boolean(id);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const project = useAsync(() => projectsApi.get(id), [id], ready);
  const knowledge = useAsync((s) => knowledgeApi.list({ project_id: id, limit: 10 }, s), [id], ready);
  const decisions = useAsync((s) => decisionsApi.list({ project_id: id, limit: 10 }, s), [id], ready);

  const setEditing = (on: boolean) =>
    void router.replace({ pathname: router.pathname, query: on ? { id, edit: "1" } : { id } }, undefined, { shallow: true });

  const changeStatus = async (status: ProjectStatus) => {
    setStatusSaving(true);
    try {
      project.setData(await projectsApi.update(id, { status }));
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
      await projectsApi.remove(id);
      toast.success("Project deleted. Its notes and decisions were kept.");
      await router.push("/projects");
    } catch (error) {
      toast.error(errorMessage(error));
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (project.error) return <ErrorState error={project.error} onRetry={project.reload} />;
  if (!project.data) return <DetailSkeleton />;
  const p = project.data;

  return (
    <>
      <Head>
        <title>{p.name} · EchoVault Nexus</title>
      </Head>
      <PageHeader
        title={editing ? "Edit project" : p.name}
        breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: p.name }]}
        description={!editing && <>Created {formatDate(p.created_at)} · Updated {formatDate(p.updated_at)}</>}
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
        <div className="max-w-2xl">
          <ProjectForm
            submitLabel="Save changes"
            initial={{ name: p.name, description: p.description, status: p.status }}
            onCancel={() => setEditing(false)}
            onSubmit={async (values) => {
              project.setData(await projectsApi.update(id, values));
              toast.success("Project updated");
              setEditing(false);
            }}
          />
        </div>
      ) : (
        <>
          <section className="surface mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-3xl text-sm break-words whitespace-pre-line">
              {p.description || <span className="text-muted italic">No description yet.</span>}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={p.status} />
              <label className="sr-only" htmlFor="project-status">
                Change status
              </label>
              <select
                id="project-status"
                className="select select-sm w-36"
                value={p.status}
                disabled={statusSaving}
                onChange={(e) => changeStatus(e.target.value as ProjectStatus)}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section aria-labelledby="project-knowledge">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="project-knowledge" className="text-section flex items-center gap-2">
                  <BookOpen className="text-primary size-4" aria-hidden /> Knowledge ({p.knowledge_count})
                </h2>
                <Link href={{ pathname: "/vault/new", query: { project: p.id } }} className="btn btn-ghost btn-xs">
                  <Plus className="size-3.5" aria-hidden /> Add
                </Link>
              </div>
              {knowledge.error ? (
                <ErrorState error={knowledge.error} onRetry={knowledge.reload} />
              ) : knowledge.loading ? (
                <ListSkeleton rows={2} />
              ) : knowledge.data?.items.length ? (
                <div className="stagger grid gap-3">
                  {knowledge.data.items.map((k) => <KnowledgeCard key={k.id} item={k} />)}
                  {knowledge.data.total > knowledge.data.items.length && (
                    <Link href={{ pathname: "/vault", query: { project: p.id } }} className="link link-primary text-sm">
                      View all {knowledge.data.total} items
                    </Link>
                  )}
                </div>
              ) : (
                <p className="surface text-muted p-5 text-sm">No knowledge linked to this project yet.</p>
              )}
            </section>

            <section aria-labelledby="project-decisions">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="project-decisions" className="text-section flex items-center gap-2">
                  <Scale className="text-primary size-4" aria-hidden /> Decisions ({p.decision_count})
                </h2>
                <Link href={{ pathname: "/decisions/new", query: { project: p.id } }} className="btn btn-ghost btn-xs">
                  <Plus className="size-3.5" aria-hidden /> Add
                </Link>
              </div>
              {decisions.error ? (
                <ErrorState error={decisions.error} onRetry={decisions.reload} />
              ) : decisions.loading ? (
                <ListSkeleton rows={2} />
              ) : decisions.data?.items.length ? (
                <div className="stagger grid gap-3">
                  {decisions.data.items.map((d) => <DecisionCard key={d.id} decision={d} />)}
                  {decisions.data.total > decisions.data.items.length && (
                    <Link href={{ pathname: "/decisions", query: { project: p.id } }} className="link link-primary text-sm">
                      View all {decisions.data.total} decisions
                    </Link>
                  )}
                </div>
              ) : (
                <p className="surface text-muted p-5 text-sm">No decisions recorded for this project yet.</p>
              )}
            </section>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        title="Delete this project?"
        description={`"${p.name}" will be deleted. Its ${p.knowledge_count} knowledge items and ${p.decision_count} decisions are kept, just no longer linked to a project.`}
        busy={deleting}
        onCancel={() => setConfirming(false)}
        onConfirm={remove}
      />
    </>
  );
};

ProjectDetailPage.getLayout = appLayout;
export default ProjectDetailPage;
