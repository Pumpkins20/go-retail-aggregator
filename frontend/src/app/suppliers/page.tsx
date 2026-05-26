"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  ApiClientError,
  createSupplier,
  deleteSupplier,
  getSuppliers,
  toggleSupplier,
  updateSupplier,
} from "@/lib/api";
import type { Supplier, SupplierPayload } from "@/types";

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

const pageSize = 20;

const behaviorLabels: Record<string, string> = {
  success: "Success",
  random_error: "Random error",
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
  return date.toLocaleDateString("id-ID", { dateStyle: "medium" });
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
    errors.name = "Name is required";
  } else if (values.name.trim().length < 3) {
    errors.name = "Name must be at least 3 characters";
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

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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
  const [page, setPage] = useState(1);
  const isMountedRef = useRef(true);

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter((supplier) => {
      return (
        supplier.name.toLowerCase().includes(q) ||
        (supplier.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [searchQuery, suppliers]);

  const totalActive = useMemo(
    () => suppliers.filter((supplier) => supplier.is_active).length,
    [suppliers]
  );
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredSuppliers.length / pageSize)),
    [filteredSuppliers.length]
  );
  const pagedSuppliers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, page]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const loadSuppliers = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await getSuppliers();
      if (!isMountedRef.current) return;
      setSuppliers(response);
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
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  async function handleToggle(supplier: Supplier) {
    const nextActive = !supplier.is_active;

    setSuppliers((prev) =>
      prev.map((item) => (item.id === supplier.id ? { ...item, is_active: nextActive } : item))
    );
    setUpdating((prev) => ({ ...prev, [supplier.id]: true }));

    try {
      await toggleSupplier(supplier.id);
    } catch (err: unknown) {
      setSuppliers((prev) =>
        prev.map((item) => (item.id === supplier.id ? { ...item, is_active: supplier.is_active } : item))
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

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold text-blue-700">Supplier Management</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Quick search..."
                  className="w-44 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
              <Button type="button" onClick={openCreateForm} className="h-9 bg-slate-900 px-4 text-sm text-white hover:bg-slate-800">
                + Add Supplier
              </Button>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-6 w-full" />
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-destructive">Failed to load suppliers</h2>
            <p className="mt-2 text-sm text-destructive/80">{error.message}</p>
            {error.code ? (
              <p className="mt-3 text-xs text-destructive/70">
                Error code: {error.code} | HTTP status: {error.status}
              </p>
            ) : null}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <h2 className="font-serif text-xl text-foreground">No suppliers registered</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No suppliers registered yet. Add a supplier to start monitoring stock.
            </p>
            <Button type="button" onClick={openCreateForm} className="mt-4">
              Add your first supplier
            </Button>
          </div>
        ) : (
          <>
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-3xl font-semibold text-gray-900">Registered Suppliers</h2>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    {filteredSuppliers.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="border-gray-200 bg-white text-gray-600">Filter</Button>
                  <Button type="button" variant="outline" size="sm" className="border-gray-200 bg-white text-gray-600">Export</Button>
                </div>
              </div>

              <div className="hidden overflow-hidden rounded-lg border border-gray-200 md:block">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[0.65rem] uppercase tracking-[0.12em] text-gray-500">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">#</th>
                    <th className="px-6 py-4 text-left font-semibold">Supplier</th>
                    <th className="px-6 py-4 text-left font-semibold">Status</th>
                    <th className="px-6 py-4 text-left font-semibold">Mock Behavior</th>
                    <th className="px-6 py-4 text-left font-semibold">Timeout</th>
                    <th className="px-6 py-4 text-left font-semibold">Created</th>
                    <th className="px-6 py-4 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pagedSuppliers.map((supplier, index) => {
                    const isUpdating = !!updating[supplier.id];
                    const behaviorLabel = behaviorLabels[supplier.mock_behavior] ?? supplier.mock_behavior;

                    return (
                      <tr key={supplier.id} className="text-gray-800">
                        <td className="px-6 py-5 text-sm text-gray-600">{(page - 1) * pageSize + index + 1}</td>
                        <td className="px-6 py-5">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{supplier.name}</p>
                            {supplier.description ? (
                              <p className="mt-1 text-xs text-gray-500">
                                {supplier.description}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={supplier.is_active}
                              onCheckedChange={() => handleToggle(supplier)}
                              disabled={isUpdating}
                              aria-label={`Toggle ${supplier.name}`}
                            />
                            <span className={`text-sm ${supplier.is_active ? "text-green-600" : "text-gray-500"}`}>
                              {supplier.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <Badge variant="secondary">{behaviorLabel}</Badge>
                        </td>
                        <td className="px-6 py-5 text-gray-700">{supplier.timeout_ms.toLocaleString("id-ID")} ms</td>
                        <td className="px-6 py-5 text-gray-700">{formatDate(supplier.created_at)}</td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" className="border-gray-200" onClick={() => openEditForm(supplier)}>
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteTarget(supplier)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-2 text-sm text-gray-500">
                <span>
                  Showing {pagedSuppliers.length} of {filteredSuppliers.length} suppliers
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-gray-200 bg-white"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-gray-200 bg-white"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </section>

            <section className="space-y-4 md:hidden">
              {pagedSuppliers.map((supplier) => {
                const isUpdating = !!updating[supplier.id];
                const behaviorLabel = behaviorLabels[supplier.mock_behavior] ?? supplier.mock_behavior;

                return (
                  <div
                    key={supplier.id}
                    className="rounded-xl border border-border bg-card p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{supplier.name}</p>
                        {supplier.description ? (
                          <p className="mt-1 text-xs text-muted-foreground">{supplier.description}</p>
                        ) : null}
                      </div>
                      <Badge variant="secondary">{behaviorLabel}</Badge>
                    </div>
                    <div className="mt-4 grid gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Timeout</span>
                        <span className="text-foreground">{supplier.timeout_ms} ms</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Order</span>
                        <span className="text-foreground">{supplier.display_order}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Created</span>
                        <span className="text-foreground">{formatDate(supplier.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Status</span>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={supplier.is_active}
                            onCheckedChange={() => handleToggle(supplier)}
                            disabled={isUpdating}
                            aria-label={`Toggle ${supplier.name}`}
                          />
                          <span className="text-foreground">
                            {supplier.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => openEditForm(supplier)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(supplier)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-xl border border-white/40 bg-white/75 p-6 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  {formMode === "create" ? "Add Supplier" : "Edit Supplier"}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">
                  {formMode === "create" ? "Create supplier" : "Update supplier"}
                </h2>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeForm}>
                Close
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                  {formErrors.name ? (
                    <p className="text-xs text-destructive">{formErrors.name}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground"
                    value={formState.display_order}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        display_order: Number(event.target.value),
                      }))
                    }
                  />
                  {formErrors.display_order ? (
                    <p className="text-xs text-destructive">{formErrors.display_order}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground"
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Endpoint URL
                </label>
                <input
                  type="url"
                  className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground"
                  value={formState.endpoint_url}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, endpoint_url: event.target.value }))
                  }
                />
                {formErrors.endpoint_url ? (
                  <p className="text-xs text-destructive">{formErrors.endpoint_url}</p>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Auth Type
                  </label>
                  <select
                    className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground"
                    value={formState.auth_type}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, auth_type: event.target.value }))
                    }
                  >
                    <option value="none">none</option>
                    <option value="api_key" disabled>
                      api_key (v1.1)
                    </option>
                  </select>
                  <p className="text-xs text-muted-foreground">API key will be available in v1.1.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Mock Behavior
                  </label>
                  <select
                    className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground"
                    value={formState.mock_behavior}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, mock_behavior: event.target.value }))
                    }
                  >
                    <option value="success">success</option>
                    <option value="random_error">random_error</option>
                    <option value="timeout">timeout</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Timeout (ms)
                  </label>
                  <input
                    type="range"
                    min={500}
                    max={10000}
                    step={100}
                    className="w-full"
                    value={formState.timeout_ms}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        timeout_ms: Number(event.target.value),
                      }))
                    }
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>500</span>
                    <span className="text-foreground">{formState.timeout_ms} ms</span>
                    <span>10000</span>
                  </div>
                  {formErrors.timeout_ms ? (
                    <p className="text-xs text-destructive">{formErrors.timeout_ms}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Active
                  </label>
                  <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                    <Switch
                      checked={formState.is_active}
                      onCheckedChange={(checked) =>
                        setFormState((prev) => ({ ...prev, is_active: checked }))
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {formState.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving" : formMode === "create" ? "Create" : "Update"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">Delete supplier</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Delete {deleteTarget.name}? This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting ? "Deleting" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
