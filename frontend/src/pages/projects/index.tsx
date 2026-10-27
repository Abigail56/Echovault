import { FolderKanban, Plus, SearchX } from "lucide-react";
import Head from "next/head";
import Link from "next/link";

import { appLayout } from "@/components/layout/AppShell";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { PROJECT_STATUSES } from "@/components/ui/StatusBadge";
import { useAsync } from "@/hooks/useAsync";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { projectsApi, type ProjectQuery } from "@/lib/api/services";
import type { ProjectStatus } from "@/lib/api/types";
import type { PageWithLayout } from "@/lib/layout";

const PAGE_SIZE = 24;

const ProjectsPage: PageWithLayout = () => {
  const { values, update, offset, ready } = useUrlFilters(["q", "status"] as const);
  const status = PROJECT_STATUSES.some((s) => s.value === values.status) ? (values.status as ProjectStatus) : undefined;
  const query: ProjectQuery = { q: values.q || undefined, status, limit: PAGE_SIZE, offset };
  const list = useAsync((signal) => projectsApi.list(query, signal), [JSON.stringify(query)], ready);
  const filtering = Boolean(values.q || status);

  return (
    <>
      <Head>
        <title>Projects · EchoVault Nexus</title>
      </Head>
      <PageHeader
        title="Projects"
        description="Group related knowledge and decisions around the things you're working on."
        actions={
          <Link href="/projects/new" className="btn btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> New project
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row">
        <div className="flex-1">
          <SearchInput value={values.q} onChange={(q) => update({ q })} label="Search projects" placeholder="Search names and descriptions" />
        </div>
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1">
          {[{ value: "", label: "All" }, ...PROJECT_STATUSES].map((s) => (
            <button
              key={s.value}
              type="button"
              className={`btn btn-sm h-10 ${(status ?? "") === s.value ? "btn-primary" : "btn-ghost border-base-300"}`}
              aria-pressed={(status ?? "") === s.value}
              onClick={() => update({ status: s.value || null })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <ListSkeleton rows={3} />
      ) : list.data?.items.length === 0 ? (
        filtering ? (
          <EmptyState
            icon={SearchX}
            title="No matching projects"
            description="Try a different search or status."
            action={
              <button type="button" className="btn btn-sm" onClick={() => update({ q: null, status: null })}>
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Projects keep related notes and decisions together, like a thesis, a product launch or a home renovation."
            action={
              <Link href="/projects/new" className="btn btn-primary btn-sm">
                <Plus className="size-4" aria-hidden /> Create a project
              </Link>
            }
          />
        )
      ) : (
        <div aria-busy={list.loading}>
          <div className={`stagger grid gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${list.loading ? "opacity-60" : ""}`}>
            {list.data?.items.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
          {list.data && <Pagination total={list.data.total} limit={PAGE_SIZE} offset={offset} onChange={(o) => update({ offset: o || null })} />}
        </div>
      )}
    </>
  );
};

ProjectsPage.getLayout = appLayout;
export default ProjectsPage;
