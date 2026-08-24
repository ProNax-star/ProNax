/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Money — the single source of truth for currency formatting and arithmetic.
 *
 * Rules:
 *  - Never hardcode a currency symbol or an amount in the UI. Always format
 *    through `formatMoney` with a currency code that came from data.
 *  - Never do float arithmetic on money. Convert to integer minor units with
 *    `toMinor`, add/subtract there, and convert back with `fromMinor`.
 *  - Amounts stored in Postgres are numeric(14,4); `SCALE` mirrors that.
 */

export const MONEY_SCALE = 4;
export const DEFAULT_CURRENCY = 'USD';

/** Locale of the current user (browser), with an SSR-safe fallback. */
export function getUserLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'en-US';
}

/** Minor-unit exponent for a currency (e.g. USD -> 2, JPY -> 0). */
export function currencyDigits(currency: string, locale = getUserLocale()): number {
  try {
    const opts = new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions();
    return opts.maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

/** Parse anything DB/JSON-ish into a finite number; never returns NaN. */
export function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Convert a decimal amount to integer minor units (rounding half away from zero). */
export function toMinor(amount: unknown, currency = DEFAULT_CURRENCY): number {
  const n = toNumber(amount);
  const factor = 10 ** currencyDigits(currency);
  return Math.round(n * factor);
}

/** Convert integer minor units back to a decimal amount. */
export function fromMinor(minor: number, currency = DEFAULT_CURRENCY): number {
  const factor = 10 ** currencyDigits(currency);
  return toNumber(minor) / factor;
}

/** Sum a list of money amounts without float drift. */
export function sumMoney(amounts: Array<unknown>, currency = DEFAULT_CURRENCY): number {
  const total = amounts.reduce<number>((acc, a) => acc + toMinor(a, currency), 0);
  return fromMinor(total, currency);
}

/** Round to the storage scale (numeric(14,4)). */
export function roundMoney(amount: unknown, scale = MONEY_SCALE): number {
  const n = toNumber(amount);
  const f = 10 ** scale;
  return Math.round(n * f) / f;
}

export interface FormatMoneyOptions {
  currency?: string | null;
  locale?: string;
  /** Show sub-cent precision (used for per-view ad revenue). */
  precise?: boolean;
  /** Prefix positive values with "+". */
  signed?: boolean;
}

/**
 * Format a money amount for display. Undefined/null/NaN render as a
 * well-formed zero for the given currency — never "NaN" or "undefined".
 */
export function formatMoney(amount: unknown, options: FormatMoneyOptions = {}): string {
  const currency = options.currency || DEFAULT_CURRENCY;
  const locale = options.locale || getUserLocale();
  const value = toNumber(amount, 0);
  const digits = currencyDigits(currency, locale);
  const fractionDigits = options.precise ? Math.max(digits, MONEY_SCALE) : digits;

  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    formatted = `${currency} ${value.toFixed(fractionDigits)}`;
  }

  if (options.signed && value > 0) return `+${formatted}`;
  return formatted;
}

/** Compact display for dashboards (e.g. $12.4K). */
export function formatMoneyCompact(amount: unknown, currency = DEFAULT_CURRENCY, locale = getUserLocale()): string {
  const value = toNumber(amount, 0);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return formatMoney(value, { currency, locale });
  }
}

/** Plain number formatting (views, impressions) with a safe fallback. */
export function formatCount(value: unknown, locale = getUserLocale()): string {
  return new Intl.NumberFormat(locale).format(toNumber(value, 0));
}
