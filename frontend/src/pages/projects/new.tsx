import Head from "next/head";
import { useRouter } from "next/router";

import { appLayout } from "@/components/layout/AppShell";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/hooks/useToast";
import { projectsApi } from "@/lib/api/services";
import type { PageWithLayout } from "@/lib/layout";

const NewProjectPage: PageWithLayout = () => {
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <Head>
        <title>New project · EchoVault Nexus</title>
      </Head>
      <PageHeader title="New project" breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: "New project" }]} />
      <div className="max-w-2xl">
        <ProjectForm
          submitLabel="Create project"
          onCancel={() => router.back()}
          onSubmit={async (values) => {
            const created = await projectsApi.create(values);
            toast.success("Project created");
            await router.push(`/projects/${created.id}`);
          }}
        />
      </div>
    </>
  );
};

NewProjectPage.getLayout = appLayout;
export default NewProjectPage;
