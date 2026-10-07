import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "cn";
import { Label } from "@/components/ui/label";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
  id,
}: {
  label: string;
  htmlFor?: string;
  error?: string | string[];
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const errorId = `${id ?? htmlFor ?? "field"}-error`;
  const hintId = `${id ?? htmlFor ?? "field"}-hint`;
  const message = Array.isArray(error) ? error[0] : error;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="flex items-center gap-1 text-sm">
        {label}
        {required ? (
          <span aria-hidden className="text-danger">
            *
          </span>
        ) : null}
      </Label>
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {children}
      {message ? (
        <p id={errorId} role="alert" className="flex items-start gap-1 text-xs font-medium text-danger">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
    >
      {message}
    </p>
  );
}
