import { Skeleton } from "@/components/ui/skeleton";

export function SupplierCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          {/* Supplier Name skeleton */}
          <Skeleton className="h-5 w-36" />
          {/* Description skeleton */}
          <Skeleton className="h-3.5 w-48" />
        </div>
        {/* Badge skeleton */}
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Stock Count Skeleton */}
      <div className="mt-4 space-y-1">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>

      {/* Footer Skeleton */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3.5 w-28" />
      </div>
    </div>
  );
}
