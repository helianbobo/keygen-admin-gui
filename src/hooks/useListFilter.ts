'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebounce } from './useDebounce';

export interface FilterState {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
}

interface UseListFilterOptions {
  defaultFilters?: Partial<FilterState>;
  syncToUrl?: boolean;
}

/**
 * Hook for managing list filters with URL state synchronization.
 * Supports search (debounced), status, date range, and pagination.
 */
export function useListFilter(options: UseListFilterOptions = {}) {
  const { defaultFilters, syncToUrl = true } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Helper to parse params from URL
  const parseParams = useCallback(
    (params: URLSearchParams): FilterState => {
      return {
        search: params.get('search') || defaultFilters?.search || '',
        status: params.get('status') || defaultFilters?.status || '',
        dateFrom: params.get('dateFrom') || defaultFilters?.dateFrom || '',
        dateTo: params.get('dateTo') || defaultFilters?.dateTo || '',
        page: Number(params.get('page')) || defaultFilters?.page || 1,
        pageSize: Number(params.get('pageSize')) || defaultFilters?.pageSize || 10,
      };
    },
    [defaultFilters]
  );

  // Internal state for immediate UI updates
  const [filters, setFilters] = useState<FilterState>(() => parseParams(searchParams));

  // Debounced search for URL sync to avoid excessive router pushes
  const debouncedSearch = useDebounce(filters.search, 300);

  // Sync state when URL changes (e.g. browser back/forward)
  useEffect(() => {
    const newFilters = parseParams(searchParams);
    setFilters((prev) => {
      if (
        prev.search === newFilters.search &&
        prev.status === newFilters.status &&
        prev.dateFrom === newFilters.dateFrom &&
        prev.dateTo === newFilters.dateTo &&
        prev.page === newFilters.page &&
        prev.pageSize === newFilters.pageSize
      ) {
        return prev;
      }
      return newFilters;
    });
  }, [searchParams, parseParams]);

  // Push state to URL
  const updateUrl = useCallback(
    (state: FilterState, searchVal: string) => {
      if (!syncToUrl) return;

      const params = new URLSearchParams();
      if (searchVal) params.set('search', searchVal);
      if (state.status) params.set('status', state.status);
      if (state.dateFrom) params.set('dateFrom', state.dateFrom);
      if (state.dateTo) params.set('dateTo', state.dateTo);
      if (state.page > 1) params.set('page', state.page.toString());
      if (state.pageSize !== 10) params.set('pageSize', state.pageSize.toString());

      const newQuery = params.toString();
      const currentQuery = searchParams.toString();

      if (newQuery !== currentQuery) {
        router.push(`${pathname}${newQuery ? `?${newQuery}` : ''}`, { scroll: false });
      }
    },
    [pathname, router, searchParams, syncToUrl]
  );

  // Effect to sync debounced search and other filters to URL
  useEffect(() => {
    updateUrl(filters, debouncedSearch);
  }, [
    debouncedSearch,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
    filters.page,
    filters.pageSize,
    updateUrl,
  ]);

  const setFilter = useCallback((key: keyof FilterState, value: string | number) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      
      // Reset to page 1 when any filter other than page/pageSize changes
      if (key !== 'page' && key !== 'pageSize') {
        next.page = 1;
      }
      
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: defaultFilters?.search || '',
      status: defaultFilters?.status || '',
      dateFrom: defaultFilters?.dateFrom || '',
      dateTo: defaultFilters?.dateTo || '',
      page: 1,
      pageSize: defaultFilters?.pageSize || 10,
    });
  }, [defaultFilters]);

  // Construct current query string (using debounced search)
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (filters.status) params.set('status', filters.status);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    params.set('page', filters.page.toString());
    params.set('pageSize', filters.pageSize.toString());
    return params.toString();
  }, [debouncedSearch, filters]);

  return {
    filters,
    setFilter,
    resetFilters,
    queryString,
  };
}
