import { ArrowRight, BookOpen, Bot, FolderKanban, Plus, Scale, Search } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import type { ReactNode } from "react";

import { DecisionStatusBadge } from "@/components/decisions/DecisionStatusBadge";
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

// Each stat gets its own colour so the three tiles are easy to tell apart.
const TONES = {
  primary: "bg-primary/12 text-primary group-hover:bg-primary group-hover:text-primary-content",
  accent: "bg-accent/12 text-accent group-hover:bg-accent group-hover:text-accent-content",
  warning: "bg-warning/12 text-warning group-hover:bg-warning group-hover:text-warning-content",
} as const;

function Stat({
  label,
  value,
  href,
  icon: Icon,
  note,
  tone = "primary",
}: {
  label: string;
  value: number | undefined;
  href: string;
  icon: typeof BookOpen;
  note?: string;
  tone?: keyof typeof TONES;
}) {
  const shown = useCountUp(value);
  return (
    <Link href={href} className="surface lift hover:border-primary/40 group flex items-center gap-4 p-4">
      <span className={`${TONES[tone]} grid size-11 shrink-0 place-items-center rounded-field transition-colors duration-300`}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-3xl leading-tight font-bold tracking-tight tabular-nums">
          {shown === undefined ? <span className="skeleton inline-block h-6 w-8 align-middle" /> : shown}
        </span>
        <span className="text-meta block truncate">
          {label}
          {note && <span className="text-subtle"> · {note}</span>}
        </span>
      </span>
    </Link>
  );
}

