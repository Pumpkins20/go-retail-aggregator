"use client";

import { useEffect, useState } from "react";

import { SupplierCard, type SupplierStatus } from "@/components/SupplierCard";
import { SupplierCardSkeleton } from "@/components/SupplierCardSkeleton";
import { ApiClientError, getStock } from "@/lib/api";
import type { StockResponse } from "@/types";

interface UiError {
  code: string;
  message: string;
  status: number;
}

const validStatuses: SupplierStatus[] = ["SUCCESS", "TIMEOUT", "ERROR"];

function toSupplierStatus(status: string): SupplierStatus {
  return validStatuses.includes(status as SupplierStatus)
    ? (status as SupplierStatus)
    : "ERROR";
}

export default function Dashboard() {
  const [data, setData] = useState<StockResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<UiError | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStock() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getStock();
        if (!isMounted) return;
        setData(response);
      } catch (err: unknown) {
        if (!isMounted) return;

        if (err instanceof ApiClientError) {
          setError({ code: err.code, message: err.message, status: err.status });
          return;
        }

        setError({ code: "UNKNOWN_ERROR", message: "Unexpected error occurred.", status: 500 });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadStock();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    const skeletonCount = data?.suppliers?.length || 4;

    return (
      <main className="min-h-screen px-4 pb-12 pt-24 md:px-6 md:pt-28 lg:px-10 lg:pt-12">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="rounded-2xl border border-border/60 bg-card/70 p-6 shadow-soft backdrop-blur">
            <p className="text-sm text-muted-foreground">Loading stock data...</p>
          </header>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: skeletonCount }).map((_, idx) => (
              <SupplierCardSkeleton key={idx} />
            ))}
          </section>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen px-4 pb-12 pt-24 md:px-6 md:pt-28 lg:px-10 lg:pt-12">
        <div className="mx-auto max-w-6xl rounded-2xl border border-destructive/30 bg-destructive/10 p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-destructive">Failed to load stock</h2>
          <p className="mt-2 text-sm text-destructive/80">{error.message}</p>
          <p className="mt-3 text-xs text-destructive/70">
            Error code: {error.code} | HTTP status: {error.status}
          </p>
        </div>
      </main>
    );
  }

  const suppliers = data?.suppliers ?? [];
  const totalStock = new Intl.NumberFormat("id-ID").format(data?.total_stock ?? 0);
  const successSources = data?.successful_sources ?? 0;
  const failedSources = data?.failed_sources ?? 0;
  const totalSources = successSources + failedSources;
  const successRate = totalSources ? Math.round((successSources / totalSources) * 100) : 0;
  const fetchedAtLabel = data?.fetched_at
    ? new Date(data.fetched_at).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "-";

  return (
    <main className="min-h-screen px-4 pb-12 pt-24 md:px-6 md:pt-28 lg:px-10 lg:pt-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-6 shadow-soft backdrop-blur">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,hsl(var(--accent)/0.5),transparent_55%)]"
          />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
              Retail Command Center
            </p>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Total Stock</p>
                <h1 className="mt-2 text-5xl font-semibold leading-none text-foreground md:text-6xl">
                  {totalStock}
                </h1>
                <p className="mt-3 text-sm text-muted-foreground">
                  {successSources} success sources | {failedSources} failed sources
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-xs text-muted-foreground">
                <p className="text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">Last Sync</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{fetchedAtLabel}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Success Rate</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{successRate}%</p>
                <p className="mt-1 text-xs text-muted-foreground">Overall availability</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Active Sources</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{suppliers.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Suppliers reporting now</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Health Signal</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {failedSources === 0 ? "Stable" : "Attention"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {failedSources === 0
                    ? "All suppliers are within expected thresholds."
                    : "Monitor latency spikes and retry counts."}
                </p>
              </div>
            </div>

            {data?.warning ? (
              <div className="mt-5 rounded-xl border border-amber-200/70 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
                Warning: {data.warning}
              </div>
            ) : null}
          </div>
        </header>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Supplier Signals</h2>
              <p className="text-sm text-muted-foreground">
                Real-time status across all active suppliers.
              </p>
            </div>
            <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
              {suppliers.length} suppliers
            </span>
          </div>

          {suppliers.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card/70 p-8 text-center shadow-soft backdrop-blur">
              <h2 className="font-serif text-xl text-foreground">No active suppliers</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                No active suppliers. Go to Supplier Management to add one.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.supplier_id}
                  supplier={{
                    ...supplier,
                    status: toSupplierStatus(supplier.status),
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
