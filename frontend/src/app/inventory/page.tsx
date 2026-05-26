"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApiClientError, getStock } from "@/lib/api";
import type { StockResponse } from "@/types";

interface UiError {
  code: string;
  message: string;
  status: number;
}

// Master product template catalog
const catalogTemplates = [
  { sku: "FNB-IND-01", name: "Indomie Goreng Spesial Pack", category: "Food & Beverage", ratio: 0.4 },
  { sku: "FNB-ULT-02", name: "Ultra Milk Chocolate 1L", category: "Food & Beverage", ratio: 0.6 },
  { sku: "PCA-PEP-03", name: "Pepsodent Action 123 190g", category: "Personal Care", ratio: 0.35 },
  { sku: "PCA-LIF-04", name: "Lifebuoy Mild Care Soap 450ml", category: "Personal Care", ratio: 0.65 },
  { sku: "ELC-SAM-05", name: "Samsung Galaxy A55 5G 8/256", category: "Electronics", ratio: 0.2 },
  { sku: "ELC-XIA-06", name: "Xiaomi Smart Band 8 Active", category: "Electronics", ratio: 0.8 },
  { sku: "HSD-RIN-07", name: "Rinso Liquid Detergent 750ml", category: "Household", ratio: 0.5 },
  { sku: "HSD-SOK-08", name: "Soklin Pemutih Botol 500ml", category: "Household", ratio: 0.5 },
];