function Panel({ title, href, children, className = "" }: { title: string; href?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`surface flex min-w-0 flex-col ${className}`} aria-label={title}>
      <div className="border-base-300 flex items-center justify-between gap-3 border-b px-5 py-3">
        <h2 className="text-section">{title}</h2>
        {href && (
          <Link href={href} className="link link-hover text-primary nudge-icon flex shrink-0 items-center gap-1 text-sm">
            View all <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

interface Row {
  id: string;
  href: string;
  title: string;
  meta: ReactNode;
  date: string;
  icon?: typeof BookOpen;
  kind?: string;
}

function RowList({ rows, empty, loading }: { rows: Row[]; empty: ReactNode; loading: boolean }) {
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
        <li key={`${row.kind ?? ""}${row.id}`}>
          <Link href={row.href} className="hover:bg-base-200/60 flex items-center gap-3 px-5 py-3 transition-colors">
            {row.icon && (
              <span className="bg-base-200 text-muted grid size-8 shrink-0 place-items-center rounded-field" aria-hidden>
                <row.icon className="size-4" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{row.title}</span>
              <span className="text-meta flex min-w-0 items-center gap-1.5 truncate">
                {row.kind && <span className="font-medium">{row.kind}</span>}
                {row.kind && <span aria-hidden>·</span>}
                {row.meta}
              </span>
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

function PanelError({ error, onRetry }: { error: Parameters<typeof ErrorState>[0]["error"]; onRetry: () => void }) {
  return (
    <div className="p-5">
      <ErrorState error={error} onRetry={onRetry} />
    </div>
  );
}

const Overview: PageWithLayout = () => {
  const { user } = useAuth();
  const stats = useAsync(() => searchApi.stats(), []);
  const knowledge = useAsync((s) => knowledgeApi.list({ limit: 6 }, s), []);
  const projects = useAsync((s) => projectsApi.list({ limit: 6, status: "active" }, s), []);
  const decisions = useAsync((s) => decisionsApi.list({ limit: 6 }, s), []);

  const isNew = stats.data && stats.data.knowledge_count + stats.data.archived_knowledge_count + stats.data.project_count + stats.data.decision_count === 0;
  const firstName = user?.full_name.split(" ")[0] ?? "";

  // Recent activity: the latest changes across every record type, newest first.
  const activity: Row[] = [
    ...(knowledge.data?.items ?? []).map((k) => ({ id: k.id, href: `/vault/${k.id}`, title: k.title, meta: k.project?.name ?? "No project", date: k.updated_at, icon: BookOpen, kind: "Note" })),
    ...(projects.data?.items ?? []).map((p) => ({ id: p.id, href: `/projects/${p.id}`, title: p.name, meta: `${p.knowledge_count} notes`, date: p.updated_at, icon: FolderKanban, kind: "Project" })),
    ...(decisions.data?.items ?? []).map((d) => ({ id: d.id, href: `/decisions/${d.id}`, title: d.title, meta: d.project?.name ?? "No project", date: d.updated_at, icon: Scale, kind: "Decision" })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);
  const activityLoading = knowledge.loading || projects.loading || decisions.loading;

  return (
    <>
      <Head>
        <title>Overview · EchoVault Nexus</title>
      </Head>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-1">Overview</p>
          <h1 className="text-page-title">
            {greeting()}, {firstName}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/vault/new" className="btn btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> New note
          </Link>
          <Link href="/decisions/new" className="btn btn-sm btn-outline border-base-300">
            <Scale className="size-4" aria-hidden /> Record decision
          </Link>
        </div>
      </div>

      {stats.error ? (
        <ErrorState error={stats.error} onRetry={stats.reload} />
      ) : (
        <div className="stagger grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
          <Stat
            label="Notes"
            value={stats.data?.knowledge_count}
            href="/vault"
            icon={BookOpen}
            note={stats.data?.archived_knowledge_count ? `${stats.data.archived_knowledge_count} archived` : undefined}
          />
          <Stat label="Active projects" value={stats.data?.active_project_count} href="/projects?status=active" icon={FolderKanban} note={stats.data ? `${stats.data.project_count} total` : undefined} tone="accent" />
          <Stat label="Decisions" value={stats.data?.decision_count} href="/decisions" icon={Scale} tone="warning" />
        </div>
      )}

      {isNew && (
        <section className="surface mt-6 p-5 sm:p-6" aria-labelledby="getting-started">
          <h2 id="getting-started" className="text-section">
            Getting started
          </h2>
          <p className="text-muted mt-1 text-sm">Three steps to make your vault useful:</p>
          <ol className="stagger mt-4 grid gap-3 md:grid-cols-3">
            {[
              { n: 1, title: "Create a project", text: "Group related notes and decisions.", href: "/projects/new", icon: FolderKanban },
              { n: 2, title: "Capture a note", text: "Save an idea, a lesson or a reference.", href: "/vault/new", icon: BookOpen },
              { n: 3, title: "Ask your vault", text: "Search, or ask the assistant to find it later.", href: "/assistant", icon: Bot },
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
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="truncate">Search notes, projects and decisions</span>
        <kbd className="kbd kbd-sm ml-auto hidden sm:inline-flex">/</kbd>
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Recent activity" className="lg:col-span-2">
          <RowList loading={activityLoading} empty="Nothing yet. Your latest notes, projects and decisions will appear here." rows={activity} />
        </Panel>
        <Panel title="Active projects" href="/projects">
          {projects.error ? (
            <PanelError error={projects.error} onRetry={projects.reload} />
          ) : (
            <RowList
              loading={projects.loading}
              empty={
                <>
                  No active projects.{" "}
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
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Recently updated notes" href="/vault">
          {knowledge.error ? (
            <PanelError error={knowledge.error} onRetry={knowledge.reload} />
          ) : (
            <RowList
              loading={knowledge.loading}
              empty={
                <>
                  No notes yet.{" "}
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
        <Panel title="Recent decisions" href="/decisions">
          {decisions.error ? (
            <PanelError error={decisions.error} onRetry={decisions.reload} />
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
                meta: <DecisionStatusBadge status={d.status} />,
                date: d.updated_at,
              }))}
            />
          )}
        </Panel>
      </div>
    </>
  );
};

Overview.getLayout = appLayout;
export default Overview;
