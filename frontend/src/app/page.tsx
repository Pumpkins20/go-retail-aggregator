"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { SupplierCard, type SupplierStatus } from "@/components/SupplierCard";
import { SupplierCardSkeleton } from "@/components/SupplierCardSkeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ApiClientError, getStock } from "@/lib/api";
import type { StockResponse } from "@/types";

interface UiError {
  code: string;
  message: string;
  status: number;
}

const validStatuses: SupplierStatus[] = ["SUCCESS", "TIMEOUT", "ERROR"];
const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const healthBars = [40, 28, 56, 36, 64, 20, 42, 30];

function formatRelativeTime(date: Date, now: number) {
  const diffSeconds = Math.round((date.getTime() - now) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) return relativeTimeFormatter.format(diffSeconds, "second");

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) return relativeTimeFormatter.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  return relativeTimeFormatter.format(diffHours, "hour");
}

function toSupplierStatus(status: string): SupplierStatus {
  return validStatuses.includes(status as SupplierStatus) ? (status as SupplierStatus) : "ERROR";
}

export default function Dashboard() {
  const [data, setData] = useState<StockResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const [error, setError] = useState<UiError | null>(null);

  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);
  const autoRefreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (autoRefreshTimerRef.current) clearInterval(autoRefreshTimerRef.current);
    };
  }, []);

  const loadStock = useCallback(
    async (options?: { silent?: boolean }) => {
      if (isFetchingRef.current) return;

      const isInitial = !hasLoadedOnceRef.current;
      isFetchingRef.current = true;

      if (isInitial) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsRefreshing(true);
      }

      try {
        const response = await getStock();
        if (!isMountedRef.current) return;

        setData(response);
        setLastSyncedAt(response?.fetched_at ? new Date(response.fetched_at) : new Date());
      } catch (err: unknown) {
        if (!isMountedRef.current) return;

        if (isInitial) {
          if (err instanceof ApiClientError) {
            setError({ code: err.code, message: err.message, status: err.status });
          } else {
            setError({ code: "UNKNOWN_ERROR", message: "Unexpected error occurred.", status: 500 });
          }
          return;
        }

        if (!options?.silent) {
          toast.error(err instanceof ApiClientError ? err.message : "Failed to refresh stock data.");
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
        hasLoadedOnceRef.current = true;
        isFetchingRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  useEffect(() => {
    if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }

    if (!autoRefresh) return;

    autoRefreshTimerRef.current = setInterval(() => {
      loadStock({ silent: true });
    }, 30000);

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
    };
  }, [autoRefresh, loadStock]);

  useEffect(() => {
    if (!data) return;

    const target = data.total_stock ?? 0;
    const duration = 700;
    const start = performance.now();
    let frameId = 0;

    const tick = (t: number) => {
      const progress = Math.min((t - start) / duration, 1);
      setAnimatedTotal(Math.round(target * progress));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [data]);

  const handleSyncNow = () => {
    loadStock();
  };

  if (isLoading && !data) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="space-y-4">
          <SupplierCardSkeleton />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SupplierCardSkeleton />
            <SupplierCardSkeleton />
            <SupplierCardSkeleton />
            <SupplierCardSkeleton />
          </div>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="rounded-lg border border-red-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-red-700">Failed to load dashboard</h2>
          <p className="mt-2 text-sm text-red-600">{error.message}</p>
        </div>
      </main>
    );
  }

  const suppliers = data?.suppliers ?? [];
  const successSources = data?.successful_sources ?? 0;
  const failedSources = data?.failed_sources ?? 0;
  const totalSources = successSources + failedSources;
  const totalStock = new Intl.NumberFormat("en-US").format(animatedTotal);
  const lastSyncedLabel = lastSyncedAt ? formatRelativeTime(lastSyncedAt, now) : "just now";

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="space-y-6">
        <header className="flex items-center justify-between border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-semibold text-blue-700">Dashboard</h1>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors ${
                autoRefresh ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-100"
              }`}
            >
              <span className={`text-xs ${autoRefresh ? "text-blue-700" : "text-gray-600"}`}>
                Auto-refresh
              </span>
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            </div>

            <Button
              type="button"
              onClick={handleSyncNow}
              disabled={isRefreshing}
              className="h-8 rounded-md border border-blue-600 bg-white px-3 text-xs font-medium text-blue-600 hover:bg-blue-50"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={`mr-1.5 h-3.5 w-3.5 text-blue-600 ${isRefreshing ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-3.2-6.9" />
                <path d="M21 4v6h-6" />
              </svg>
              {isRefreshing ? "Syncing..." : "Sync All"}
            </Button>
          </div>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Total Inventory</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <p className="font-serif text-6xl leading-none text-gray-900">{totalStock}</p>
            <div className="pb-2 text-sm text-gray-600">
              <p>
                {successSources} of {totalSources} sources online
              </p>
              <p className="text-xs text-gray-400">Last synced {lastSyncedLabel}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {suppliers.map((supplier) => (
            <SupplierCard key={supplier.supplier_id} supplier={{ ...supplier, status: toSupplierStatus(supplier.status) }} />
          ))}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Network Health</h2>
            <div className="flex gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>
          </div>

          <div className="flex h-36 items-end gap-1.5">
            {healthBars.map((bar, idx) => (
              <div key={idx} className="flex-1 rounded-sm bg-blue-100" style={{ height: `${bar}%` }} />
            ))}
          </div>

          <p className="mt-3 text-xs text-gray-400">Sync throughput averaged 14.2 MB/s over last 24h.</p>
          {failedSources > 0 ? (
            <p className="mt-2 text-xs text-red-500">{failedSources} source(s) need attention.</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
