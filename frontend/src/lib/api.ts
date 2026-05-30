import type {
  CreateSupplierResponse,
  ErrorResponse,
  StockResponse,
  SupplierPayload,
  SupplierListResponse,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "UNKNOWN_ERROR", status = 500) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

function isErrorResponse(payload: unknown): payload is ErrorResponse {
  if (!payload || typeof payload !== "object") return false;

  const maybeError = (payload as { error?: unknown }).error;
  if (!maybeError || typeof maybeError !== "object") return false;

  const { code, message } = maybeError as { code?: unknown; message?: unknown };
  return typeof code === "string" && typeof message === "string";
}

function safeJsonParse(text: string): unknown {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiClientError(
      "NEXT_PUBLIC_API_URL is not configured.",
      "CONFIG_ERROR",
      500,
    );
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError(
      "Cannot connect to API server. Please check backend availability.",
      "NETWORK_ERROR",
      0,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload = safeJsonParse(text);

  if (!response.ok) {
    if (isErrorResponse(payload)) {
      throw new ApiClientError(payload.error.message, payload.error.code, response.status);
    }

    throw new ApiClientError(
      `Request failed with status ${response.status}`,
      "HTTP_ERROR",
      response.status,
    );
  }

  return payload as T;
}

export function getStock(): Promise<StockResponse> {
  return request<StockResponse>("/stock", { method: "GET" });
}

export async function getSuppliers(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<SupplierListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const qs = query.toString();
  const path = qs ? `/suppliers?${qs}` : "/suppliers";

  const payload = await request<SupplierListResponse>(path, { method: "GET" });

  return {
    data: Array.isArray(payload.data) ? payload.data : [],
    meta: payload.meta ?? { current_page: 1, limit: 20, total_rows: 0, total_pages: 1 },
  };
}

export function getExportCSVUrl(search?: string): string {
  const base = `${API_BASE_URL}/suppliers/export`;
  if (search?.trim()) {
    const query = new URLSearchParams({ search: search.trim() });
    return `${base}?${query.toString()}`;
  }
  return base;
}

export function createSupplier(payload: SupplierPayload): Promise<CreateSupplierResponse> {
  return request<CreateSupplierResponse>("/suppliers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSupplier(id: string, payload: SupplierPayload): Promise<CreateSupplierResponse> {
  return request<CreateSupplierResponse>(`/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteSupplier(id: string): Promise<void> {
  const query = new URLSearchParams({ id });
  return request<void>(`/suppliers?${query.toString()}`, {
    method: "DELETE",
  });
}

export function toggleSupplier(id: string): Promise<void> {
  return request<void>(`/suppliers/${id}/toggle`, {
    method: "PATCH",
  });
}
