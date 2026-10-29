import { ArrowRight, BookOpen, FolderKanban, Scale, Search as SearchIcon, SearchX } from "lucide-react";
import Head from "next/head";
import Link from "next/link";

import { appLayout } from "@/components/layout/AppShell";
import { Highlight } from "@/components/ui/Highlight";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { searchApi } from "@/lib/api/services";
import type { SearchFilter, SearchHit, SearchResults } from "@/lib/api/types";
import { formatDateTime, timeAgo } from "@/lib/format";
import type { PageWithLayout } from "@/lib/layout";

const GROUPS = [
  { type: "knowledge", key: "knowledge", label: "Notes", icon: BookOpen, href: (id: string) => `/vault/${id}` },
  { type: "project", key: "projects", label: "Projects", icon: FolderKanban, href: (id: string) => `/projects/${id}` },
  { type: "decision", key: "decisions", label: "Decisions", icon: Scale, href: (id: string) => `/decisions/${id}` },
] as const;

type Group = (typeof GROUPS)[number];

function ResultList({ group, hits, query }: { group: Group; hits: SearchHit[]; query: string }) {
  return (
    <ul className="divide-base-300 divide-y">
      {hits.map((hit) => (
        <li key={hit.id}>
          <Link href={group.href(hit.id)} className="hover:bg-base-200/60 focus-visible:bg-base-200/60 block px-5 py-3 transition-colors">
            <span className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium">
                  <Highlight text={hit.title} query={query} />
                </span>
                {hit.label && <span className="badge badge-ghost badge-xs shrink-0">{hit.label}</span>}
              </span>
              <time className="text-meta shrink-0" dateTime={hit.updated_at} title={formatDateTime(hit.updated_at)}>
                {timeAgo(hit.updated_at)}
              </time>
            </span>
            {hit.excerpt && (
              <span className="text-muted mt-0.5 line-clamp-2 block text-sm break-words">
                <Highlight text={hit.excerpt} query={query} />
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Results({ data, query, onType }: { data: SearchResults; query: string; onType: (t: SearchFilter) => void }) {
  return (
    <div className="stagger space-y-4">
      {GROUPS.map((group) => {
        const hits = data[group.key];
        const count = data.counts[group.key];
        if (!hits.length) return null;
        return (
          <section key={group.key} aria-label={group.label} className="surface">
            <h2 className="border-base-300 text-section flex items-center gap-2 border-b px-5 py-3">
              <group.icon className="text-primary size-4" aria-hidden /> {group.label}
              <span className="badge badge-ghost badge-sm">{count}</span>
              {data.type === "all" && count > hits.length && (
                <button type="button" className="link link-hover text-primary nudge-icon ml-auto flex items-center gap-1 text-sm font-normal" onClick={() => onType(group.type)}>
                  Show all {count} <ArrowRight className="size-3.5" aria-hidden />
                </button>
              )}
            </h2>
            <ResultList group={group} hits={hits} query={query} />
          </section>
        );
      })}
    </div>
  );
}

const SearchPage: PageWithLayout = () => {
  const { values, update, offset, ready } = useUrlFilters(["q", "type"] as const);
  const q = values.q.trim();
  const type: SearchFilter = GROUPS.some((g) => g.type === values.type) ? (values.type as SearchFilter) : "all";
  const results = useAsync((signal) => searchApi.search(q, type, offset, signal), [q, type, offset], ready && q.length > 0);
  const data = results.data;

  const tabs: { value: SearchFilter; label: string; count?: number }[] = [
    { value: "all", label: "All", count: data?.total },
    ...GROUPS.map((g) => ({ value: g.type as SearchFilter, label: g.label, count: data?.counts[g.key] })),
  ];
  const typeTotal = data && type !== "all" ? data.counts[GROUPS.find((g) => g.type === type)!.key] : 0;

  return (
    <>
      <Head>
        <title>{q ? `“${q}” · Search` : "Search"} · EchoVault Nexus</title>
      </Head>
      <PageHeader title="Search" description="Search the words in your notes, projects and decisions. Partial words match too (“deploy” finds “deployment”)." />
      <div className="mb-4">
        <SearchInput value={values.q} onChange={(value) => update({ q: value })} label="Search query" placeholder="Try a topic, a tag or a phrase" autoFocus size="lg" />
      </div>

      {q && (
        <div role="tablist" aria-label="Filter results by type" className="mb-5 flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={type === tab.value}
              onClick={() => update({ type: tab.value === "all" ? null : tab.value })}
              className={`btn btn-sm ${type === tab.value ? "btn-primary" : "btn-ghost border-base-300"}`}
            >
              {tab.label}
              {tab.count !== undefined && <span className="tabular-nums opacity-70">{tab.count}</span>}
            </button>
          ))}
        </div>
      )}

      {!q ? (
        <EmptyState icon={SearchIcon} title="Search your workspace" description="Results are grouped by type. Only your own records are searched." />
      ) : results.error ? (
        <ErrorState error={results.error} onRetry={results.reload} />
      ) : !data || (results.loading && data.query !== q) ? (
        <ListSkeleton rows={3} />
      ) : data.total === 0 ? (
        <EmptyState icon={SearchX} title={`No results for “${q}”`} description="Check the spelling, try fewer words, or search for a tag." />
      ) : type !== "all" && typeTotal === 0 ? (
        <EmptyState icon={SearchX} title="Nothing of this type matches" description="Try the All tab to see matches of other types." />
      ) : (
        <div aria-busy={results.loading} className={results.loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <Results data={data} query={q} onType={(t) => update({ type: t })} />
          {type !== "all" && <Pagination total={typeTotal} limit={data.limit} offset={offset} onChange={(o) => update({ offset: o || null })} />}
        </div>
      )}
    </>
  );
};

SearchPage.getLayout = appLayout;
export default SearchPage;
