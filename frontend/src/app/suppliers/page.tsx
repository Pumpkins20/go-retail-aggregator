"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  ApiClientError,
  createSupplier,
  deleteSupplier,
  getExportCSVUrl,
  getSuppliers,
  toggleSupplier,
  updateSupplier,
} from "@/lib/api";
import type { PaginationMeta, Supplier, SupplierPayload } from "@/types";

interface UiError {
  code?: string;
  message: string;
  status?: number;
}

type SupplierFormState = {
  name: string;
  description: string;
  endpoint_url: string;
  auth_type: string;
  auth_token: string;
  timeout_ms: number;
  is_active: boolean;
  mock_behavior: string;
  display_order: number;
};

type FormErrors = Partial<Record<keyof SupplierFormState, string>>;

const PAGE_SIZE = 20;

const behaviorLabels: Record<string, string> = {
  success: "Success",
  random_error: "Random Error",
  timeout: "Timeout",
};

const defaultFormState: SupplierFormState = {
  name: "",
  description: "",
  endpoint_url: "",
  auth_type: "none",
  auth_token: "",
  timeout_ms: 2000,
  is_active: true,
  mock_behavior: "success",
  display_order: 0,
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizePayload(values: SupplierFormState): SupplierPayload {
  return {
    name: values.name.trim(),
    description: values.description.trim() ? values.description.trim() : null,
    endpoint_url: values.endpoint_url.trim(),
    auth_type: values.auth_type,
    auth_token: values.auth_token.trim() ? values.auth_token.trim() : null,
    timeout_ms: values.timeout_ms,
    is_active: values.is_active,
    mock_behavior: values.mock_behavior,
    display_order: values.display_order,
  };
}

function validateForm(values: SupplierFormState): FormErrors {
  const errors: FormErrors = {};

  if (!values.name.trim()) {
    errors.name = "Supplier name is required";
  } else if (values.name.trim().length < 3) {
    errors.name = "Supplier name must be at least 3 characters";
  }

  if (!values.endpoint_url.trim()) {
    errors.endpoint_url = "Endpoint URL is required";
  } else if (!isValidUrl(values.endpoint_url.trim())) {
    errors.endpoint_url = "Endpoint URL must be a valid http/https URL";
  }

  if (values.timeout_ms < 500 || values.timeout_ms > 10000) {
    errors.timeout_ms = "Timeout must be between 500 and 10000 ms";
  }

  if (values.display_order < 0) {
    errors.display_order = "Display order must be 0 or higher";
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Custom hook: useDebounce
// ---------------------------------------------------------------------------
function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SuppliersPage() {
  // --- Data state ---
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    current_page: 1,
    limit: PAGE_SIZE,
    total_rows: 0,
    total_pages: 1,
  });

  // --- Search with debounce ---
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  // --- Pagination ---
  const [page, setPage] = useState(1);

  // --- UI state ---
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<UiError | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formState, setFormState] = useState<SupplierFormState>(defaultFormState);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset to page 1 whenever debounced search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // ---------------------------------------------------------------------------
  // Core data loader — calls backend with search + page + limit
  // ---------------------------------------------------------------------------
  const loadSuppliers = useCallback(
    async (options?: { silent?: boolean; overridePage?: number }) => {
      const targetPage = options?.overridePage ?? page;

      if (!options?.silent) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await getSuppliers({
          search: debouncedSearch || undefined,
          page: targetPage,
          limit: PAGE_SIZE,
        });

        if (!isMountedRef.current) return;
        setSuppliers(response.data);
        setMeta(response.meta);
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        if (err instanceof ApiClientError) {
          setError({ code: err.code, message: err.message, status: err.status });
          return;
        }
        setError({ message: "Unexpected error occurred.", status: 500 });
      } finally {
        if (!options?.silent && isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [debouncedSearch, page],
  );

  // Fetch suppliers whenever debouncedSearch or page changes
  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // ---------------------------------------------------------------------------
  // Toggle supplier active status
  // ---------------------------------------------------------------------------
  async function handleToggle(supplier: Supplier) {
    const nextActive = !supplier.is_active;

    setSuppliers((prev) =>
      prev.map((item) => (item.id === supplier.id ? { ...item, is_active: nextActive } : item)),
    );
    setUpdating((prev) => ({ ...prev, [supplier.id]: true }));

    try {
      await toggleSupplier(supplier.id);
    } catch (err: unknown) {
      setSuppliers((prev) =>
        prev.map((item) =>
          item.id === supplier.id ? { ...item, is_active: supplier.is_active } : item,
        ),
      );

      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to update supplier status.");
      }
    } finally {
      setUpdating((prev) => {
        const next = { ...prev };
        delete next[supplier.id];
        return next;
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Export CSV
  // ---------------------------------------------------------------------------
  function handleExportCSV() {
    setIsExporting(true);
    try {
      const url = getExportCSVUrl(debouncedSearch || undefined);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "suppliers.csv";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      toast.success("CSV export started.");
    } catch {
      toast.error("Failed to export CSV.");
    } finally {
      // Small delay so the button shows a brief loading indicator
      setTimeout(() => setIsExporting(false), 800);
    }
  }

  // ---------------------------------------------------------------------------
  // Form operations
  // ---------------------------------------------------------------------------
  function openCreateForm() {
    setFormMode("create");
    setEditingSupplier(null);
    setFormState(defaultFormState);
    setFormErrors({});
    setIsFormOpen(true);
  }

  function openEditForm(supplier: Supplier) {
    setFormMode("edit");
    setEditingSupplier(supplier);
    setFormState({
      name: supplier.name,
      description: supplier.description ?? "",
      endpoint_url: supplier.endpoint_url,
      auth_type: supplier.auth_type ?? "none",
      auth_token: supplier.auth_token ?? "",
      timeout_ms: supplier.timeout_ms,
      is_active: supplier.is_active,
      mock_behavior: supplier.mock_behavior,
      display_order: supplier.display_order,
    });
    setFormErrors({});
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateForm(formState);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    const payload = sanitizePayload(formState);

    try {
      if (formMode === "create") {
        await createSupplier(payload);
        toast.success("Supplier created successfully.");
      } else if (editingSupplier) {
        await updateSupplier(editingSupplier.id, payload);
        toast.success("Supplier updated successfully.");
      }
      await loadSuppliers({ silent: true });
      setIsFormOpen(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to save supplier.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteSupplier(deleteTarget.id);
      toast.success("Supplier deleted successfully.");
      await loadSuppliers({ silent: true });
      setDeleteTarget(null);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to delete supplier.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Pagination helpers
  // ---------------------------------------------------------------------------
  const totalPages = meta.total_pages;
  const currentPage = meta.current_page;

  /** Build an array of page numbers to render, with ellipsis markers (-1) */
  function buildPageNumbers(): number[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: number[] = [1];

    if (currentPage > 3) pages.push(-1); // left ellipsis

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push(-1); // right ellipsis

    pages.push(totalPages);
    return pages;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <main className="min-h-screen bg-[#FAFAFA] p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Header Section */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
          <div>
            <h1 className="text-[28px] font-medium tracking-tight text-zinc-900 font-display">Supplier Management</h1>
            <p className="mt-0.5 text-sm text-zinc-500 font-body">Manage and aggregate your active inventory sources</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input with Debounce */}
            <div className="relative flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 transition-all duration-150">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search suppliers..."
                className="w-40 bg-transparent text-sm text-zinc-700 outline-none placeholder:text-zinc-400 font-body font-medium"
              />
              {/* Debounce indicator */}
              {searchInput !== debouncedSearch && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                </div>
              )}
              {/* Clear button */}
              {searchInput && searchInput === debouncedSearch && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Export CSV Button */}
            <Button
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="h-9 rounded-lg border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-sm transition-colors duration-150 font-body flex items-center gap-1.5"
            >
              {isExporting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                  Exporting…
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </>
              )}
            </Button>

            {/* Add Supplier Button */}
            <Button type="button" onClick={openCreateForm} className="h-9 rounded-lg bg-zinc-900 hover:bg-zinc-700 text-white px-4 text-xs font-semibold shadow-sm transition-colors duration-150 font-body">
              + Add Supplier
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3.5 w-64" />
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-6 w-full" />
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50/30 p-6 shadow-sm">
            <h2 className="text-lg font-medium text-red-700 font-display">Failed to load suppliers</h2>
            <p className="mt-2 text-sm text-red-650 leading-relaxed font-body">{error.message}</p>
            {error.code ? (
              <p className="mt-3 text-xs text-red-500 font-mono">
                Error code: {error.code} | HTTP status: {error.status}
              </p>
            ) : null}
          </div>
        ) : meta.total_rows === 0 && !debouncedSearch ? (
          <div className="rounded-xl border border-zinc-200 border-dashed bg-white p-12 text-center shadow-sm max-w-xl mx-auto my-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 border border-zinc-200 text-zinc-450 mb-4">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-medium text-zinc-900">No suppliers registered</h2>
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed font-body max-w-sm mx-auto">
              Add at least one supplier source to start consolidating real-time inventory counts.
            </p>
            <Button type="button" onClick={openCreateForm} className="mt-5 bg-zinc-900 hover:bg-zinc-700 text-white rounded-lg px-6 font-body text-xs font-semibold h-9 shadow-sm">
              Add your first supplier
            </Button>
          </div>
        ) : (
          <>
            <section className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-zinc-900 font-body">Registered Suppliers</h2>
                  <span className="bg-zinc-100 text-zinc-650 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {meta.total_rows}
                  </span>
                </div>
                {debouncedSearch && (
                  <span className="text-xs text-zinc-450 font-body font-medium">
                    Filtered by &ldquo;<span className="text-zinc-700">{debouncedSearch}</span>&rdquo;
                  </span>
                )}
              </div>

              {suppliers.length === 0 && debouncedSearch ? (
                /* No results for search query */
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 mb-3">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-zinc-600 font-body">No suppliers match &ldquo;{debouncedSearch}&rdquo;</p>
                  <p className="mt-1 text-xs text-zinc-400 font-body">Try adjusting your search query</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4 h-8 rounded-lg border-zinc-200 bg-white font-body text-xs"
                    onClick={() => setSearchInput("")}
                  >
                    Clear search
                  </Button>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3.5 w-16 text-center font-body">#</th>
                          <th className="px-6 py-3.5 font-body">Name &amp; Description</th>
                          <th className="px-6 py-3.5 w-32 font-body">Status</th>
                          <th className="px-6 py-3.5 w-44 font-body">Mock Behavior</th>
                          <th className="px-6 py-3.5 w-28 font-body">Timeout</th>
                          <th className="px-6 py-3.5 w-36 font-body">Created</th>
                          <th className="px-6 py-3.5 w-28 text-center font-body">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-medium">
                        {suppliers.map((supplier) => {
                          const isUpdating = !!updating[supplier.id];
                          const behaviorLabel = behaviorLabels[supplier.mock_behavior] ?? supplier.mock_behavior;

                          return (
                            <tr key={supplier.id} className="hover:bg-zinc-50/70 transition-colors duration-100 text-zinc-800">
                              <td className="px-6 py-4 text-center text-xs text-zinc-400 font-mono">
                                {supplier.display_order}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <p className="text-sm font-semibold text-zinc-900 font-body">{supplier.name}</p>
                                  {supplier.description ? (
                                    <p className="mt-0.5 text-xs text-zinc-450 font-body leading-relaxed max-w-sm">
                                      {supplier.description}
                                    </p>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={supplier.is_active}
                                    onCheckedChange={() => handleToggle(supplier)}
                                    loading={isUpdating}
                                    checkedClass="bg-green-500 border-green-500"
                                    aria-label={`Toggle ${supplier.name}`}
                                  />
                                  <span className={`text-xs font-semibold font-body ${supplier.is_active ? "text-green-600" : "text-zinc-400"}`}>
                                    {supplier.is_active ? "Active" : "Inactive"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {supplier.mock_behavior === "success" && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                                    Success
                                  </span>
                                )}
                                {supplier.mock_behavior === "timeout" && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                                    Timeout
                                  </span>
                                )}
                                {supplier.mock_behavior === "random_error" && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                                    Random Error
                                  </span>
                                )}
                                {supplier.mock_behavior !== "success" && supplier.mock_behavior !== "timeout" && supplier.mock_behavior !== "random_error" && (
                                  <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 text-xs border-zinc-200 font-medium">
                                    {behaviorLabel}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-6 py-4 text-xs font-mono text-zinc-600">
                                {supplier.timeout_ms.toLocaleString("en-US")} ms
                              </td>
                              <td className="px-6 py-4 text-xs text-zinc-450">
                                {formatDate(supplier.created_at)}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-1.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100"
                                    onClick={() => openEditForm(supplier)}
                                    aria-label="Edit supplier"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-zinc-400 hover:text-red-650 hover:bg-red-50"
                                    onClick={() => setDeleteTarget(supplier)}
                                    aria-label="Delete supplier"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List View */}
                  <div className="block md:hidden divide-y divide-zinc-150">
                    {suppliers.map((supplier) => {
                      const isUpdating = !!updating[supplier.id];
                      const behaviorLabel = behaviorLabels[supplier.mock_behavior] ?? supplier.mock_behavior;

                      return (
                        <div key={supplier.id} className="p-4 space-y-3 bg-white hover:bg-zinc-50/40">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-zinc-900 font-body">{supplier.name}</p>
                              {supplier.description ? (
                                <p className="mt-0.5 text-xs text-zinc-450 font-body leading-relaxed">{supplier.description}</p>
                              ) : null}
                            </div>

                            {supplier.mock_behavior === "success" && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                                Success
                              </span>
                            )}
                            {supplier.mock_behavior === "timeout" && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                Timeout
                              </span>
                            )}
                            {supplier.mock_behavior === "random_error" && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                Error
                              </span>
                            )}
                            {supplier.mock_behavior !== "success" && supplier.mock_behavior !== "timeout" && supplier.mock_behavior !== "random_error" && (
                              <Badge variant="secondary" className="bg-zinc-100 text-zinc-650 text-[10px] border-zinc-200 font-medium">
                                {behaviorLabel}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs font-body text-zinc-500 pt-1">
                            <div>
                              <span className="text-zinc-400">Timeout: </span>
                              <span className="font-semibold font-mono text-zinc-700">{supplier.timeout_ms} ms</span>
                            </div>
                            <div>
                              <span className="text-zinc-400">Order: </span>
                              <span className="font-semibold font-mono text-zinc-700">{supplier.display_order}</span>
                            </div>
                            <div className="col-span-2 flex items-center justify-between border-t border-zinc-100 pt-2 mt-1">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={supplier.is_active}
                                  onCheckedChange={() => handleToggle(supplier)}
                                  loading={isUpdating}
                                  checkedClass="bg-green-500 border-green-500"
                                  aria-label={`Toggle ${supplier.name}`}
                                />
                                <span className={`text-[11px] font-semibold ${supplier.is_active ? "text-green-600" : "text-zinc-400"}`}>
                                  {supplier.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>

                              <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border-zinc-200 bg-white" onClick={() => openEditForm(supplier)}>
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 rounded-lg text-red-650 hover:bg-red-50"
                                  onClick={() => setDeleteTarget(supplier)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ======================================================= */}
                  {/* Dynamic Pagination Controls                              */}
                  {/* ======================================================= */}
                  <div className="px-5 py-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
                    <span className="font-body text-xs font-medium">
                      Showing {suppliers.length} of {meta.total_rows} suppliers
                      {debouncedSearch ? ` matching "${debouncedSearch}"` : ""}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {/* Previous Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg border-zinc-200 bg-white font-body text-xs"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage <= 1}
                      >
                        Previous
                      </Button>

                      {/* Page Numbers with ellipsis */}
                      <div className="flex gap-1">
                        {buildPageNumbers().map((p, idx) => {
                          if (p === -1) {
                            return (
                              <span
                                key={`ellipsis-${idx}`}
                                className="flex h-8 w-8 items-center justify-center text-xs text-zinc-400 font-body select-none"
                              >
                                …
                              </span>
                            );
                          }

                          const isCurrent = p === currentPage;
                          return (
                            <button
                              key={p}
                              onClick={() => setPage(p)}
                              className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all duration-150 ${
                                isCurrent
                                  ? "bg-zinc-900 text-white shadow-sm"
                                  : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>

                      {/* Next Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg border-zinc-200 bg-white font-body text-xs"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>

      {/* Add/Edit Dialog Popover */}
      {isFormOpen ? (() => {
        const timeoutVal = formState.timeout_ms;
        let timeoutLabel = "Standard Timeout";
        let timeoutColorClass = "text-amber-600 font-semibold";
        if (timeoutVal < 1500) {
          timeoutLabel = "Fast Connection";
          timeoutColorClass = "text-green-600 font-semibold";
        } else if (timeoutVal > 4000) {
          timeoutLabel = "High Latency Allowed";
          timeoutColorClass = "text-red-650 font-semibold";
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-6 transition-all duration-300 animate-in fade-in">
            <div className="relative w-full max-w-[560px] max-h-[95vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_4px_6px_rgba(0,0,0,0.05),0_10px_15px_rgba(0,0,0,0.08)] animate-in zoom-in-95 duration-200">

              {/* Header */}
              <div className="relative flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-medium tracking-tight text-zinc-900 font-display">
                    {formMode === "create" ? "Add Supplier" : "Edit Supplier"}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-450 font-body">
                    {formMode === "create" ? "Register a new inventory source to monitor." : "Update supplier configuration details."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-lg text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 h-8 w-8"
                  onClick={closeForm}
                  aria-label="Close dialog"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>

              <div className="my-4 border-b border-zinc-100" />

              {/* Form Layout */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Supplier Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 font-body">
                      Supplier Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tokopedia Official Store"
                      className={`w-full h-9 rounded-lg border bg-white px-3 text-sm text-zinc-900 outline-none transition-colors duration-150 font-body ${formErrors.name ? "border-red-400 focus:ring-2 focus:ring-red-100" : "border-zinc-200 focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                        }`}
                      value={formState.name}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                    {formErrors.name ? (
                      <p className="text-xs text-red-650 font-body mt-1">{formErrors.name}</p>
                    ) : null}
                  </div>

                  {/* Display Order */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 font-body">
                      Display Order
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors duration-150 font-body focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                      value={formState.display_order}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          display_order: Number(event.target.value),
                        }))
                      }
                    />
                    {formErrors.display_order ? (
                      <p className="text-xs text-red-650 font-body mt-1">{formErrors.display_order}</p>
                    ) : null}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-zinc-700 font-body">
                      Description
                    </label>
                    <span className="text-[10px] bg-zinc-100 text-zinc-450 px-1.5 py-0.5 rounded font-body">Optional</span>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Short description of this supplier..."
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors duration-150 resize-none font-body focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </div>

                {/* Endpoint URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 font-body">
                    Endpoint URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://api.supplier.com/stock"
                    className={`w-full h-9 rounded-lg border bg-white px-3 text-sm text-zinc-900 outline-none transition-colors duration-150 font-body ${formErrors.endpoint_url ? "border-red-400 focus:ring-2 focus:ring-red-100" : "border-zinc-200 focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                      }`}
                    value={formState.endpoint_url}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, endpoint_url: event.target.value }))
                    }
                  />
                  <p className="text-[10px] text-zinc-400 font-body mt-1">The URL called to fetch live stock totals.</p>
                  {formErrors.endpoint_url ? (
                    <p className="text-xs text-red-650 font-body mt-1">{formErrors.endpoint_url}</p>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Authentication select */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 font-body">
                      Authentication
                    </label>
                    <div className="relative">
                      <select
                        className="w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-3.5 pr-10 h-9 text-sm text-zinc-800 outline-none transition-colors duration-150 font-body focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                        value={formState.auth_type}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, auth_type: event.target.value }))
                        }
                      >
                        <option value="none">None</option>
                        <option value="api_key" disabled className="opacity-40">
                          API Key (v1.1 coming soon)
                        </option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                        <svg className="h-4 w-4 text-zinc-450" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Mock Behavior Select */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-700 font-body">
                        Mock Behavior
                      </label>
                      <span className="text-[10px] bg-zinc-150 text-zinc-500 px-1.5 py-0.5 rounded font-body font-semibold">Demo Only</span>
                    </div>
                    <div className="relative">
                      <select
                        className="w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-3.5 pr-10 h-9 text-sm text-zinc-800 outline-none transition-colors duration-150 font-body focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
                        value={formState.mock_behavior}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, mock_behavior: event.target.value }))
                        }
                      >
                        <option value="success">Always Success</option>
                        <option value="random_error">Random Error (20%)</option>
                        <option value="timeout">Always Timeout</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                        <svg className="h-4 w-4 text-zinc-450" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-450 font-body mt-1">Simulates network status during queries.</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 pt-2">
                  {/* Timeout Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-zinc-700 font-body">
                      <span>Request Timeout</span>
                      <span className="font-mono text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded">
                        {formState.timeout_ms.toLocaleString("en-US")} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min={500}
                      max={10000}
                      step={100}
                      className="w-full accent-zinc-900 cursor-pointer"
                      value={formState.timeout_ms}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          timeout_ms: Number(event.target.value),
                        }))
                      }
                    />
                    <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-450 font-body">
                      <span>500 ms</span>
                      <span className={timeoutColorClass}>{timeoutLabel}</span>
                      <span>10,000 ms</span>
                    </div>
                  </div>
                </div>

                <div className="my-2 border-b border-zinc-100" />

                {/* Footer buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 rounded-lg text-zinc-650 hover:bg-zinc-100 px-4 text-xs font-semibold font-body"
                    onClick={closeForm}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-9 rounded-lg bg-zinc-900 hover:bg-zinc-700 text-white px-5 text-xs font-semibold shadow-sm transition-colors duration-150 font-body"
                  >
                    {isSubmitting ? "Saving..." : formMode === "create" ? "Save Supplier" : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        );
      })() : null}

      {/* Delete confirmation dialog */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-6 transition-all duration-300 animate-in fade-in">
          <div className="relative w-full max-w-[400px] rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_4px_6px_rgba(0,0,0,0.05),0_10px_15px_rgba(0,0,0,0.08)] animate-in zoom-in-95 duration-200">
            <div className="relative flex flex-col items-center text-center">

              {/* Top Red Trash Icon Container */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 border border-red-200 text-red-600 mb-4">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              <h2 className="text-lg font-medium text-zinc-950 font-display">Delete supplier?</h2>

              <p className="mt-2 text-sm text-zinc-500 leading-relaxed font-body">
                This will permanently remove <span className="font-semibold text-zinc-900">{deleteTarget.name}</span> and cannot be undone.
              </p>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg border-zinc-200 bg-white text-zinc-700 flex-1 font-body text-xs font-semibold"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white flex-1 font-body text-xs font-semibold shadow-sm transition-colors"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
