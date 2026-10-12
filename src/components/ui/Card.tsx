import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  padding?: "sm" | "md" | "lg";
};

const paddingClasses = {
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function Card({
  children,
  className,
  padding = "md",
  ...props
}: CardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]",
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
