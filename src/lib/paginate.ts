/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Pagination utilities for Supabase queries
 * Provides consistent pagination patterns across the application
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Keyset (cursor) pagination for time-ordered data
 * Ideal for feeds, video lists, and other chronological content
 * 
 * @param query - Supabase query builder
 * @param cursor - Last created_at timestamp from previous page (null for first page)
 * @param limit - Number of items per page (default 24)
 * @returns Query with keyset pagination applied
 */
export function keysetPage<T>(
  query: any,
  cursor: string | null,
  limit: number = 24
): any {
  let paginated = query.order('created_at', { ascending: false }).limit(limit);
  
  if (cursor) {
    paginated = paginated.lt('created_at', cursor);
  }
  
  return paginated;
}

/**
 * Offset-based pagination for admin tables and search results
 * Includes total count for pagination UI
 * 
 * @param query - Supabase query builder
 * @param page - Page number (0-indexed)
 * @param pageSize - Number of items per page (default 50)
 * @returns Query with offset pagination and count
 */
export function offsetPage<T>(
  query: any,
  page: number = 0,
  pageSize: number = 50
): any {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  
  return query
    .range(from, to)
    .order('created_at', { ascending: false });
}

/**
 * Debounce utility for search inputs
 * Delays execution until user stops typing
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Build server-side search filter for multiple columns
 * Uses ILIKE for case-insensitive partial matching
 */
export function buildSearchFilter(
  searchTerm: string,
  columns: string[]
): string {
  if (!searchTerm.trim()) return '';
  
  const term = searchTerm.trim();
  const conditions = columns.map(col => `${col}.ilike.%${term}%`);
  return conditions.join(',');
}

/**
 * Pagination state type for React components
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/**
 * Calculate pagination metadata
 */
export function getPaginationMeta(
  page: number,
  pageSize: number,
  total: number
): PaginationState {
  return {
    page,
    pageSize,
    total,
    hasMore: (page + 1) * pageSize < total,
  };
}
