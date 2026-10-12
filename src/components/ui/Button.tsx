import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "dangerOutline";
  size?: "sm" | "md" | "icon";
  fullWidth?: boolean;
  isLoading?: boolean;
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-dark disabled:bg-primary/60 shadow-sm",
  secondary:
    "bg-surface text-text border border-border hover:bg-surface-muted disabled:opacity-60",
  ghost:
    "bg-transparent text-primary hover:bg-surface-muted disabled:opacity-60",
  danger:
    "bg-error text-white hover:bg-error/90 disabled:bg-error/60 shadow-sm",
  dangerOutline:
    "bg-surface text-error border border-error/30 hover:bg-error-bg disabled:opacity-60",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "min-h-10 px-3 py-2 text-sm rounded-lg",
  md: "min-h-11 px-4 py-2.5 text-sm rounded-xl",
  icon: "min-h-11 min-w-11 p-0 rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden
          />
          <span>Please wait…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
