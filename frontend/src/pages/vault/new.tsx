import { Paperclip } from "lucide-react";
import Head from "next/head";
import { useRouter } from "next/router";

import { KnowledgeForm } from "@/components/knowledge/KnowledgeForm";
import { appLayout } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/hooks/useToast";
import { knowledgeApi } from "@/lib/api/services";
import { isUuid, queryParam } from "@/lib/format";
import type { PageWithLayout } from "@/lib/layout";

const NewKnowledgePage: PageWithLayout = () => {
  const router = useRouter();
  const toast = useToast();
  // Arriving from a project page pre-selects that project.
  const project = queryParam(router.query.project);

  if (!router.isReady) return null;

  return (
    <>
      <Head>
        <title>New knowledge · EchoVault Nexus</title>
      </Head>
      <PageHeader title="Capture knowledge" breadcrumbs={[{ label: "Vault", href: "/vault" }, { label: "New item" }]} />
      <p className="text-muted mb-4 flex items-center gap-2 text-sm">
        <Paperclip className="size-4 shrink-0" aria-hidden />
        Want to add screenshots or files? Save the note first, then use <strong className="text-base-content">Attach files</strong> on the
        note&apos;s page.
      </p>
      <div className="surface p-5 sm:p-6">
        <KnowledgeForm
          submitLabel="Save to vault"
          initial={{ project_id: isUuid(project) ? project : null }}
          onCancel={() => router.back()}
          onSubmit={async (values) => {
            const created = await knowledgeApi.create(values);
            toast.success("Saved to your vault");
            await router.push(`/vault/${created.id}`);
          }}
        />
      </div>
    </>
  );
};

NewKnowledgePage.getLayout = appLayout;
export default NewKnowledgePage;
