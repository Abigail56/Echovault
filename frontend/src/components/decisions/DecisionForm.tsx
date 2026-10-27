import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Field } from "@/components/ui/Field";
import { ProjectSelect } from "@/components/ui/ProjectSelect";
import { InlineError } from "@/components/ui/States";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { applyServerErrors } from "@/lib/forms";
import { decisionSchema, type DecisionValues } from "@/lib/schemas";

export const DECISION_SECTIONS: { name: keyof Omit<DecisionValues, "title" | "project_id">; label: string; hint: string }[] = [
  { name: "context", label: "Context", hint: "What problem or situation led to this decision?" },
  { name: "decision", label: "Decision", hint: "What did you decide to do?" },
  { name: "reasoning", label: "Reasoning", hint: "Why this option? What evidence or values drove it?" },
  { name: "alternatives", label: "Alternatives considered", hint: "What else did you consider, and why not those?" },
  { name: "expected_outcome", label: "Expected outcome", hint: "What do you expect to happen?" },
  { name: "actual_outcome", label: "Actual outcome / review notes", hint: "Come back later: what actually happened?" },
];

interface DecisionFormProps {
  initial?: Partial<DecisionValues>;
  submitLabel: string;
  onSubmit: (values: DecisionValues) => Promise<void>;
  onCancel: () => void;
}

export function DecisionForm({ initial, submitLabel, onSubmit, onCancel }: DecisionFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DecisionValues>({
    resolver: zodResolver(decisionSchema),
    defaultValues: {
      title: "",
      context: "",
      decision: "",
      reasoning: "",
      alternatives: "",
      expected_outcome: "",
      actual_outcome: "",
      project_id: null,
      ...initial,
    },
  });
  useUnsavedChanges(isDirty && !isSubmitting);

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
      reset(values);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ["title", "project_id", ...DECISION_SECTIONS.map((s) => s.name)]));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <InlineError message={formError} />
      <div className="grid gap-5 sm:grid-cols-[1fr_16rem]">
        <Field label="Title" error={errors.title?.message}>
          <input className="input w-full" placeholder="e.g. Use PostgreSQL for the main database" autoFocus={!initial?.title} {...register("title")} />
        </Field>
        <Field label="Project" optional error={errors.project_id?.message}>
          {(props) => (
            <Controller control={control} name="project_id" render={({ field }) => <ProjectSelect {...props} value={field.value} onChange={field.onChange} />} />
          )}
        </Field>
      </div>
      {DECISION_SECTIONS.map((section) => (
        <Field key={section.name} label={section.label} optional error={errors[section.name]?.message} hint={section.hint}>
          <textarea className="textarea min-h-24 w-full" {...register(section.name)} />
        </Field>
      ))}
      <div className="border-base-300 flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
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
