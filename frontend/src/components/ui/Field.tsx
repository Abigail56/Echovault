import { cloneElement, isValidElement, type ReactElement, type ReactNode, useId } from "react";

export interface ControlProps {
  id: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  /**
   * A single input/textarea/select (it receives id and aria attributes), or a
   * function that receives them — use that when the control is wrapped, e.g.
   * in react-hook-form's <Controller>, so the label still points at it.
   */
  children: ReactElement<Record<string, unknown>> | ((props: ControlProps) => ReactNode);
}

/** Label + control + hint/error, wired up for screen readers. */
export function Field({ label, error, hint, optional, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const controlProps: ControlProps = { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy };
  const control =
    typeof children === "function"
      ? children(controlProps)
      : isValidElement(children)
        ? cloneElement(children, { ...controlProps })
        : children;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {optional && <span className="text-muted font-normal"> (optional)</span>}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-meta">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-error text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
