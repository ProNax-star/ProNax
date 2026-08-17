/*
 * ProNax - Error Reporting
 * Copyright (c) 2026. All rights reserved.
 * 
 * Commercial Single-End Product License.
 * Reselling, distributing, sublicensing, or sharing this codebase 
 * or any portion thereof without explicit written permission is strictly prohibited.
 */

type ProNaxErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type ProNaxEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: ProNaxErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __pronaxEvents?: ProNaxEvents;
  }
}

export function reportProNaxError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__pronaxEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
}
