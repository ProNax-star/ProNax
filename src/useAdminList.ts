/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. */
/**
 * useAdminList — server-side paginated / searchable / sortable list loader for
 * the admin console. Built for tables that can hold tens of millions of rows:
 * nothing is ever fetched without an explicit `range()` window, search runs in
 * Postgres (never client-side over a full table dump), and realtime events are
 * coalesced so a burst of writes triggers at most one refetch per second.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import { toast } from 'sonner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

export const PAGE_SIZES = [25, 50, 100] as const;
export const EXPORT_MAX = 5000;

export type AdminListFilter = {
  column: string;
  /** Supabase filter operator. */
  op?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'is' | 'in';
  value: unknown;
};

export type UseAdminListOptions = {
  table: string;
  select: string;
  /** Columns matched with a case-insensitive OR ILIKE when a search term is set. */
  searchColumns?: string[];
  orderBy?: string;
  ascending?: boolean;
  /** Extra server-side filters. Falsy `value` entries are skipped. */
  filters?: AdminListFilter[];
  pageSize?: number;
  /** Realtime tables to watch; defaults to the primary table. */
  realtimeTables?: string[];
  enabled?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, filters: AdminListFilter[] | undefined) {
  let q = query;
  for (const f of filters ?? []) {
    if (f.value === undefined || f.value === null || f.value === '' || f.value === 'all') continue;
    const op = f.op ?? 'eq';
    q = q[op](f.column, f.value);
  }
  return q;
}

function sanitizeSearch(term: string): string {
  // Strip PostgREST `or()` delimiters so a search box can never inject filters.
  return term.replace(/[,()*\\]/g, ' ').trim();
}

export function useAdminList(opts: UseAdminListOptions) {
  const {
    table, select, searchColumns = [], orderBy = 'created_at', ascending = false,
    filters, pageSize: initialPageSize = 25, realtimeTables, enabled = true,
  } = opts;

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState<{ column: string; ascending: boolean }>({ column: orderBy, ascending });

  const filtersKey = JSON.stringify(filters ?? []);
  const searchKey = searchColumns.join(',');
  const rtKey = (realtimeTables ?? [table]).join(',');

  // Debounce the search box so typing does not fire one query per keystroke.
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to the first page whenever the result set definition changes.
  useEffect(() => { setPage(0); }, [filtersKey, pageSize]);

  const buildQuery = useCallback((from: number, to: number, withCount: boolean) => {
    let q = supabase.from(table).select(select, withCount ? { count: 'exact' } : undefined);
    q = applyFilters(q, filters);
    const term = sanitizeSearch(debounced);
    if (term && searchColumns.length) {
      q = q.or(searchColumns.map(c => `${c}.ilike.%${term}%`).join(','));
    }
    return q.order(sort.column, { ascending: sort.ascending }).range(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, filtersKey, debounced, searchKey, sort.column, sort.ascending]);

  const reqId = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) return;
    const id = ++reqId.current;
    setLoading(true);
    const from = page * pageSize;
    const { data, error, count } = await buildQuery(from, from + pageSize - 1, true);
    if (id !== reqId.current) return; // a newer request superseded this one
    if (error) {
      toast.error(error.message);
      setRows([]);
      setTotal(0);
    } else {
      setRows((data ?? []) as Row[]);
      setTotal(typeof count === 'number' ? count : null);
    }
    setLoading(false);
  }, [buildQuery, page, pageSize, enabled]);

  useEffect(() => { void load(); }, [load]);

  // Coalesced realtime refresh — a write storm costs one refetch per second.
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ping = () => {
      if (timer) return;
      timer = setTimeout(() => { timer = null; void loadRef.current(); }, 1000);
    };
    const ch = supabase.channel(`admin:${table}-${Math.random().toString(36).slice(2)}`);
    for (const t of rtKey.split(',')) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, ping);
    }
    ch.subscribe();
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, rtKey, enabled]);

  /** Fetch the current filter set (capped) for CSV export. */
  const fetchAllForExport = useCallback(async (): Promise<Row[]> => {
    const out: Row[] = [];
    const chunk = 1000;
    for (let offset = 0; offset < EXPORT_MAX; offset += chunk) {
      const { data, error } = await buildQuery(offset, offset + chunk - 1, false);
      if (error) { toast.error(error.message); break; }
      const batch = (data ?? []) as Row[];
      out.push(...batch);
      if (batch.length < chunk) break;
    }
    return out;
  }, [buildQuery]);

  const pageCount = total === null ? 1 : Math.max(1, Math.ceil(total / pageSize));

  return useMemo(() => ({
    rows, setRows, total, loading, page, setPage, pageSize, setPageSize,
    search, setSearch, sort, setSort, pageCount, reload: load, fetchAllForExport,
  }), [rows, total, loading, page, pageSize, search, sort, pageCount, load, fetchAllForExport]);
}

export type AdminList = ReturnType<typeof useAdminList>;
