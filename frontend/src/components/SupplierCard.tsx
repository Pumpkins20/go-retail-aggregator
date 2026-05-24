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
    className: "border border-green-200 bg-green-50 text-green-700",
  },
  TIMEOUT: {
    label: "TIMEOUT",
    className: "border border-amber-200 bg-amber-50 text-amber-700",
  },
  ERROR: {
    label: "ERROR",
    className: "border border-red-200 bg-red-50 text-red-700",
  },
};

export function SupplierCard({ supplier }: SupplierCardProps) {
  const { supplier_name, description, stock, status, latency_ms, error_message } = supplier;
  const badge = statusStyles[status];
  const isSuccess = status === "SUCCESS";
  const stockValue = isSuccess ? new Intl.NumberFormat("id-ID").format(stock) : "-";
  const latencyText = `${latency_ms} ms`;
  const failureMessage =
    error_message ??
    (status === "TIMEOUT"
      ? "Request timed out."
      : status === "ERROR"
        ? "Failed to fetch supplier data."
        : null);

  return (
    <div
      className={`rounded-lg border bg-white p-5 shadow-sm transition-colors duration-200 ${
        isSuccess
          ? "border-zinc-200"
          : status === "TIMEOUT"
            ? "border-amber-200 opacity-80"
            : "border-red-200 opacity-80"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-zinc-800">{supplier_name}</h3>
          {description ? <p className="mt-1 text-xs text-zinc-500">{description}</p> : null}
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
          aria-label={`Status ${badge.label}`}
        >
          {badge.label}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-semibold text-zinc-900">{stockValue}</p>
        <p className="mt-1 text-xs text-zinc-500" title={`Latency ${latencyText}`}>
          Latency {latencyText}
        </p>
      </div>
      {!isSuccess && failureMessage ? <p className="mt-3 text-xs text-zinc-600">{failureMessage}</p> : null}
    </div>
  );
}
