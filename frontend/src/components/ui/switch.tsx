import * as React from "react";

import { cn } from "../../lib/utils";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled, onClick, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={(event) => {
          if (disabled) return;
          onCheckedChange?.(!checked);
          onClick?.(event);
        }}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? "bg-primary" : "bg-muted",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 translate-x-0.5 rounded-full bg-background shadow-sm transition-transform",
            checked && "translate-x-5"
          )}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };
