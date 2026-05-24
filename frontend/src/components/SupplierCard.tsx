export type SupplierStatus = "SUCCESS" | "TIMEOUT" | "ERROR";

export interface SupplierCardProps {
  supplier: {
    supplier_id: string;
    supplier_name: string;
    description?: string | null;
    stock: number;
    status: SupplierStatus;
    latency_ms: number;
    fetched_at: string;
    error_message: string | null;
  };
}

const statusStyles: Record<SupplierStatus, { label: string; className: string }> = {
  SUCCESS: {
    label: "SUCCESS",
    className: "bg-green-50 text-green-600 border border-green-100",
  },
  TIMEOUT: {
    label: "TIMEOUT",
    className: "bg-amber-50 text-amber-600 border border-amber-100",
  },
  ERROR: {
    label: "ERROR",
    className: "bg-red-50 text-red-600 border border-red-100",
  },
};

export function SupplierCard({ supplier }: SupplierCardProps) {
  const { supplier_name, description, stock, status, latency_ms, error_message } = supplier;
  const badge = statusStyles[status];
  const isSuccess = status === "SUCCESS";
  const stockValue = isSuccess ? new Intl.NumberFormat("id-ID").format(stock) : "-";
  const latencyText = `${latency_ms} ms latency`;
  const failureMessage =
    error_message ??
    (status === "TIMEOUT"
      ? "Connection Timeout"
      : status === "ERROR"
        ? "Connection Failed"
        : null);

  return (
    <article
      className={`rounded-lg border bg-white p-5 ${
        status === "TIMEOUT"
          ? "border-amber-200"
          : status === "ERROR"
            ? "border-red-200"
            : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[22px] font-semibold leading-tight text-gray-800">{supplier_name}</h3>
          <p className="mt-1 text-xs text-gray-500">{description ?? "Primary Marketplace"}</p>
        </div>
        <span className={`rounded px-2 py-1 text-[10px] font-medium tracking-wide ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      <div className="mt-6 flex items-end gap-2">
        <p className="text-5xl font-semibold leading-none text-gray-900">{stockValue}</p>
        <span className="pb-1 text-sm text-gray-500">units</span>
      </div>

      <p className={`mt-4 text-xs ${isSuccess ? "text-gray-500" : status === "ERROR" ? "text-red-500" : "text-amber-500"}`}>
        {isSuccess ? latencyText : failureMessage}
      </p>
    </article>
  );
}
