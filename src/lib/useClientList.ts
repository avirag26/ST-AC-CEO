"use client";

import { useEffect, useMemo, useState } from "react";

type UseClientListOptions<T> = {
  items: T[];
  getSearchText: (item: T) => string;
  /** Return false to exclude an item (status/class filters, etc.). */
  matchesFilters?: (item: T) => boolean;
  /** Change this when filters change so the page resets. */
  filterKey?: string;
  pageSize?: number;
};

export function useClientList<T>({
  items,
  getSearchText,
  matchesFilters,
  filterKey = "",
  pageSize = 10,
}: UseClientListOptions<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (matchesFilters && !matchesFilters(item)) return false;
      if (!q) return true;
      return getSearchText(item).toLowerCase().includes(q);
    });
  }, [items, query, matchesFilters, getSearchText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [query, filterKey, pageSize]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  return {
    query,
    setQuery,
    page: safePage,
    setPage,
    pageItems,
    filteredCount: filtered.length,
    totalCount: items.length,
    totalPages,
    pageSize,
  };
}
