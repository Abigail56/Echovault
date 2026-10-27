import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { ApiError, errorMessage } from "@/lib/api/client";

/**
 * Show backend validation errors next to the matching form fields.
 * Returns a general message for anything that isn't tied to a field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
): string | null {
  if (error instanceof ApiError && Object.keys(error.fieldErrors).length) {
    let unmatched = false;
    for (const [field, message] of Object.entries(error.fieldErrors)) {
      if (fields.includes(field)) setError(field as Path<T>, { type: "server", message });
      else unmatched = true;
    }
    return unmatched ? error.message : null;
  }
  return errorMessage(error);
}

/** Only allow redirects to paths inside this app (prevents open redirects). */
export function safeNextPath(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
