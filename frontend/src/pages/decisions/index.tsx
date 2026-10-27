import { Plus, Scale, SearchX } from "lucide-react";
import Head from "next/head";
import Link from "next/link";

import { DecisionCard } from "@/components/decisions/DecisionCard";
import { appLayout } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ProjectSelect } from "@/components/ui/ProjectSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { decisionsApi, type DecisionQuery } from "@/lib/api/services";
import type { PageWithLayout } from "@/lib/layout";

const PAGE_SIZE = 20;

const DecisionsPage: PageWithLayout = () => {
  const { values, update, offset, ready } = useUrlFilters(["q", "project", "order"] as const);
  const order = values.order === "asc" ? "asc" : "desc";
  const query: DecisionQuery = {
    q: values.q || undefined,
    project_id: values.project || undefined,
    sort: "created_at",
    order,
    limit: PAGE_SIZE,
    offset,
  };
  const list = useAsync((signal) => decisionsApi.list(query, signal), [JSON.stringify(query)], ready);
  const filtering = Boolean(values.q || values.project);

  return (
    <>
      <Head>
        <title>Decision Journal · EchoVault Nexus</title>
      </Head>
      <PageHeader
        title="Decision Journal"
        description="Record what you decided and why, then revisit how it turned out."
        actions={
          <Link href="/decisions/new" className="btn btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> Record decision
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_12rem_11rem]">
        <SearchInput value={values.q} onChange={(q) => update({ q })} label="Search decisions" placeholder="Search context, reasoning and outcomes" />
        <ProjectSelect value={values.project || null} onChange={(project) => update({ project })} aria-label="Filter by project" emptyLabel="All projects" />
        <select className="select w-full" value={order} onChange={(e) => update({ order: e.target.value === "asc" ? "asc" : null })} aria-label="Sort order">
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>

      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <ListSkeleton />
      ) : list.data?.items.length === 0 ? (
        filtering ? (
          <EmptyState
            icon={SearchX}
            title="No matching decisions"
            description="Try different keywords or another project."
            action={
              <button type="button" className="btn btn-sm" onClick={() => update({ q: null, project: null })}>
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={Scale}
            title="No decisions recorded"
            description="Writing down the context and reasoning behind a choice makes it much easier to learn from later."
            action={
              <Link href="/decisions/new" className="btn btn-primary btn-sm">
                <Plus className="size-4" aria-hidden /> Record your first decision
              </Link>
            }
          />
        )
      ) : (
        <div aria-busy={list.loading}>
          <div className={`stagger grid gap-3 transition-opacity ${list.loading ? "opacity-60" : ""}`}>
            {list.data?.items.map((d) => <DecisionCard key={d.id} decision={d} />)}
          </div>
          {list.data && <Pagination total={list.data.total} limit={PAGE_SIZE} offset={offset} onChange={(o) => update({ offset: o || null })} />}
        </div>
      )}
    </>
  );
};

DecisionsPage.getLayout = appLayout;
export default DecisionsPage;
