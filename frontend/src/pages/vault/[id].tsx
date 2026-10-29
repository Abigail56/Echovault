import { Archive, ArchiveRestore, BookOpen, Paperclip, CalendarClock, FolderKanban, Link2, PencilLine, Scale, Trash2 } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import { ATTACH_INPUT_ID, AttachmentPanel } from "@/components/attachments/AttachmentPanel";
import { KnowledgeForm } from "@/components/knowledge/KnowledgeForm";
import { appLayout } from "@/components/layout/AppShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ConnectionMap } from "@/components/ui/ConnectionMap";
import { Markdown } from "@/components/ui/Markdown";
import { PageHeader } from "@/components/ui/PageHeader";
import { DetailSkeleton, ErrorState } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import { errorMessage } from "@/lib/api/client";
import { decisionsApi, knowledgeApi } from "@/lib/api/services";
import { formatDate, formatDateTime, queryParam } from "@/lib/format";
import type { PageWithLayout } from "@/lib/layout";

function MetaSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-meta mb-1.5 font-medium tracking-wide uppercase">{title}</h2>
      {children}
    </div>
  );
}

const KnowledgeDetailPage: PageWithLayout = () => {
  const router = useRouter();
  const toast = useToast();
  const id = queryParam(router.query.id);
  const editing = router.query.edit === "1";
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const item = useAsync(() => knowledgeApi.get(id), [id], router.isReady && Boolean(id));
  const projectId = item.data?.project?.id;
  const projectDecisions = useAsync(
    (signal) => decisionsApi.list({ project_id: projectId, limit: 5 }, signal),
    [projectId],
    Boolean(projectId),
  );

  const setEditing = (on: boolean) =>
    void router.replace({ pathname: router.pathname, query: on ? { id, edit: "1" } : { id } }, undefined, { shallow: true });

  const toggleArchive = async (archived: boolean) => {
    setArchiving(true);
    try {
      item.setData(await knowledgeApi.update(id, { archived }));
      toast.success(archived ? "Note archived. Restore it any time." : "Note restored to your vault");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setArchiving(false);
    }
  };

  // Appends text read from an attachment to the end of the note.
  const addToNote = async (text: string, filename: string) => {
    const current = item.data?.content.trimEnd() ?? "";
    const block = `### From ${filename}\n\n${text.trim()}`;
    try {
      item.setData(await knowledgeApi.update(id, { content: current ? `${current}\n\n${block}` : block }));
      toast.success("Text added to the note");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  // While editing, the form holds unsaved text, so copy instead of saving over it.
  const copyForEditing = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text.trim());
      toast.success("Text copied. Paste it into the content box with Ctrl+V.");
    } catch {
      toast.error("Couldn't copy. Select the text and copy it manually.");
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await knowledgeApi.remove(id);
      toast.success("Note deleted");
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
  const archived = Boolean(k.archived_at);

  return (
    <>
      <Head>
        <title>{k.title} · EchoVault Nexus</title>
      </Head>
      <PageHeader
        title={editing ? "Edit note" : k.title}
        breadcrumbs={[{ label: "Vault", href: archived ? "/vault?view=archived" : "/vault" }, { label: k.title }]}
        actions={
          !editing && (
            <>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => {
                  document.getElementById("attachments")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  document.getElementById(ATTACH_INPUT_ID)?.click();
                }}
              >
                <Paperclip className="size-4" aria-hidden /> Attach files
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>
                <PencilLine className="size-4" aria-hidden /> Edit
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => toggleArchive(!archived)} disabled={archiving}>
                {archived ? <ArchiveRestore className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
                {archived ? "Restore" : "Archive"}
              </button>
              <button type="button" className="btn btn-sm btn-ghost text-error" onClick={() => setConfirming(true)}>
                <Trash2 className="size-4" aria-hidden /> Delete
              </button>
            </>
          )
        }
      />

      {archived && !editing && (
        <div role="status" className="alert alert-soft alert-warning mb-5 text-sm">
          <Archive className="size-4" aria-hidden />
          <span>
            Archived on {formatDate(k.archived_at!)}. It&apos;s hidden from your vault list and the assistant, but still searchable.
          </span>
        </div>
      )}

      {editing ? (
        <div className="surface p-5 sm:p-6">
          <KnowledgeForm
            submitLabel="Save changes"
            noteId={k.id}
            initialRelated={k.related}
            initial={{ title: k.title, content: k.content, tags: k.tags, project_id: k.project?.id ?? null, related_ids: k.related.map((r) => r.id) }}
            onCancel={() => setEditing(false)}
            onSubmit={async (values) => {
              const updated = await knowledgeApi.update(id, values);
              item.setData(updated);
              toast.success("Changes saved");
              setEditing(false);
            }}
          />
        </div>
      ) : null}
      {editing && <AttachmentPanel key={`edit-${k.id}`} noteId={k.id} initial={k.attachments} onAddToNote={copyForEditing} />}
      {!editing && (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <article className="surface min-w-0 p-5 sm:p-8">
              {k.content.trim() ? (
                <div className="max-w-[72ch]">
                  <Markdown>{k.content}</Markdown>
                </div>
              ) : (
                <p className="text-muted text-sm italic">
                  This note has no content yet.{" "}
                  <button type="button" className="link link-primary not-italic" onClick={() => setEditing(true)}>
                    Add some
                  </button>
                </p>
              )}
            </article>
            <aside className="surface h-fit space-y-5 p-5 text-sm" aria-label="Details">
              <MetaSection title="Project">
                {k.project ? (
                  <Link href={`/projects/${k.project.id}`} className="link link-hover flex items-center gap-1.5">
                    <FolderKanban className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{k.project.name}</span>
                  </Link>
                ) : (
                  <p className="text-muted">None</p>
                )}
              </MetaSection>
              <MetaSection title="Related notes">
                {k.related.length ? (
                  <ul className="space-y-1">
                    {k.related.map((r) => (
                      <li key={r.id}>
                        <Link href={`/vault/${r.id}`} className="link link-hover flex items-center gap-1.5">
                          <Link2 className="size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{r.title}</span>
                          {r.archived && <span className="badge badge-ghost badge-xs">Archived</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">None</p>
                )}
              </MetaSection>
              <MetaSection title="Tags">
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
              </MetaSection>
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

          <AttachmentPanel key={k.id} noteId={k.id} initial={k.attachments} onAddToNote={addToNote} />

          <section className="mt-6" aria-labelledby="connections-heading">
            <h2 id="connections-heading" className="text-section mb-3">
              Connections
            </h2>
            <ConnectionMap
              center={{ kind: "This note", title: k.title, icon: BookOpen }}
              groups={[
                {
                  label: "Project",
                  icon: FolderKanban,
                  items: k.project ? [{ id: k.project.id, title: k.project.name, href: `/projects/${k.project.id}` }] : [],
                  empty: "Not in a project",
                },
                {
                  label: "Decisions in this project",
                  icon: Scale,
                  items: (projectDecisions.data?.items ?? []).map((d) => ({ id: d.id, title: d.title, href: `/decisions/${d.id}` })),
                  empty: k.project ? "No decisions yet" : "Link a project to see its decisions",
                },
                {
                  label: "Related notes",
                  icon: Link2,
                  items: k.related.map((r) => ({ id: r.id, title: r.title, href: `/vault/${r.id}`, meta: r.archived ? "Archived" : undefined })),
                  empty: "Link related notes when editing",
                },
              ]}
            />
          </section>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        title="Delete this note?"
        description={`"${k.title}"${k.attachments.length ? ` and its ${k.attachments.length} attached file(s)` : ""} will be permanently deleted. Consider archiving instead if you might need it later. This cannot be undone.`}
        busy={deleting}
        onCancel={() => setConfirming(false)}
        onConfirm={remove}
      />
    </>
  );
};

KnowledgeDetailPage.getLayout = appLayout;
export default KnowledgeDetailPage;
