import * as React from "react";

import { cn } from "../../lib/utils";

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "border-primary/20 bg-primary/15 text-primary",
  secondary: "border-secondary/40 bg-secondary text-secondary-foreground",
  outline: "border-border text-foreground",
  destructive: "border-destructive/20 bg-destructive/10 text-destructive",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
