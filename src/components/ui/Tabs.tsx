"use client";

import { cn } from "@/lib/cn";

export type TabItem<T extends string> = {
  id: T;
  label: string;
};

type TabsProps<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
};

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="grid gap-1 rounded-2xl border border-border bg-surface p-1 shadow-sm"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const selected = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={cn(
              "min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors",
              selected
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:bg-surface-muted hover:text-text",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
