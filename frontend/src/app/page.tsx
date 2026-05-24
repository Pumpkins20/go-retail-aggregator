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
      <main className="min-h-screen px-4 pb-10 pt-24 md:px-8 md:pt-28 lg:px-10 lg:pt-10">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-600">Loading stock data...</p>
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
      <main className="min-h-screen px-4 pb-10 pt-24 md:px-8 md:pt-28 lg:px-10 lg:pt-10">
        <div className="mx-auto max-w-6xl rounded-lg border border-red-200 bg-red-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-red-800">Failed to load stock</h2>
          <p className="mt-1 text-sm text-red-700">{error.message}</p>
          <p className="mt-2 text-xs text-red-600">
            Error code: {error.code} | HTTP status: {error.status}
          </p>
        </div>
      </main>
    );
  }

  const suppliers = data?.suppliers ?? [];

  return (
    <main className="min-h-screen px-4 pb-10 pt-24 md:px-8 md:pt-28 lg:px-10 lg:pt-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="font-serif text-2xl text-zinc-900">Retail Command Center</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Total stock: <span className="font-semibold text-zinc-900">{data?.total_stock ?? 0}</span> | Success:{" "}
            {data?.successful_sources ?? 0} | Failed: {data?.failed_sources ?? 0}
          </p>
          {data?.warning ? <p className="mt-2 text-sm text-amber-700">Warning: {data.warning}</p> : null}
        </header>

        {suppliers.length === 0 ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <h2 className="font-serif text-xl text-zinc-900">No active suppliers</h2>
            <p className="mt-2 text-sm text-zinc-600">
              No active suppliers. Go to Supplier Management to add one.
            </p>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((supplier) => (
              <SupplierCard
                key={supplier.supplier_id}
                supplier={{
                  ...supplier,
                  status: toSupplierStatus(supplier.status),
                }}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
