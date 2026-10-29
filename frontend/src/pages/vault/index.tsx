import { Archive, BookOpen, Plus, SearchX } from "lucide-react";
import Head from "next/head";
import Link from "next/link";

import { ImportFilesButton } from "@/components/attachments/ImportFilesButton";
import { KnowledgeCard } from "@/components/knowledge/KnowledgeCard";
import { appLayout } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ProjectSelect } from "@/components/ui/ProjectSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { knowledgeApi, type KnowledgeQuery, searchApi } from "@/lib/api/services";
import type { PageWithLayout } from "@/lib/layout";

const PAGE_SIZE = 20;
const SORTS = {
  updated: { sort: "updated_at", order: "desc", label: "Recently updated" },
  created: { sort: "created_at", order: "desc", label: "Newest first" },
  oldest: { sort: "created_at", order: "asc", label: "Oldest first" },
  title: { sort: "title", order: "asc", label: "Title A–Z" },
} as const;
type SortKey = keyof typeof SORTS;

const VaultPage: PageWithLayout = () => {
  const { values, update, offset, ready } = useUrlFilters(["q", "tag", "project", "sort", "view"] as const);
  const archivedView = values.view === "archived";
  const sortKey: SortKey = values.sort in SORTS ? (values.sort as SortKey) : "updated";
  const filtering = Boolean(values.q || values.tag || values.project);

  const query: KnowledgeQuery = {
    q: values.q || undefined,
    tag: values.tag || undefined,
    project_id: values.project || undefined,
    archived: archivedView || undefined,
    sort: SORTS[sortKey].sort,
    order: SORTS[sortKey].order,
    limit: PAGE_SIZE,
    offset,
  };
  const list = useAsync((signal) => knowledgeApi.list(query, signal), [JSON.stringify(query)], ready);
  const tags = useAsync(() => knowledgeApi.tags(), []);
  const stats = useAsync(() => searchApi.stats(), []);

  return (
    <>
      <Head>
        <title>Knowledge Vault · EchoVault Nexus</title>
      </Head>
      <PageHeader
        title="Vault"
        description="Everything you've captured: ideas, lessons, references and notes."
        actions={
          <>
            <ImportFilesButton onImported={list.reload} />
            <Link href="/vault/new" className="btn btn-primary btn-sm">
              <Plus className="size-4" aria-hidden /> New item
            </Link>
          </>
        }
      />

      <div role="tablist" aria-label="Which notes to show" className="mb-4 flex gap-1">
        {[
          { value: null, label: "Active", count: stats.data?.knowledge_count },
          { value: "archived", label: "Archived", count: stats.data?.archived_knowledge_count },
        ].map((tab) => {
          const selected = (tab.value === "archived") === archivedView;
          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => update({ view: tab.value })}
              className={`btn btn-sm ${selected ? "btn-primary" : "btn-ghost border-base-300"}`}
            >
              {tab.label}
              {tab.count !== undefined && <span className="tabular-nums opacity-70">{tab.count}</span>}
            </button>
          );
        })}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_11rem_11rem_11rem]">
        <SearchInput value={values.q} onChange={(q) => update({ q })} label="Search the vault" placeholder="Search titles and content" />
        <select
          className="select w-full"
          value={values.tag}
          onChange={(e) => update({ tag: e.target.value })}
          aria-label="Filter by tag"
        >
          <option value="">All tags</option>
          {tags.data?.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name} ({t.count})
            </option>
          ))}
        </select>
        <ProjectSelect value={values.project || null} onChange={(project) => update({ project })} aria-label="Filter by project" emptyLabel="All projects" />
        <select className="select w-full" value={sortKey} onChange={(e) => update({ sort: e.target.value === "updated" ? null : e.target.value })} aria-label="Sort order">
          {Object.entries(SORTS).map(([key, s]) => (
            <option key={key} value={key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <ListSkeleton />
      ) : list.data && list.data.items.length === 0 ? (
        archivedView && !filtering ? (
          <EmptyState icon={Archive} title="No archived notes" description="Archive a note from its page to tidy your vault without deleting it. Archived notes stay searchable and can be restored." />
        ) : filtering ? (
          <EmptyState
            icon={SearchX}
            title="No matching items"
            description="Try different keywords, or clear the filters."
            action={
              <button type="button" className="btn btn-sm" onClick={() => update({ q: null, tag: null, project: null })}>
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Your vault is empty"
            description="Capture an idea, a lesson learned or a useful reference. You'll be able to search it and ask the assistant about it later."
            action={
              <Link href="/vault/new" className="btn btn-primary btn-sm">
                <Plus className="size-4" aria-hidden /> Capture your first note
              </Link>
            }
          />
        )
      ) : (
        <div aria-busy={list.loading}>
          <p className="text-meta mb-3" role="status">
            {list.data?.total} {list.data?.total === 1 ? "item" : "items"}
          </p>
          <div className={`stagger grid gap-3 transition-opacity ${list.loading ? "opacity-60" : ""}`}>
            {list.data?.items.map((item) => <KnowledgeCard key={item.id} item={item} />)}
          </div>
          {list.data && <Pagination total={list.data.total} limit={PAGE_SIZE} offset={offset} onChange={(o) => update({ offset: o || null })} />}
        </div>
      )}
    </>
  );
};

VaultPage.getLayout = appLayout;
export default VaultPage;
