/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * SSR-safe localStorage wrapper
 * Prevents "localStorage is not defined" errors during server-side rendering
 * Handles QuotaExceeded errors and private browsing mode gracefully
 */

const isClient = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

/**
 * Safely get an item from localStorage
 * Returns fallback value if not available or on server
 */
export function getItem(key: string, fallback: string = ''): string {
  if (!isClient) return fallback;
  
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch (error) {
    // QuotaExceeded or private browsing mode
    console.warn(`Failed to read localStorage key "${key}":`, error);
    return fallback;
  }
}

/**
 * Safely set an item in localStorage
 * Silently fails if quota exceeded or in private browsing
 */
export function setItem(key: string, value: string): void {
  if (!isClient) return;
  
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // QuotaExceeded or private browsing mode
    console.warn(`Failed to set localStorage key "${key}":`, error);
  }
}

/**
 * Safely get and parse JSON from localStorage
 * Returns fallback value if parsing fails or on server
 */
export function getJSON<T>(key: string, fallback: T): T {
  if (!isClient) return fallback;
  
  try {
    const item = window.localStorage.getItem(key);
    if (item === null) return fallback;
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`Failed to parse localStorage key "${key}":`, error);
    return fallback;
  }
}

/**
 * Safely stringify and set JSON in localStorage
 * Silently fails if quota exceeded or in private browsing
 */
export function setJSON<T>(key: string, value: T): void {
  if (!isClient) return;
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to set localStorage key "${key}":`, error);
  }
}

/**
 * Safely remove an item from localStorage
 */
export function removeItem(key: string): void {
  if (!isClient) return;
  
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove localStorage key "${key}":`, error);
  }
}

/**
 * Check if localStorage is available
 */
export function isAvailable(): boolean {
  return isClient;
}
