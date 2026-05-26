import * as React from "react";

import { cn } from "../../lib/utils";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  loading?: boolean;
  checkedClass?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled, loading, checkedClass, onClick, ...props }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={isDisabled}
        onClick={(event) => {
          if (isDisabled) return;
          onCheckedChange?.(!checked);
          onClick?.(event);
        }}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? (checkedClass ?? "bg-zinc-900 border-zinc-900") : "bg-zinc-200",
          isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          loading && "animate-pulse",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-5"
          )}
        >
          {loading && (
            <svg
              className="h-3 w-3 animate-spin text-zinc-650"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
        </span>
      </button>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
