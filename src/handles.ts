/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * ProNax handle system.
 *
 * Format rules (mirrored by `public.is_handle_valid` in the database):
 *   - 3–30 characters
 *   - lowercase a-z, 0-9, dot and underscore only
 *   - cannot start or end with a dot/underscore, no consecutive dots
 *
 * Availability, reserved-word enforcement and suggestions are all resolved
 * server-side. The client never invents a handle with `Math.random()`.
 */
import { supabase as _supabase } from '@/integrations/supabase/loose';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;
export const HANDLE_COOLDOWN_DAYS = 14;

/** Kept in sync with the `public.reserved_handles` table (client-side hint only). */
export const RESERVED_HANDLES = [
  'admin', 'api', 'studio', 'watch', 'shorts', 'live', 'wallet', 'auth',
  'settings', 'explore', 'trending', 'p', 'sound', 'playlist', 'playlists',
  'channel', 'profile', 'pronax', 'support', 'help', 'about', 'login',
  'logout', 'signup', 'security', 'privacy', 'appeal', 'history', 'likes',
  'saved', 'subscriptions', 'upload', 'root', 'system', 'moderator', 'mod',
  'staff',
] as const;

const HANDLE_RE = /^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/;

export function normalizeHandle(input: string): string {
  return (input || '').trim().toLowerCase().replace(/\s+/g, '');
}

/** Strips characters that are never allowed — used for live input sanitising. */
export function sanitizeHandleInput(input: string): string {
  return normalizeHandle(input).replace(/[^a-z0-9._]/g, '').slice(0, HANDLE_MAX);
}

export type HandleValidation = { valid: true } | { valid: false; error: string };

export function validateHandleFormat(input: string): HandleValidation {
  const h = normalizeHandle(input);
  if (h.length < HANDLE_MIN) return { valid: false, error: `Handle must be at least ${HANDLE_MIN} characters.` };
  if (h.length > HANDLE_MAX) return { valid: false, error: `Handle must be at most ${HANDLE_MAX} characters.` };
  if (!/^[a-z0-9._]+$/.test(h)) return { valid: false, error: 'Only lowercase letters, numbers, dots and underscores are allowed.' };
  if (h.startsWith('.') || h.endsWith('.')) return { valid: false, error: 'Handle cannot start or end with a dot.' };
  if (h.startsWith('_') || h.endsWith('_')) return { valid: false, error: 'Handle cannot start or end with an underscore.' };
  if (h.includes('..')) return { valid: false, error: 'Handle cannot contain consecutive dots.' };
  if (!HANDLE_RE.test(h)) return { valid: false, error: 'That handle format is not allowed.' };
  if ((RESERVED_HANDLES as readonly string[]).includes(h)) return { valid: false, error: `"${h}" is a reserved word.` };
  return { valid: true };
}

/**
 * Server-side availability check. Uses the `is_handle_available` security
 * definer function; falls back to a direct (RLS-bound) lookup when the
 * function has not been deployed yet.
 */
export async function checkHandleAvailable(input: string): Promise<boolean> {
  const h = normalizeHandle(input);
  const format = validateHandleFormat(h);
  if (!format.valid) return false;

  const { data, error } = await supabase.rpc('is_handle_available', { _handle: h });
  if (!error && typeof data === 'boolean') return data;

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .ilike('handle', h)
    .maybeSingle();
  return !existing;
}

/** Availability-checked suggestions produced by the database, never randomised client-side. */
export async function suggestHandles(base: string, limit = 5): Promise<string[]> {
  const cleaned = sanitizeHandleInput(base).replace(/^[._]+|[._]+$/g, '') || 'creator';

  const { data, error } = await supabase.rpc('suggest_handles', { _base: cleaned, _limit: limit });
  if (!error && Array.isArray(data)) {
    return data
      .map((row: unknown) => (typeof row === 'string' ? row : (row as { handle?: string })?.handle))
      .filter((h): h is string => Boolean(h))
      .slice(0, limit);
  }

  // Deterministic fallback: fixed candidate ladder, filtered by a taken-check.
  const stem = cleaned.slice(0, 22);
  const candidates = [
    stem,
    `${stem}.official`,
    `${stem}.tv`,
    `${stem}.hq`,
    `${stem}.live`,
    `${stem}.studio`,
    ...Array.from({ length: 20 }, (_, i) => `${stem.slice(0, 26)}${i + 1}`),
  ].filter((c) => validateHandleFormat(c).valid);

  const { data: taken } = await supabase.from('profiles').select('handle').in('handle', candidates);
  const takenSet = new Set(((taken ?? []) as { handle?: string }[]).map((r) => String(r.handle ?? '').toLowerCase()));
  return candidates.filter((c) => !takenSet.has(c)).slice(0, limit);
}

export type ChangeHandleResult =
  | { ok: true; handle: string }
  | { ok: false; error: 'invalid' | 'taken' | 'cooldown' | 'not_authenticated' | 'unknown'; message: string; availableAt?: string };

/** Atomic handle change with reserved-word, uniqueness and cooldown enforcement. */
export async function changeHandle(input: string): Promise<ChangeHandleResult> {
  const h = normalizeHandle(input);
  const format = validateHandleFormat(h);
  if (!format.valid) return { ok: false, error: 'invalid', message: format.error };

  const { data, error } = await supabase.rpc('change_handle', { _handle: h });

  if (!error && data && typeof data === 'object') {
    const res = data as { ok?: boolean; handle?: string; error?: string; available_at?: string };
    if (res.ok) return { ok: true, handle: res.handle ?? h };
    if (res.error === 'cooldown') {
      const when = res.available_at ? new Date(res.available_at).toLocaleDateString() : '';
      return {
        ok: false,
        error: 'cooldown',
        message: `You can change your handle again${when ? ` on ${when}` : ` after ${HANDLE_COOLDOWN_DAYS} days`}.`,
        availableAt: res.available_at,
      };
    }
    if (res.error === 'taken') return { ok: false, error: 'taken', message: `"${h}" is already taken.` };
    if (res.error === 'not_authenticated') return { ok: false, error: 'not_authenticated', message: 'Please sign in first.' };
    return { ok: false, error: 'invalid', message: 'That handle is not allowed.' };
  }

  // Fallback path when the RPC is not deployed: check + update directly.
  const available = await checkHandleAvailable(h);
  if (!available) return { ok: false, error: 'taken', message: `"${h}" is already taken.` };

  const { data: userData } = await supabase.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) return { ok: false, error: 'not_authenticated', message: 'Please sign in first.' };

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ handle: h, handle_changed_at: new Date().toISOString() })
    .eq('id', uid);
  if (updateError) return { ok: false, error: 'unknown', message: updateError.message };
  return { ok: true, handle: h };
}

/** Days remaining before the handle can be changed again, or 0. */
export function handleCooldownDaysLeft(handleChangedAt: string | null | undefined): number {
  if (!handleChangedAt) return 0;
  const next = new Date(handleChangedAt).getTime() + HANDLE_COOLDOWN_DAYS * 86_400_000;
  const diff = next - Date.now();
  return diff <= 0 ? 0 : Math.ceil(diff / 86_400_000);
}
