import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { DECISION_STATUSES } from "@/components/decisions/DecisionStatusBadge";
import { Field } from "@/components/ui/Field";
import { ProjectSelect } from "@/components/ui/ProjectSelect";
import { SaveStatus } from "@/components/ui/SaveStatus";
import { InlineError } from "@/components/ui/States";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { applyServerErrors } from "@/lib/forms";
import { decisionSchema, type DecisionValues } from "@/lib/schemas";

export type DecisionTextField = keyof Omit<DecisionValues, "title" | "project_id" | "status">;

export const DECISION_SECTIONS: { name: DecisionTextField; label: string; hint: string }[] = [
  { name: "context", label: "Context", hint: "What situation are you in? What constraints apply?" },
  { name: "problem", label: "Problem statement", hint: "What exactly needs deciding?" },
  { name: "alternatives", label: "Alternatives considered", hint: "Which options did you weigh? Their pros and cons." },
  { name: "decision", label: "Selected option", hint: "What did you choose?" },
  { name: "reasoning", label: "Reasoning", hint: "Why this option? What evidence or values drove it?" },
  { name: "expected_outcome", label: "Expected outcome", hint: "What do you expect to happen, and how will you know?" },
  { name: "actual_outcome", label: "Actual outcome / review", hint: "Come back later: what actually happened?" },
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
      problem: "",
      status: "accepted",
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
      <Field label="Title" error={errors.title?.message}>
        <input className="input w-full" placeholder="e.g. Use PostgreSQL for the main database" autoFocus={!initial?.title} {...register("title")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Status" error={errors.status?.message}>
          <select className="select w-full" {...register("status")}>
            {DECISION_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}: {s.hint}
              </option>
            ))}
          </select>
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
        <SaveStatus dirty={isDirty} saving={isSubmitting} existing={Boolean(initial?.title)} />
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
