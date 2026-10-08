import { cn } from "cn";

export type LogoSize = "sm" | "md" | "lg";
export type LogoVariant = "default" | "onPrimary";

const SIZES: Record<LogoSize, { mark: string; descriptor: string }> = {
  sm: { mark: "text-lg", descriptor: "text-[0.58rem]" },
  md: { mark: "text-[1.45rem]", descriptor: "text-[0.66rem]" },
  lg: { mark: "text-3xl", descriptor: "text-[0.8rem]" },
};

/**
 * Chen Logistics wordmark — a two-line stacked lockup.
 *
 *   CHEN        bold, prominent, carries the visual weight
 *   logistics   smaller, lightweight descriptor in the brand accent
 *
 * The lines are vertically stacked and left-aligned so the lockup holds
 * together at any size. Use `variant="onPrimary"` on dark brand surfaces.
 */
export function ChenLogo({
  className,
  size = "md",
  variant = "default",
}: {
  className?: string;
  size?: LogoSize;
  variant?: "default" | "onPrimary";
}) {
  const s = SIZES[size];
  return (
    <span
      className={cn("inline-flex select-none flex-col items-start leading-none", className)}
      aria-hidden="false"
    >
      <span
        className={cn(
          "font-extrabold tracking-tight",
          s.mark,
          variant === "onPrimary" ? "text-primary-foreground" : "text-foreground",
        )}
      >
        CHEN
      </span>
      <span
        className={cn(
          "mt-1 font-light lowercase tracking-[0.42em]",
          s.descriptor,
          variant === "onPrimary" ? "text-amber-300" : "text-brand",
        )}
      >
        logistics
      </span>
    </span>
  );
}
