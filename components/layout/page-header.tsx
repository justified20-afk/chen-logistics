import type { ReactNode } from "react";
import { cn } from "cn";

export function PageHeader({
  title,
  description,
  actions,
  badge,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="heading truncate text-2xl font-semibold tracking-tight">{title}</h1>
          {badge}
        </div>
        {description ? (
          <div className="max-w-3xl text-sm text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
