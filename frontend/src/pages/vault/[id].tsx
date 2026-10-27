import { CalendarClock, FolderKanban, PencilLine, Trash2 } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import { KnowledgeForm } from "@/components/knowledge/KnowledgeForm";
import { appLayout } from "@/components/layout/AppShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Markdown } from "@/components/ui/Markdown";
import { PageHeader } from "@/components/ui/PageHeader";
import { DetailSkeleton, ErrorState } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/lib/api/client";
import { knowledgeApi } from "@/lib/api/services";
import { formatDateTime, queryParam } from "@/lib/format";
import type { PageWithLayout } from "@/lib/layout";

const KnowledgeDetailPage: PageWithLayout = () => {
  const router = useRouter();
  const toast = useToast();
  const id = queryParam(router.query.id);
  const editing = router.query.edit === "1";
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const item = useAsync(() => knowledgeApi.get(id), [id], router.isReady && Boolean(id));

  const setEditing = (on: boolean) =>
    void router.replace({ pathname: router.pathname, query: on ? { id, edit: "1" } : { id } }, undefined, { shallow: true });

  const remove = async () => {
    setDeleting(true);
    try {
      await knowledgeApi.remove(id);
      toast.success("Knowledge item deleted");
      await router.push("/vault");
    } catch (error) {
      toast.error(errorMessage(error));
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (item.error) return <ErrorState error={item.error} onRetry={item.reload} />;
  if (!item.data) return <DetailSkeleton />;
  const k = item.data;

  return (
    <>
      <Head>
        <title>{k.title} · EchoVault Nexus</title>
      </Head>
      <PageHeader
        title={editing ? "Edit knowledge" : k.title}
        breadcrumbs={[{ label: "Knowledge Vault", href: "/vault" }, { label: k.title }]}
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
        <div className="surface p-5 sm:p-6">
          <KnowledgeForm
            submitLabel="Save changes"
            initial={{ title: k.title, content: k.content, tags: k.tags, project_id: k.project?.id ?? null }}
            onCancel={() => setEditing(false)}
            onSubmit={async (values) => {
              const updated = await knowledgeApi.update(id, values);
              item.setData(updated);
              toast.success("Changes saved");
              setEditing(false);
            }}
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
          <article className="surface min-w-0 p-5 sm:p-8">
            {k.content.trim() ? (
              <Markdown>{k.content}</Markdown>
            ) : (
              <p className="text-muted text-sm italic">
                This item has no content yet.{" "}
                <button type="button" className="link link-primary not-italic" onClick={() => setEditing(true)}>
                  Add some
                </button>
              </p>
            )}
          </article>
          <aside className="surface h-fit space-y-4 p-5 text-sm" aria-label="Details">
            <div>
              <h2 className="text-meta mb-1 font-medium tracking-wide uppercase">Project</h2>
              {k.project ? (
                <Link href={`/projects/${k.project.id}`} className="link link-hover flex items-center gap-1.5">
                  <FolderKanban className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{k.project.name}</span>
                </Link>
              ) : (
                <p className="text-muted">None</p>
              )}
            </div>
            <div>
              <h2 className="text-meta mb-1 font-medium tracking-wide uppercase">Tags</h2>
              {k.tags.length ? (
                <ul className="flex flex-wrap gap-1">
                  {k.tags.map((tag) => (
                    <li key={tag}>
                      <Link href={{ pathname: "/vault", query: { tag } }} className="badge badge-soft badge-primary hover:underline">
                        {tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">None</p>
              )}
            </div>
            <div className="text-meta space-y-1">
              <p className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5" aria-hidden /> Created {formatDateTime(k.created_at)}
              </p>
              <p className="flex items-center gap-1.5">
                <PencilLine className="size-3.5" aria-hidden /> Updated {formatDateTime(k.updated_at)}
              </p>
            </div>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title="Delete this knowledge item?"
        description={`"${k.title}" will be permanently deleted. This cannot be undone.`}
        busy={deleting}
        onCancel={() => setConfirming(false)}
        onConfirm={remove}
      />
    </>
  );
};

KnowledgeDetailPage.getLayout = appLayout;
export default KnowledgeDetailPage;
