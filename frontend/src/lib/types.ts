export interface Supplier {
  id: string;
  name: string;
  description: string | null;
  endpoint_url: string;
  auth_type: string;
  auth_token: string | null;
  timeout_ms: number;
  is_active: boolean;
  mock_behavior: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface FetchResult {
  supplier_id: string;
  supplier_name: string;
  description: string | null;
  stock: number;
  status: string;
  latency_ms: number;
  fetched_at: string;
  error_message: string | null;
}

export interface StockResponse {
  total_stock: number;
  successful_sources: number;
  failed_sources: number;
  fetched_at: string;
  warning: string | null;
  suppliers: FetchResult[];
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ErrorResponse {
  error: ApiError;
}

export interface CreateSupplierResponse {
  message: string;
}
