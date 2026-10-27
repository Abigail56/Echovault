import { ArrowRight, BookOpen, Bot, FolderKanban, Plus, Scale, Search, Tags } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import type { ReactNode } from "react";

import { appLayout } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAsync } from "@/hooks/useAsync";
import { useAuth } from "@/hooks/useAuth";
import { useCountUp } from "@/hooks/useCountUp";
import { decisionsApi, knowledgeApi, projectsApi, searchApi } from "@/lib/api/services";
import { formatDateTime, timeAgo } from "@/lib/format";
import type { PageWithLayout } from "@/lib/layout";

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function Stat({ label, value, href, icon: Icon }: { label: string; value: number | undefined; href: string; icon: typeof BookOpen }) {
  const shown = useCountUp(value);
  return (
    <Link href={href} className="surface lift hover:border-primary/40 group flex items-center gap-4 p-4">
      <span className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-content grid size-10 shrink-0 place-items-center rounded-field transition-colors duration-300">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-2xl leading-tight font-semibold tabular-nums">
          {shown === undefined ? <span className="skeleton inline-block h-6 w-8 align-middle" /> : shown}
        </span>
        <span className="text-meta block">{label}</span>
      </span>
    </Link>
  );
}

function Panel({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return (
    <section className="surface flex min-w-0 flex-col">
      <div className="border-base-300 flex items-center justify-between border-b px-5 py-3">
        <h2 className="text-section">{title}</h2>
        <Link href={href} className="link link-hover text-primary nudge-icon flex items-center gap-1 text-sm">
          View all <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function RowList({ rows, empty, loading }: { rows: { id: string; href: string; title: string; meta: ReactNode; date: string }[]; empty: ReactNode; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3 p-5" aria-busy="true" aria-label="Loading">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-4" style={{ width: `${80 - i * 15}%` }} />
        ))}
      </div>
    );
  }
  if (!rows.length) return <div className="text-muted p-5 text-sm">{empty}</div>;
  return (
    <ul className="stagger divide-base-300 divide-y">
      {rows.map((row) => (
        <li key={row.id}>
          <Link href={row.href} className="hover:bg-base-200 flex items-center gap-3 px-5 py-3 transition-colors">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{row.title}</span>
              <span className="text-meta block truncate">{row.meta}</span>
            </span>
            <time className="text-meta shrink-0" dateTime={row.date} title={formatDateTime(row.date)}>
              {timeAgo(row.date)}
            </time>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const Dashboard: PageWithLayout = () => {
  const { user } = useAuth();
  const stats = useAsync(() => searchApi.stats(), []);
  const knowledge = useAsync((s) => knowledgeApi.list({ limit: 5 }, s), []);
  const projects = useAsync((s) => projectsApi.list({ limit: 5 }, s), []);
  const decisions = useAsync((s) => decisionsApi.list({ limit: 5 }, s), []);

  const isNew = stats.data && stats.data.knowledge_count + stats.data.project_count + stats.data.decision_count === 0;
  const firstName = user?.full_name.split(" ")[0] ?? "";

  return (
    <>
      <Head>
        <title>Dashboard · EchoVault Nexus</title>
      </Head>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-page-title">
            {greeting()}, {firstName}
          </h1>
          <p className="text-muted mt-1 text-sm">Here&apos;s what&apos;s in your workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/vault/new" className="btn btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> Capture knowledge
          </Link>
          <Link href="/decisions/new" className="btn btn-sm btn-outline border-base-300">
            <Scale className="size-4" aria-hidden /> Record decision
          </Link>
        </div>
      </div>

      {stats.error ? (
        <ErrorState error={stats.error} onRetry={stats.reload} />
      ) : (
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Knowledge items" value={stats.data?.knowledge_count} href="/vault" icon={BookOpen} />
          <Stat label={`Projects (${stats.data?.active_project_count ?? 0} active)`} value={stats.data?.project_count} href="/projects" icon={FolderKanban} />
          <Stat label="Decisions" value={stats.data?.decision_count} href="/decisions" icon={Scale} />
          <Stat label="Tags in use" value={stats.data?.tag_count} href="/vault" icon={Tags} />
        </div>
      )}

      {isNew && (
        <section className="surface mt-6 p-6" aria-labelledby="getting-started">
          <h2 id="getting-started" className="text-section">
            Getting started
          </h2>
          <p className="text-muted mt-1 text-sm">Three small steps to make EchoVault useful:</p>
          <ol className="stagger mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { n: 1, title: "Create a project", text: "Group related notes and decisions.", href: "/projects/new", icon: FolderKanban },
              { n: 2, title: "Capture a note", text: "Save an idea, a lesson or a snippet.", href: "/vault/new", icon: BookOpen },
              { n: 3, title: "Ask your notes", text: "Use search or the assistant to find it later.", href: "/assistant", icon: Bot },
            ].map((step) => (
              <li key={step.n}>
                <Link href={step.href} className="lift hover:border-primary/40 border-base-300 flex h-full gap-3 rounded-box border p-4">
                  <step.icon className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
                  <span>
                    <span className="block text-sm font-medium">
                      {step.n}. {step.title}
                    </span>
                    <span className="text-meta block">{step.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <Link href="/search" className="surface lift hover:border-primary/40 text-muted mt-6 flex items-center gap-3 px-5 py-3 text-sm">
        <Search className="size-4" aria-hidden />
        Looking for something? Search notes, projects and decisions
        <kbd className="kbd kbd-sm ml-auto hidden sm:inline-flex">/</kbd>
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Recently updated knowledge" href="/vault">
          {knowledge.error ? (
            <div className="p-5">
              <ErrorState error={knowledge.error} onRetry={knowledge.reload} />
            </div>
          ) : (
            <RowList
              loading={knowledge.loading}
              empty={
                <>
                  No knowledge yet.{" "}
                  <Link href="/vault/new" className="link link-primary">
                    Capture your first note
                  </Link>
                </>
              }
              rows={(knowledge.data?.items ?? []).map((k) => ({
                id: k.id,
                href: `/vault/${k.id}`,
                title: k.title,
                meta: k.project?.name ?? (k.tags.length ? k.tags.join(", ") : "No project"),
                date: k.updated_at,
              }))}
            />
          )}
        </Panel>

        <div className="grid min-w-0 gap-6">
          <Panel title="Projects" href="/projects">
            {projects.error ? (
              <div className="p-5">
                <ErrorState error={projects.error} onRetry={projects.reload} />
              </div>
            ) : (
              <RowList
                loading={projects.loading}
                empty={
                  <>
                    No projects yet.{" "}
                    <Link href="/projects/new" className="link link-primary">
                      Create one
                    </Link>
                  </>
                }
                rows={(projects.data?.items ?? []).map((p) => ({
                  id: p.id,
                  href: `/projects/${p.id}`,
                  title: p.name,
                  meta: <StatusBadge status={p.status} />,
                  date: p.updated_at,
                }))}
              />
            )}
          </Panel>
          <Panel title="Recent decisions" href="/decisions">
            {decisions.error ? (
              <div className="p-5">
                <ErrorState error={decisions.error} onRetry={decisions.reload} />
              </div>
            ) : (
              <RowList
                loading={decisions.loading}
                empty={
                  <>
                    No decisions recorded.{" "}
                    <Link href="/decisions/new" className="link link-primary">
                      Record one
                    </Link>
                  </>
                }
                rows={(decisions.data?.items ?? []).map((d) => ({
                  id: d.id,
                  href: `/decisions/${d.id}`,
                  title: d.title,
                  meta: d.has_outcome ? "Reviewed" : "Awaiting review",
                  date: d.updated_at,
                }))}
              />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
};

Dashboard.getLayout = appLayout;
export default Dashboard;
