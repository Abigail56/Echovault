import { CheckCircle2 } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

import { AttachmentPicker, type Rejection, type StagedFile } from "@/components/attachments/AttachmentPicker";
import { KnowledgeForm } from "@/components/knowledge/KnowledgeForm";
import { appLayout } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import { ApiError, errorMessage, uploadWithProgress } from "@/lib/api/client";
import { attachmentsApi, knowledgeApi } from "@/lib/api/services";
import type { Attachment } from "@/lib/api/types";
import { DEFAULT_LIMITS, familyOf, fileKey, validateFile } from "@/lib/attachments";
import { isUuid, plural, queryParam } from "@/lib/format";
import type { PageWithLayout } from "@/lib/layout";
import type { KnowledgeValues } from "@/lib/schemas";

const NewKnowledgePage: PageWithLayout = () => {
  const router = useRouter();
  const toast = useToast();
  // Arriving from a project page pre-selects that project.
  const project = queryParam(router.query.project);

  const usage = useAsync(() => attachmentsApi.usage(), []);
  const maxFileBytes = usage.data?.max_file_bytes ?? DEFAULT_LIMITS.maxFileBytes;
  const maxFiles = usage.data?.max_files_per_note ?? DEFAULT_LIMITS.maxFiles;

  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [saving, setSaving] = useState(false);
  // Set once the note exists, so a retry never creates a second note.
  const [createdId, setCreatedId] = useState<string | null>(null);
  // Put the text read from the files into the note automatically.
  const [addText, setAddText] = useState(true);
  const uploadedIds = useRef<string[]>([]);

  // Always-current copy of the list, for the save loop and for cleanup.
  const stagedRef = useRef(staged);
  useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);
  // Free image previews when leaving the page.
  useEffect(() => () => stagedRef.current.forEach((s) => s.previewUrl && URL.revokeObjectURL(s.previewUrl)), []);

  const patch = (key: string, changes: Partial<StagedFile>) =>
    setStaged((list) => list.map((s) => (s.key === key ? { ...s, ...changes } : s)));

  const addFiles = (files: File[]) => {
    const problems: Rejection[] = [];
    const known = new Set(stagedRef.current.map((s) => s.key));
    const added: StagedFile[] = [];
    for (const file of files) {
      const key = fileKey(file);
      const reason = validateFile(file, maxFileBytes);
      if (reason) problems.push({ name: file.name, reason });
      else if (known.has(key)) problems.push({ name: file.name, reason: "Already added." });
      // `known` already includes the files accepted so far in this batch.
      else if (known.size >= maxFiles) problems.push({ name: file.name, reason: `A note can have at most ${maxFiles} files.` });
      else {
        known.add(key);
        added.push({
          key,
          file,
          status: "ready",
          progress: 0,
          previewUrl: familyOf(file.name) === "image" ? URL.createObjectURL(file) : undefined,
        });
      }
    }
    setRejections(problems);
    if (added.length) setStaged((list) => [...list, ...added]);
  };

  const removeFile = (key: string) => {
    const item = stagedRef.current.find((s) => s.key === key);
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
    setStaged((list) => list.filter((s) => s.key !== key));
  };

  const save = async (values: KnowledgeValues) => {
    setSaving(true);
    setRejections([]);
    try {
      // 1. Save the note (or, on a retry, save any edits to the note already created).
      let noteId = createdId;
      if (noteId) await knowledgeApi.update(noteId, values);
      else {
        noteId = (await knowledgeApi.create(values)).id;
        setCreatedId(noteId);
      }

      // 2. Upload each file that isn't on the server yet, one at a time.
      let failed = 0;
      for (const item of stagedRef.current.filter((s) => s.status !== "uploaded")) {
        patch(item.key, { status: "uploading", progress: 0, error: undefined });
        try {
          const created = await uploadWithProgress<Attachment>(`/knowledge/${noteId}/attachments`, item.file, item.file.name, (p) =>
            patch(item.key, { progress: p }),
          );
          uploadedIds.current.push(created.id);
          patch(item.key, { status: "uploaded", progress: 1 });
        } catch (error) {
          failed += 1;
          patch(item.key, { status: "failed", error: errorMessage(error) });
        }
      }

      if (failed) {
        // Stay here with everything intact; the form shows this message.
        throw new ApiError(
          0,
          `Your note was saved, but ${plural(failed, "file")} couldn't be uploaded. Click "Retry upload" to try again, remove ${failed === 1 ? "it" : "them"}, or open the note.`,
        );
      }

      const uploaded = stagedRef.current.length;
      toast.success(uploaded ? `Saved to your vault with ${plural(uploaded, "attachment")}` : "Saved to your vault");
      const autotext = addText && uploadedIds.current.length ? uploadedIds.current.join(",") : undefined;
      await router.push({ pathname: "/vault/[id]", query: autotext ? { id: noteId, autotext } : { id: noteId } });
    } finally {
      setSaving(false);
    }
  };

  if (!router.isReady) return null;

  const waiting = staged.filter((s) => s.status !== "uploaded").length;

  return (
    <>
      <Head>
        <title>New knowledge · EchoVault Nexus</title>
      </Head>
      <PageHeader title="Capture knowledge" breadcrumbs={[{ label: "Vault", href: "/vault" }, { label: "New item" }]} />

      {createdId && (
        <div role="status" className="alert alert-soft alert-success mb-4 text-sm">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          <span>
            Your note is saved.{" "}
            <Link href={`/vault/${createdId}`} className="link font-medium">
              Open it
            </Link>{" "}
            or retry the files below.
          </span>
        </div>
      )}

      <div className="surface p-5 sm:p-6">
        <KnowledgeForm
          submitLabel={createdId && waiting ? "Retry upload" : "Save to vault"}
          initial={{ project_id: isUuid(project) ? project : null }}
          onCancel={() => router.back()}
          extraDirty={waiting > 0}
          onSubmit={save}
        >
          <AttachmentPicker
            files={staged}
            rejections={rejections}
            maxFileBytes={maxFileBytes}
            maxFiles={maxFiles}
            locked={saving}
            onAdd={addFiles}
            onRemove={removeFile}
            onDismissRejections={() => setRejections([])}
          />
          {staged.length > 0 && (
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-primary checkbox-sm mt-0.5"
                checked={addText}
                onChange={(e) => setAddText(e.target.checked)}
                disabled={saving}
              />
              <span>
                <span className="font-medium">Put the text from these files into the note</span>
                <span className="text-muted block">
                  After saving, text read from screenshots and documents is added below your content automatically. It&apos;s searchable either way.
                </span>
              </span>
            </label>
          )}
        </KnowledgeForm>
      </div>
    </>
  );
};

NewKnowledgePage.getLayout = appLayout;
export default NewKnowledgePage;
