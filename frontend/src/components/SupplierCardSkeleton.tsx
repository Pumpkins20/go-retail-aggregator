import { Skeleton } from "@/components/ui/skeleton";

export function SupplierCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-5 shadow-soft backdrop-blur">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="mt-3 h-3 w-40" />
    </div>
  );
}
