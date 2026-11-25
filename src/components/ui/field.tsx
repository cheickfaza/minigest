import { CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

interface FieldProps {
  id: string;
  label: React.ReactNode;
  required?: boolean;
  optionalLabel?: string;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  /** Receives the ARIA attributes that must be spread on the form control. */
  children: (aria: {
    id: string;
    "aria-invalid"?: true;
    "aria-describedby"?: string;
    "aria-required"?: true;
  }) => React.ReactNode;
}

/**
 * Accessible form field (WCAG 1.3.1, 3.3.1, 3.3.2): visible label bound to
 * the control, hint and error message referenced by aria-describedby.
 */
export function Field({ id, label, required, optionalLabel, hint, error, className, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required ? (
          <span aria-hidden="true" className="ms-0.5 text-danger">
            *
          </span>
        ) : optionalLabel ? (
          <span className="ms-1.5 text-xs font-normal text-muted-foreground">({optionalLabel})</span>
        ) : null}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        "aria-required": required ? true : undefined,
      })}
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
