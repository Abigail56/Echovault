import Head from "next/head";
import { useRouter } from "next/router";

import { DecisionForm } from "@/components/decisions/DecisionForm";
import { appLayout } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/hooks/useToast";
import { decisionsApi } from "@/lib/api/services";
import { isUuid, queryParam } from "@/lib/format";
import type { PageWithLayout } from "@/lib/layout";

const NewDecisionPage: PageWithLayout = () => {
  const router = useRouter();
  const toast = useToast();
  const project = queryParam(router.query.project);
  if (!router.isReady) return null;

  return (
    <>
      <Head>
        <title>Record decision · EchoVault Nexus</title>
      </Head>
      <PageHeader
        title="Record a decision"
        description="Only the title is required. Capture the reasoning now, and come back later to note the outcome."
        breadcrumbs={[{ label: "Decision Journal", href: "/decisions" }, { label: "New decision" }]}
      />
      <div className="surface max-w-3xl p-5 sm:p-6">
        <DecisionForm
          submitLabel="Save decision"
          initial={{ project_id: isUuid(project) ? project : null }}
          onCancel={() => router.back()}
          onSubmit={async (values) => {
            const created = await decisionsApi.create(values);
            toast.success("Decision recorded");
            await router.push(`/decisions/${created.id}`);
          }}
        />
      </div>
    </>
  );
};

NewDecisionPage.getLayout = appLayout;
export default NewDecisionPage;
