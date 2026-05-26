"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";

import { SupplierCard, type SupplierStatus } from "@/components/SupplierCard";
import { SupplierCardSkeleton } from "@/components/SupplierCardSkeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { ApiClientError, getStock } from "@/lib/api";
import type { StockResponse } from "@/types";

interface UiError {
  code: string;
  message: string;
  status: number;
}

const validStatuses: SupplierStatus[] = ["SUCCESS", "TIMEOUT", "ERROR"];
const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

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
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const [error, setError] = useState<UiError | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("NAME_ASC");

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
    isMountedRef.current = true;
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

    if (!autoRefresh) {
      setSecondsRemaining(30);
      return;
    }

    autoRefreshTimerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          loadStock({ silent: true });
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
    };
  }, [autoRefresh, loadStock]);

  // Section 7.1 Counter Animation using easeOutExpo/quart logic
  useEffect(() => {
    if (!data) return;

    const target = data.total_stock ?? 0;
    const duration = 800; // Counter animation is 800ms
    const start = performance.now();
    let frameId = 0;

    const tick = (t: number) => {
      const elapsed = t - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      setAnimatedTotal(Math.round(target * eased));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [data]);

  const handleSyncNow = () => {
    setSecondsRemaining(30);
    loadStock();
  };

  const suppliers = data?.suppliers ?? [];
  const successSources = data?.successful_sources ?? 0;
  const failedSources = data?.failed_sources ?? 0;
  const totalSources = successSources + failedSources;

  // Filtered & Sorted suppliers
  const filteredAndSortedSuppliers = useMemo(() => {
    let result = [...suppliers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.supplier_name.toLowerCase().includes(q) ||
          (s.description ?? "").toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "ALL") {
      result = result.filter((s) => s.status === statusFilter);
    }

    result.sort((a, b) => {
      if (sortBy === "NAME_ASC") return a.supplier_name.localeCompare(b.supplier_name);
      if (sortBy === "NAME_DESC") return b.supplier_name.localeCompare(a.supplier_name);
      if (sortBy === "STOCK_DESC") return b.stock - a.stock;
      if (sortBy === "STOCK_ASC") return a.stock - b.stock;
      if (sortBy === "LATENCY_ASC") return a.latency_ms - b.latency_ms;
      if (sortBy === "LATENCY_DESC") return b.latency_ms - a.latency_ms;
      return 0;
    });

    return result;
  }, [suppliers, searchQuery, statusFilter, sortBy]);

  // Compute dynamic stats
  const averageLatency = useMemo(() => {
    const successItems = suppliers.filter((s) => s.status === "SUCCESS");
    if (successItems.length === 0) return 0;
    const sum = successItems.reduce((acc, s) => acc + s.latency_ms, 0);
    return Math.round(sum / successItems.length);
  }, [suppliers]);

  const healthScorePercent = useMemo(() => {
    if (totalSources === 0) return 0;
    return Math.round((successSources / totalSources) * 100);
  }, [successSources, totalSources]);

  // Map dynamic latency chart bars
  const chartBars = useMemo(() => {
    return suppliers.map((s) => {
      // Normalise height: 3500ms timeout threshold is 100% height limit
      const pct = Math.min((s.latency_ms / 3500) * 100, 100);
      return {
        name: s.supplier_name,
        latency: s.latency_ms,
        status: s.status,
        height: pct,
      };
    });
  }, [suppliers]);

  if (isLoading && !data) {
    return (
      <main className="min-h-screen bg-[#FAFAFA] p-6 lg:p-8">
        <div className="space-y-6 max-w-6xl mx-auto">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between border-b border-zinc-200 pb-5">
            <div className="space-y-2">
              <div className="h-7 w-48 rounded bg-zinc-200 animate-pulse" />
              <div className="h-4 w-64 rounded bg-zinc-200 animate-pulse" />
            </div>
            <div className="h-9 w-32 rounded-lg bg-zinc-200 animate-pulse" />
          </div>

          {/* Quick Stats Grid Skeleton */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl border border-zinc-200 bg-white p-5 animate-pulse" />
            ))}
          </div>

          {/* Filters Bar Skeleton */}
          <div className="h-14 rounded-xl border border-zinc-200 bg-white animate-pulse" />

          {/* Layout Columns Skeleton */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="h-80 rounded-xl border border-zinc-200 bg-white animate-pulse" />
            <div className="lg:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
              <SupplierCardSkeleton />
              <SupplierCardSkeleton />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="min-h-screen bg-[#FAFAFA] p-6 flex items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-white p-8 max-w-md shadow-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-650 mb-4 border border-red-200">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-zinc-950 font-display">Failed to load aggregated dashboard</h2>
          <p className="mt-2 text-sm text-zinc-500 leading-relaxed font-body">{error.message}</p>
          <Button type="button" onClick={handleSyncNow} className="mt-5 w-full bg-zinc-900 hover:bg-zinc-700 text-white font-medium rounded-lg">
            Retry Connection
          </Button>
        </div>
      </main>
    );
  }

  const totalStock = new Intl.NumberFormat("en-US").format(animatedTotal);
  const lastSyncedLabel = lastSyncedAt ? formatRelativeTime(lastSyncedAt, now) : "just now";

  return (
    <main className="min-h-screen bg-[#FAFAFA] p-6 lg:p-8">
      <div className="space-y-6 max-w-6xl mx-auto">
        
        {/* TOP BAR Header Controls (Section 3.1) */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
          <div>
            <h1 className="text-[28px] font-medium tracking-tight text-zinc-900 font-display">Command Center</h1>
            <p className="mt-0.5 text-sm text-zinc-500 font-body">Real-time stock aggregator overview</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto Refresh Switch Container */}
            <div
              className={`flex items-center gap-3 rounded-lg border px-3 py-1.5 transition-all duration-150 shadow-sm ${
                autoRefresh
                  ? "border-blue-200 bg-blue-50/70"
                  : "border-zinc-200 bg-zinc-50"
              }`}
            >
              <div className="flex flex-col">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${autoRefresh ? "text-blue-700" : "text-zinc-500"}`}>
                  Auto-refresh
                </span>
                {autoRefresh ? (
                  <span className="text-[10px] text-blue-500 font-medium">
                    Syncing in {secondsRemaining}s
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-400 font-medium">
                    Disabled
                  </span>
                )}
              </div>

              <div className="relative flex items-center gap-2">
                {autoRefresh && (
                  <div className="relative flex items-center justify-center w-5 h-5">
                    <svg className="w-5 h-5 transform -rotate-90">
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        className="text-blue-100"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        fill="transparent"
                      />
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        className="text-blue-600 transition-all duration-300 ease-linear"
                        strokeWidth="1.5"
                        strokeDasharray={2 * Math.PI * 8}
                        strokeDashoffset={(2 * Math.PI * 8) * (1 - secondsRemaining / 30)}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                      />
                    </svg>
                  </div>
                )}
                {/* Custom toggle with green option or standard checked */}
                <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              </div>
            </div>

            {/* Sync Now Button - styled as outline */}
            <Button
              type="button"
              onClick={handleSyncNow}
              disabled={isRefreshing}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-sm"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={`mr-1.5 h-3.5 w-3.5 text-zinc-500 ${isRefreshing ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
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

        {/* 4 Quick Stats Indicator Cards */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:border-zinc-300 transition-all duration-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 font-body">Total Aggregated Stock</p>
                <p className="mt-1 text-3xl font-semibold text-zinc-900 font-body tabular-nums leading-none">{totalStock}</p>
                <p className="mt-1.5 text-[11px] text-zinc-400 font-medium font-body">Synced {lastSyncedLabel}</p>
              </div>
              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:border-zinc-300 transition-all duration-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 font-body">Network Success Rate</p>
                <p className="mt-1 text-3xl font-semibold text-zinc-900 font-body tabular-nums leading-none">{healthScorePercent}%</p>
                <div className="mt-2.5 h-1.5 w-32 rounded-full bg-zinc-100 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${healthScorePercent}%` }} />
                </div>
              </div>
              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-green-50 border border-green-200 text-green-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:border-zinc-300 transition-all duration-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 font-body">Average Source Latency</p>
                <p className="mt-1 text-3xl font-semibold text-zinc-900 font-body tabular-nums leading-none">{averageLatency} ms</p>
                <p className="mt-1.5 text-[11px] text-zinc-400 font-medium font-body">Across active suppliers</p>
              </div>
              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-zinc-50 border border-zinc-100 text-zinc-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:border-zinc-300 transition-all duration-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 font-body">Supplier Integration</p>
                <p className="mt-1 text-3xl font-semibold text-zinc-900 font-body tabular-nums leading-none">{successSources} / {totalSources}</p>
                <p className="mt-1.5 text-[11px] text-zinc-450 font-medium font-body">{failedSources} failed source(s)</p>
              </div>
              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Unified Search, Sort, and Status Filter Bar */}
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-1.8 flex-1 max-w-sm focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 transition-all duration-150">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-450" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search suppliers name..."
                className="w-full bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400 font-body font-medium"
              />
            </div>

            {/* Sorting Select */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none rounded-lg border border-zinc-200 bg-white pl-4 pr-10 py-1.8 text-sm text-zinc-700 font-medium cursor-pointer outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all duration-150 font-body"
              >
                <option value="NAME_ASC">Name: A - Z</option>
                <option value="NAME_DESC">Name: Z - A</option>
                <option value="STOCK_DESC">Stock: High to Low</option>
                <option value="STOCK_ASC">Stock: Low to High</option>
                <option value="LATENCY_ASC">Latency: Fastest first</option>
                <option value="LATENCY_DESC">Latency: Slowest first</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                <svg className="h-4 w-4 text-zinc-450" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Status filter selection tabs (Section 5.8 pagination/tabs aesthetic) */}
          <div className="flex rounded-lg bg-zinc-100 p-1 border border-zinc-200/50">
            {["ALL", "SUCCESS", "TIMEOUT", "ERROR"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                  statusFilter === status
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </section>

        {/* Dynamic Latency Visual Chart & Supplier Cards Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Latency Health chart column (preserved grid layout) */}
          <section className="lg:col-span-1 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-900 font-body">Dynamic Latency Health</h2>
              <p className="text-xs text-zinc-450 mt-0.5 font-body">Real-time latency profiling chart (ms)</p>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="flex h-44 items-end gap-3 pt-6 border-b border-zinc-100 pb-2">
              {chartBars.map((bar, idx) => {
                let color = "bg-green-500 hover:bg-green-600";
                if (bar.status === "TIMEOUT") color = "bg-amber-500 hover:bg-amber-600";
                if (bar.status === "ERROR") color = "bg-red-500 hover:bg-red-600";

                return (
                  <div key={idx} className="group relative flex-1 flex flex-col items-center">
                    {/* Tooltip on hover */}
                    <div className="pointer-events-none absolute bottom-full mb-2 w-32 rounded-lg bg-zinc-900 px-2 py-1.5 text-center text-[10px] text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 z-10 leading-normal">
                      <p className="font-bold truncate">{bar.name}</p>
                      <p className="font-semibold text-blue-300 mt-0.5">{bar.latency} ms</p>
                      <p className="text-[9px] uppercase font-bold text-gray-400">{bar.status}</p>
                    </div>
                    
                    {/* The bar */}
                    <div 
                      className={`w-full rounded-t-md transition-all duration-150 cursor-pointer shadow-sm ${color}`} 
                      style={{ height: `${Math.max(bar.height, 4)}%` }} 
                    />
                    
                    {/* Label */}
                    <span className="mt-2 text-[9px] font-bold text-zinc-400 truncate w-full text-center font-body">
                      {bar.name.substring(0, 5)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-xs text-zinc-500 leading-normal space-y-1 font-body">
              <p className="font-semibold text-[11px] text-zinc-650">Throughput Average: 14.2 MB/s</p>
              {failedSources > 0 ? (
                <p className="text-red-600 flex items-center gap-1 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                  {failedSources} source(s) offline. Needs attention.
                </p>
              ) : (
                <p className="text-green-600 flex items-center gap-1 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  All sources operating normally.
                </p>
              )}
            </div>
          </section>

          {/* Supplier Cards grid column (preserved grid layout) */}
          <section className="lg:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredAndSortedSuppliers.length === 0 ? (
              <div className="col-span-full rounded-xl border border-zinc-200 border-dashed bg-white p-12 text-center shadow-sm">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 mb-3 border border-zinc-200">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-zinc-800 font-body">No matching suppliers</h3>
                <p className="mt-1 text-xs text-zinc-400 font-body">Try adjusting your filters or search keywords.</p>
              </div>
            ) : (
              filteredAndSortedSuppliers.map((supplier) => (
                <SupplierCard key={supplier.supplier_id} supplier={{ ...supplier, status: toSupplierStatus(supplier.status) }} />
              ))
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
