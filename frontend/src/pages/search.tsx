import { BookOpen, FolderKanban, Scale, Search as SearchIcon, SearchX } from "lucide-react";
import Head from "next/head";
import Link from "next/link";

import { appLayout } from "@/components/layout/AppShell";
import { Highlight } from "@/components/ui/Highlight";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { searchApi } from "@/lib/api/services";
import type { SearchHit } from "@/lib/api/types";
import { formatDateTime, timeAgo } from "@/lib/format";
import type { PageWithLayout } from "@/lib/layout";

const GROUPS = [
  { key: "knowledge", label: "Knowledge", icon: BookOpen, href: (id: string) => `/vault/${id}` },
  { key: "projects", label: "Projects", icon: FolderKanban, href: (id: string) => `/projects/${id}` },
  { key: "decisions", label: "Decisions", icon: Scale, href: (id: string) => `/decisions/${id}` },
] as const;

function ResultGroup({ label, icon: Icon, hits, query, href }: { label: string; icon: typeof BookOpen; hits: SearchHit[]; query: string; href: (id: string) => string }) {
  if (!hits.length) return null;
  return (
    <section aria-label={label} className="surface">
      <h2 className="border-base-300 text-section flex items-center gap-2 border-b px-5 py-3">
        <Icon className="text-primary size-4" aria-hidden /> {label}
        <span className="badge badge-ghost badge-sm">{hits.length}</span>
      </h2>
      <ul className="divide-base-300 divide-y">
        {hits.map((hit) => (
          <li key={hit.id}>
            <Link href={href(hit.id)} className="hover:bg-base-200 focus-visible:bg-base-200 block px-5 py-3 transition-colors">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-sm font-medium">
                  <Highlight text={hit.title} query={query} />
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
    </section>
  );
}

const SearchPage: PageWithLayout = () => {
  const { values, update, ready } = useUrlFilters(["q"] as const);
  const q = values.q.trim();
  const results = useAsync((signal) => searchApi.search(q, signal), [q], ready && q.length > 0);

  return (
    <>
      <Head>
        <title>{q ? `“${q}” · Search` : "Search"} · EchoVault Nexus</title>
      </Head>
      <PageHeader title="Search" description="Keyword search across your knowledge, projects and decisions. Partial words work too." />
      <div className="mb-6">
        <SearchInput value={values.q} onChange={(value) => update({ q: value })} label="Search query" placeholder="Try a topic, a tag or a phrase" autoFocus size="lg" />
      </div>

      {!q ? (
        <EmptyState icon={SearchIcon} title="Search your workspace" description="Results are grouped by type. Only your own records are searched." />
      ) : results.error ? (
        <ErrorState error={results.error} onRetry={results.reload} />
      ) : results.loading || !results.data ? (
        <ListSkeleton rows={3} />
      ) : results.data.total === 0 ? (
        <EmptyState icon={SearchX} title={`No results for “${q}”`} description="Check the spelling, try fewer words, or search for a tag." />
      ) : (
        <div className="space-y-4">
          <p className="text-meta" role="status">
            {results.data.total} {results.data.total === 1 ? "result" : "results"}
          </p>
          {GROUPS.map((g) => (
            <ResultGroup key={g.key} label={g.label} icon={g.icon} hits={results.data![g.key]} query={q} href={g.href} />
          ))}
        </div>
      )}
    </>
  );
};

SearchPage.getLayout = appLayout;
export default SearchPage;
