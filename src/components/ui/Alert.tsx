import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type AlertProps = {
  children: ReactNode;
  variant?: "info" | "success" | "error";
  className?: string;
};

const variantClasses = {
  info: "border-primary/20 bg-surface-muted text-text",
  success: "border-success/25 bg-emerald-50 text-success",
  error: "border-error/30 bg-error-bg text-error",
};

export function Alert({
  children,
  variant = "info",
  className,
}: AlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm leading-relaxed",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
