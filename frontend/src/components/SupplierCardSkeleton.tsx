import { Skeleton } from "@/components/ui/skeleton";

export function SupplierCardSkeleton() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28 bg-zinc-200" />
        <Skeleton className="h-5 w-16 rounded-full bg-zinc-200" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-8 w-20 bg-zinc-200" />
        <Skeleton className="h-3 w-24 bg-zinc-200" />
      </div>
      <Skeleton className="mt-3 h-3 w-40 bg-zinc-200" />
    </div>
  );
}
