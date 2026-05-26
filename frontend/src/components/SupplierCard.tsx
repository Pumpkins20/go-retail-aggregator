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
    mock_behavior?: string;
  };
}

export function SupplierCard({ supplier }: SupplierCardProps) {
  const { supplier_name, description, stock, status, latency_ms, error_message, mock_behavior } = supplier;
  
  const isSuccess = status === "SUCCESS";
  const isTimeout = status === "TIMEOUT";
  const isError = status === "ERROR";
  
  const stockValue = isSuccess ? new Intl.NumberFormat("en-US").format(stock) : "—";
  const latencyText = `${latency_ms} ms latency`;
  const failureMessage =
    error_message ??
    (isTimeout
      ? "Connection Timeout"
      : isError
        ? "Connection Failed"
        : null);

  // Set card classes based on status (Section 4.3 state variants)
  let cardClasses = "border-zinc-200 bg-white opacity-100";
  if (isTimeout) {
    cardClasses = "border-amber-200 bg-amber-50/30 opacity-60";
  } else if (isError) {
    cardClasses = "border-red-200 bg-red-50/30 opacity-60";
  }

  // Status Badge classes
  let badgeClasses = "bg-zinc-50 text-zinc-700 border-zinc-200";
  if (isSuccess) {
    badgeClasses = "bg-green-50 text-green-700 border-green-200";
  } else if (isTimeout) {
    badgeClasses = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (isError) {
    badgeClasses = "bg-red-50 text-red-700 border-red-200";
  }

  return (
    <article
      className={`rounded-xl border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-200 hover:border-zinc-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${cardClasses}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium text-zinc-900 leading-tight font-body">{supplier_name}</h3>
          <p className="mt-0.5 text-sm text-zinc-400 leading-relaxed font-body">
            {description ?? "Primary Marketplace"}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-1.5">
          {/* Status Badge */}
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClasses}`}>
            {isSuccess && (
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-600"></span>
              </span>
            )}
            {status}
          </span>
          
          {/* Extra warning badge for SUCCESS + stock=0 */}
          {isSuccess && stock === 0 && (
            <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 text-[10px] font-semibold tracking-wider text-amber-700 px-1.5 py-0.5">
              Empty
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        <p className={`font-body text-4xl font-semibold text-zinc-900 tabular-nums leading-none ${isSuccess ? "" : "text-zinc-300"}`}>
          {stockValue}
        </p>
        {isSuccess && <span className="text-xs text-zinc-400 mt-1 uppercase tracking-wider font-body">units</span>}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
        <span className="text-xs text-zinc-400 font-body">Status Response</span>
        
        <div className="flex items-center gap-2">
          {/* Mock behavior info badge */}
          {mock_behavior && mock_behavior !== "success" && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-body">
              {mock_behavior === "timeout" ? "Timeout Mock" : "Error Mock"}
            </span>
          )}
          
          <p className={`text-xs font-body font-medium ${isSuccess ? "text-zinc-500" : isError ? "text-red-600" : "text-amber-600"}`}>
            {isSuccess ? latencyText : failureMessage}
          </p>
        </div>
      </div>
    </article>
  );
}
