import { Skeleton } from "@/components/ui/skeleton";

export default function ShipmentsLoading() {
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-36" />
        ))}
      </div>
      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-11 w-full" />
        ))}
      </div>
    </div>
  );
}
