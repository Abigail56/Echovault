import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Field } from "@/components/ui/Field";
import { SaveStatus } from "@/components/ui/SaveStatus";
import { InlineError } from "@/components/ui/States";
import { PROJECT_STATUSES } from "@/components/ui/StatusBadge";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { applyServerErrors } from "@/lib/forms";
import { projectSchema, type ProjectValues } from "@/lib/schemas";

interface ProjectFormProps {
  initial?: Partial<ProjectValues>;
  submitLabel: string;
  onSubmit: (values: ProjectValues) => Promise<void>;
  onCancel: () => void;
}

export function ProjectForm({ initial, submitLabel, onSubmit, onCancel }: ProjectFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: "", description: "", status: "active", ...initial },
  });
  useUnsavedChanges(isDirty && !isSubmitting);

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
      reset(values);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["name", "description", "status"]));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="surface flex flex-col gap-5 p-5 sm:p-6">
      <InlineError message={formError} />
      <Field label="Name" error={errors.name?.message}>
        <input className="input w-full" placeholder="e.g. Portfolio website" autoFocus={!initial?.name} {...register("name")} />
      </Field>
      <Field label="Description" optional error={errors.description?.message} hint="What is this project for? What does done look like?">
        <textarea className="textarea min-h-32 w-full" {...register("description")} />
      </Field>
      <Field label="Status" error={errors.status?.message}>
        <select className="select w-full sm:w-60" {...register("status")}>
          {PROJECT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="border-base-300 flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <SaveStatus dirty={isDirty} saving={isSubmitting} existing={Boolean(initial?.name)} />
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
