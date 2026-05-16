export type SupplierStatus = "SUCCESS" | "TIMEOUT" | "ERROR";

export interface SupplierCardProps {
  supplier: {
    supplier_id: string;
    supplier_name: string;
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
  const { supplier_name, stock, status, latency_ms, error_message } = supplier;
  const badge = statusStyles[status];
  const formattedStock = new Intl.NumberFormat("id-ID").format(stock);
  const latencyText = `${latency_ms} ms`;
  const failureMessage =
    error_message ??
    (status === "TIMEOUT"
      ? "Request timed out."
      : status === "ERROR"
        ? "Failed to fetch supplier data."
        : null);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-zinc-500">{supplier_name}</h3>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
          aria-label={`Status ${badge.label}`}
        >
          {badge.label}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-semibold text-zinc-900">{formattedStock}</p>
        <p className="mt-1 text-xs text-zinc-500" title={`Latency ${latencyText}`}>
          Latency {latencyText}
        </p>
      </div>
      {status !== "SUCCESS" && failureMessage ? (
        <p className="mt-3 text-xs text-zinc-500">{failureMessage}</p>
      ) : null}
    </div>
  );
}
