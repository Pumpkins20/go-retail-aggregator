import * as React from "react";

import { cn } from "../../lib/utils";

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "border-blue-200/80 bg-blue-50/60 text-blue-700 shadow-sm shadow-blue-50/50",
  secondary: "border-slate-200/80 bg-slate-100/60 text-slate-700 backdrop-blur-sm shadow-sm shadow-slate-100/50",
  outline: "border-slate-200 text-slate-600 bg-transparent hover:bg-slate-50/50",
  destructive: "border-red-200/80 bg-red-50/60 text-red-700 shadow-sm shadow-red-50/50",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide transition-all duration-300",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
