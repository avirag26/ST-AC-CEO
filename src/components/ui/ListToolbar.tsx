"use client";

import type { ReactNode } from "react";

type FilterOption = { value: string; label: string };

type ListFilter = {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
};

type ListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ListFilter[];
  resultLabel?: string;
  actions?: ReactNode;
};

export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters = [],
  resultLabel,
  actions,
}: ListToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="min-w-0 flex-1 text-sm font-medium text-text">
          Search
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text shadow-sm focus:border-primary"
          />
        </label>
        {filters.map((filter) => (
          <label
            key={filter.id}
            className="w-full text-sm font-medium text-text sm:w-44"
          >
            {filter.label}
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-text shadow-sm focus:border-primary"
            >
              {filter.options.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      {resultLabel ? (
        <p className="text-xs text-text-secondary">{resultLabel}</p>
      ) : null}
    </div>
  );
}
