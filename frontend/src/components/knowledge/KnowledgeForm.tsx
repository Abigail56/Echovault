import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, PencilLine } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { RelatedNotesPicker } from "@/components/knowledge/RelatedNotesPicker";
import { Field } from "@/components/ui/Field";
import { Markdown } from "@/components/ui/Markdown";
import { ProjectSelect } from "@/components/ui/ProjectSelect";
import { SaveStatus } from "@/components/ui/SaveStatus";
import { InlineError } from "@/components/ui/States";
import { TagInput } from "@/components/ui/TagInput";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import type { KnowledgeRef } from "@/lib/api/types";
import { applyServerErrors } from "@/lib/forms";
import { knowledgeSchema, type KnowledgeValues } from "@/lib/schemas";

interface KnowledgeFormProps {
  initial?: Partial<KnowledgeValues>;
  /** Set when editing an existing note. */
  noteId?: string;
  initialRelated?: KnowledgeRef[];
  submitLabel: string;
  onSubmit: (values: KnowledgeValues) => Promise<void>;
  onCancel: () => void;
}

export function KnowledgeForm({ initial, noteId, initialRelated, submitLabel, onSubmit, onCancel }: KnowledgeFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<KnowledgeValues>({
    resolver: zodResolver(knowledgeSchema),
    defaultValues: { title: "", content: "", tags: [], project_id: null, related_ids: [], ...initial },
  });
  useUnsavedChanges(isDirty && !isSubmitting);
  const content = useWatch({ control, name: "content" });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
      reset(values); // clears the "unsaved changes" state
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["title", "content", "tags", "project_id"]));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <InlineError message={formError} />
      <Field label="Title" error={errors.title?.message}>
        <input className="input input-lg w-full font-semibold" placeholder="What is this about?" autoFocus={!initial?.title} {...register("title")} />
      </Field>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="knowledge-content" className="text-sm font-medium">
            Content <span className="text-muted font-normal">(Markdown)</span>
          </label>
          <div role="tablist" aria-label="Editor mode" className="tabs tabs-box tabs-xs shrink-0 flex-nowrap">
            <button type="button" role="tab" aria-selected={!preview} className={`tab gap-1 ${!preview ? "tab-active" : ""}`} onClick={() => setPreview(false)}>
              <PencilLine className="size-3" aria-hidden /> Write
            </button>
            <button type="button" role="tab" aria-selected={preview} className={`tab gap-1 ${preview ? "tab-active" : ""}`} onClick={() => setPreview(true)}>
              <Eye className="size-3" aria-hidden /> Preview
            </button>
          </div>
        </div>
        {preview ? (
          <div className="surface min-h-72 p-4">
            {content.trim() ? <Markdown>{content}</Markdown> : <p className="text-muted text-sm">Nothing to preview yet.</p>}
          </div>
        ) : (
          <textarea
            id="knowledge-content"
            className="textarea min-h-72 w-full font-mono text-sm leading-relaxed"
            placeholder={"Write your notes here.\n\n# Headings, - lists, **bold** and `code` are supported."}
            aria-invalid={errors.content ? true : undefined}
            {...register("content")}
          />
        )}
        {errors.content && <p className="text-error text-xs">{errors.content.message}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tags" optional error={errors.tags?.message} hint="Press Enter or comma after each tag.">
          {(props) => (
            <Controller control={control} name="tags" render={({ field }) => <TagInput {...props} value={field.value} onChange={field.onChange} />} />
          )}
        </Field>
        <Field label="Project" optional error={errors.project_id?.message}>
          {(props) => (
            <Controller control={control} name="project_id" render={({ field }) => <ProjectSelect {...props} value={field.value} onChange={field.onChange} />} />
          )}
        </Field>
      </div>

      <Field label="Related notes" optional error={errors.related_ids?.message} hint="Links work both ways: the other note will show this one too.">
        {(props) => (
          <Controller
            control={control}
            name="related_ids"
            render={({ field }) => (
              <RelatedNotesPicker {...props} currentId={noteId} initialRefs={initialRelated} value={field.value} onChange={field.onChange} />
            )}
          />
        )}
      </Field>

      <div className="border-base-300 flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <SaveStatus dirty={isDirty} saving={isSubmitting} existing={Boolean(noteId)} />
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting && <span className="loading loading-spinner loading-xs" aria-hidden />}
          {isSubmitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
