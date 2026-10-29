import { Plus, Scale, SearchX } from "lucide-react";
import Head from "next/head";
import Link from "next/link";

import { DecisionCard } from "@/components/decisions/DecisionCard";
import { DECISION_STATUSES } from "@/components/decisions/DecisionStatusBadge";
import { appLayout } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { ProjectSelect } from "@/components/ui/ProjectSelect";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/States";
import { useAsync } from "@/hooks/useAsync";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { decisionsApi, type DecisionQuery } from "@/lib/api/services";
import type { DecisionStatus } from "@/lib/api/types";
import type { PageWithLayout } from "@/lib/layout";

const PAGE_SIZE = 20;

const DecisionsPage: PageWithLayout = () => {
  const { values, update, offset, ready } = useUrlFilters(["q", "project", "order", "status"] as const);
  const status = DECISION_STATUSES.some((s) => s.value === values.status) ? (values.status as DecisionStatus) : undefined;
  const order = values.order === "asc" ? "asc" : "desc";
  const query: DecisionQuery = {
    q: values.q || undefined,
    project_id: values.project || undefined,
    status,
    sort: "created_at",
    order,
    limit: PAGE_SIZE,
    offset,
  };
  const list = useAsync((signal) => decisionsApi.list(query, signal), [JSON.stringify(query)], ready);
  const filtering = Boolean(values.q || values.project || status);

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

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_11rem_11rem_10rem]">
        <SearchInput value={values.q} onChange={(q) => update({ q })} label="Search decisions" placeholder="Search context, reasoning and outcomes" />
        <ProjectSelect value={values.project || null} onChange={(project) => update({ project })} aria-label="Filter by project" emptyLabel="All projects" />
        <select className="select w-full" value={status ?? ""} onChange={(e) => update({ status: e.target.value || null })} aria-label="Filter by status">
          <option value="">All statuses</option>
          {DECISION_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
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
              <button type="button" className="btn btn-sm" onClick={() => update({ q: null, project: null, status: null })}>
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