export default function InventoryPage() {
  const [data, setData] = useState<StockResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [originFilter, setOriginFilter] = useState("ALL");

  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);

  const loadStock = useCallback(async (options?: { silent?: boolean }) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!options?.silent) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await getStock();
      if (!isMountedRef.current) return;
      setData(response);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      if (err instanceof ApiClientError) {
        setError({ code: err.code, message: err.message, status: err.status });
      } else {
        setError({ code: "UNKNOWN_ERROR", message: "Unexpected error occurred.", status: 500 });
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadStock();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadStock]);

  const handleSyncAll = () => {
    loadStock();
    toast.success("Inventory re-aggregated successfully.");
  };

  const suppliers = data?.suppliers ?? [];

  const lastSyncedLabel = useMemo(() => {
    if (!data?.fetched_at) return "never";
    const date = new Date(data.fetched_at);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }, [data]);

  // Generate dynamic product catalog items based on live supplier fetch status
  const aggregatedProducts = useMemo(() => {
    const productsList: Array<{
      sku: string;
      name: string;
      category: string;
      stock: number;
      supplierId: string;
      supplierName: string;
      status: string;
      latency: number;
    }> = [];

    suppliers.forEach((sup, index) => {
      // Allocate 2 distinct items from template catalog to each supplier
      const idx1 = (index * 2) % catalogTemplates.length;
      const idx2 = (index * 2 + 1) % catalogTemplates.length;
      const t1 = catalogTemplates[idx1];
      const t2 = catalogTemplates[idx2];

      if (!t1 || !t2) return;

      const isSuccess = sup.status === "SUCCESS";
      
      productsList.push({
        sku: t1.sku,
        name: t1.name,
        category: t1.category,
        stock: isSuccess ? Math.floor(sup.stock * t1.ratio) : 0,
        supplierId: sup.supplier_id,
        supplierName: sup.supplier_name,
        status: sup.status,
        latency: sup.latency_ms,
      });

      productsList.push({
        sku: t2.sku,
        name: t2.name,
        category: t2.category,
        stock: isSuccess ? Math.round(sup.stock * t2.ratio) : 0,
        supplierId: sup.supplier_id,
        supplierName: sup.supplier_name,
        status: sup.status,
        latency: sup.latency_ms,
      });
    });

    return productsList;
  }, [suppliers]);

  // Categories list computed from active list
  const categories = useMemo(() => {
    const set = new Set(catalogTemplates.map((p) => p.category));
    return ["ALL", ...Array.from(set)];
  }, []);

  // Filter products by search query, category, and supplier origin
  const filteredProducts = useMemo(() => {
    return aggregatedProducts.filter((product) => {
      const matchQuery =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCategory = categoryFilter === "ALL" || product.category === categoryFilter;
      const matchOrigin = originFilter === "ALL" || product.supplierId === originFilter;

      return matchQuery && matchCategory && matchOrigin;
    });
  }, [aggregatedProducts, searchQuery, categoryFilter, originFilter]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#FAFAFA] p-6 lg:p-8">
        <div className="space-y-6 max-w-6xl mx-auto">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between border-b border-zinc-200 pb-5">
            <div className="space-y-2">
              <div className="h-7 w-48 rounded bg-zinc-200 animate-pulse" />
              <div className="h-4 w-64 rounded bg-zinc-200 animate-pulse" />
            </div>
            <div className="h-9 w-36 rounded-lg bg-zinc-200 animate-pulse" />
          </div>

          <div className="h-14 rounded-xl border border-zinc-200 bg-white animate-pulse" />
          <div className="h-96 rounded-xl border border-zinc-200 bg-white animate-pulse" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#FAFAFA] p-6 flex items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-white p-8 max-w-md shadow-sm text-center">
          <h2 className="text-lg font-medium text-zinc-950 font-display">Failed to aggregate inventory</h2>
          <p className="mt-2 text-sm text-zinc-500 font-body">{error.message}</p>
          <Button type="button" onClick={() => loadStock()} className="mt-5 w-full bg-zinc-900 hover:bg-zinc-700 text-white rounded-lg px-6 font-body text-xs font-semibold h-9 shadow-sm">
            Retry Aggregation
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] p-6 lg:p-8">
      <div className="space-y-6 max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
          <div>
            <h1 className="text-[28px] font-medium tracking-tight text-zinc-900 font-display">Aggregated Inventory</h1>
            <p className="mt-0.5 text-sm text-zinc-500 font-body">Consolidated product stock tracking across active suppliers</p>
          </div>
          <Button
            type="button"
            onClick={handleSyncAll}
            disabled={isRefreshing}
            className="h-9 rounded-lg border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-sm font-body"
          >
            {isRefreshing ? "Syncing..." : "Sync All Inventory"}
          </Button>
        </header>

        {/* Filters Controls */}
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm grid gap-4 md:grid-cols-3">
          {/* Product Search */}
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-1.8 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 transition-all duration-150">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Product Name or SKU..."
              className="w-full bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400 font-body font-medium"
            />
          </div>

          {/* Category Select */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-4 pr-10 py-1.8 h-9 text-sm text-zinc-700 font-medium cursor-pointer outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all duration-150 font-body"
            >
              <option value="ALL">All Categories</option>
              {categories.filter(c => c !== "ALL").map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
              <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Origin Supplier Select */}
          <div className="relative">
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              className="w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-4 pr-10 py-1.8 h-9 text-sm text-zinc-700 font-medium cursor-pointer outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm transition-all duration-150 font-body"
            >
              <option value="ALL">All Supplier Origins</option>
              {suppliers.map((sup) => (
                <option key={sup.supplier_id} value={sup.supplier_id}>{sup.supplier_name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
              <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </section>

        {/* Aggregation Products Table */}
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-3.5 font-body">SKU</th>
                  <th className="px-6 py-3.5 font-body">Product Name</th>
                  <th className="px-6 py-3.5 font-body">Category</th>
                  <th className="px-6 py-3.5 text-center font-body">Stock Level</th>
                  <th className="px-6 py-3.5 font-body">Supplier Origin</th>
                  <th className="px-6 py-3.5 font-body">Source Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 font-body">
                      No products aggregated matching your selected filter guidelines.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product, idx) => {
                    const isSuccess = product.status === "SUCCESS";
                    const isTimeout = product.status === "TIMEOUT";
                    const isError = product.status === "ERROR";
                    const isLowStock = isSuccess && product.stock < 50;

                    return (
                      <tr key={idx} className="hover:bg-zinc-50/40 transition-colors duration-100 text-zinc-800">
                        <td className="px-6 py-4 font-bold text-zinc-800 font-mono text-xs">{product.sku}</td>
                        <td className="px-6 py-4">
                          <p className="text-zinc-900 font-semibold font-body">{product.name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="bg-zinc-100/80 text-zinc-650 border-zinc-200/50 text-[10px] font-medium font-body">
                            {product.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {!isSuccess ? (
                            <span className="text-zinc-300 font-bold font-mono">—</span>
                          ) : (
                            <span className={`text-sm font-semibold font-mono tabular-nums ${isLowStock ? "text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200" : "text-zinc-900"}`}>
                              {product.stock.toLocaleString("en-US")}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-zinc-600 font-body">{product.supplierName}</td>
                        <td className="px-6 py-4 font-body">
                          {isSuccess && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              ONLINE ({product.latency} ms)
                            </span>
                          )}
                          {isTimeout && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              TIMEOUT
                            </span>
                          )}
                          {isError && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                              OFFLINE
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-xs text-zinc-450 font-semibold px-2 font-body">
            <span>Showing {filteredProducts.length} items aggregated</span>
            <span>Last checked: {lastSyncedLabel}</span>
          </div>
        </section>
      </div>
    </main>
  );
}
