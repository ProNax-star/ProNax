/*
 * ProNax - Error Monitoring Service
 * Copyright (c) 2026. All rights reserved.
 * 
 * Commercial Single-End Product License.
 * Reselling, distributing, sublicensing, or sharing this codebase 
 * or any portion thereof without explicit written permission is strictly prohibited.
 */

/**
 * Centralized error tracking.
 *
 * Errors are (a) kept in a small in-memory ring buffer for the admin
 * diagnostics panel, (b) persisted to the `audit_logs` table via the
 * `log_audit_event` RPC so they survive a reload and are queryable by admins,
 * and (c) aggregated by fingerprint so a repeating error is counted rather
 * than flooding the log. Basic navigation/performance timings are reported
 * once per session.
 */
import { createLogger } from "./logger";

const log = createLogger("error-monitor");

export interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  context?: Record<string, unknown>;
  timestamp: string;
  fingerprint: string;
  count: number;
}

const FLOOD_WINDOW_MS = 60_000;
const MAX_PERSISTED_PER_WINDOW = 10;

function fingerprintOf(message: string, stack?: string): string {
  const head = (stack ?? "").split("\n").slice(0, 3).join("|");
  return `${message}::${head}`.slice(0, 400);
}

class ErrorMonitorService {
  private reports: ErrorReport[] = [];
  private readonly maxLocalLogs = 50;
  private counts = new Map<string, number>();
  private persistedInWindow = 0;
  private windowStartedAt = Date.now();
  private installed = false;

  /** Attach global handlers for uncaught errors, rejections and perf timings. */
  public install() {
    if (this.installed || typeof window === "undefined") return;
    this.installed = true;

    try {
      // Suppress EventEmitter warnings from browser extensions
      const originalWarn = console.warn;
      console.warn = function(...args: any[]) {
        const message = args[0]?.toString() || '';
        // Suppress specific browser extension warnings
        if (message.includes('MaxListenersExceededWarning') || 
            message.includes('ObjectMultiplex') ||
            message.includes('orphaned data') ||
            message.includes('contentscript.js')) {
          return; // Suppress these warnings
        }
        originalWarn.apply(console, args);
      };

      // Increase EventEmitter listener limit to prevent memory leak warnings
      // These warnings are often from browser extensions (like contentScript.js)
      if (typeof (window as any).EventEmitter !== 'undefined') {
        (window as any).EventEmitter.defaultMaxListeners = 50;
      }

      // Also try to set on the global scope if available
      if (typeof (globalThis as any).EventEmitter !== 'undefined') {
        (globalThis as any).EventEmitter.defaultMaxListeners = 50;
      }

      // Prevent duplicate listener registration during HMR
      const handleError = (event: ErrorEvent) => {
        this.captureException(event.error ?? new Error(event.message), {
          context: { source: "window.error", filename: event.filename, line: event.lineno },
        });
      };

      const handleRejection = (event: PromiseRejectionEvent) => {
        this.captureException(event.reason ?? new Error("Unhandled promise rejection"), {
          context: { source: "unhandledrejection" },
        });
      };

      window.addEventListener("error", handleError as EventListener);
      window.addEventListener("unhandledrejection", handleRejection as EventListener);

      // One-shot performance snapshot after the page settles.
      window.setTimeout(() => void this.reportPerformance(), 4000);
    } catch (e) {
      console.error('[errorMonitor] Failed to install:', e);
    }
  }

  public captureException(
    error: Error | unknown,
    errorInfo?: { componentStack?: string; context?: Record<string, unknown> },
  ) {
    const err = error instanceof Error ? error : new Error(String(error));
    const fingerprint = fingerprintOf(err.message, err.stack);
    const count = (this.counts.get(fingerprint) ?? 0) + 1;
    this.counts.set(fingerprint, count);

    const report: ErrorReport = {
      message: err.message,
      stack: err.stack,
      componentStack: errorInfo?.componentStack,
      context: errorInfo?.context,
      timestamp: new Date().toISOString(),
      fingerprint,
      count,
    };

    this.reports.unshift(report);
    if (this.reports.length > this.maxLocalLogs) this.reports.pop();

    log.error(report.message, report.context ?? {});

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pn_error_captured", { detail: report }));
    }

    // Persist the first occurrence, then only every 10th repeat.
    if (count === 1 || count % 10 === 0) void this.persist(report);
  }

  private resetWindowIfNeeded() {
    if (Date.now() - this.windowStartedAt > FLOOD_WINDOW_MS) {
      this.windowStartedAt = Date.now();
      this.persistedInWindow = 0;
    }
  }

  private async persist(report: ErrorReport) {
    this.resetWindowIfNeeded();
    if (this.persistedInWindow >= MAX_PERSISTED_PER_WINDOW) return;
    this.persistedInWindow += 1;
    try {
      const { recordAudit, AuditActions } = await import("./audit");
      await recordAudit({
        action: AuditActions.clientError,
        entityType: "error",
        entityId: report.fingerprint.slice(0, 128),
        severity: "critical",
        metadata: {
          message: report.message.slice(0, 500),
          stack: report.stack?.slice(0, 2000),
          component_stack: report.componentStack?.slice(0, 1000),
          occurrences: report.count,
          url: typeof location !== "undefined" ? location.pathname : undefined,
          context: report.context,
        },
      });
    } catch (e) {
      /* offline / signed out — the in-memory buffer still holds it */
      console.debug('[errorMonitor] Failed to persist error:', e);
    }
  }

  /** Report Core-Web-Vitals-adjacent navigation timings once per session. */
  public async reportPerformance() {
    if (typeof performance === "undefined") return;
    try {
      const nav = performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined;
      if (!nav) return;
      const paint = performance.getEntriesByType("paint");
      const fcp = paint.find((p) => p.name === "first-contentful-paint")?.startTime;
      const metrics = {
        ttfb: Math.round(nav.responseStart),
        dom_content_loaded: Math.round(nav.domContentLoadedEventEnd),
        load_complete: Math.round(nav.loadEventEnd),
        first_contentful_paint: fcp ? Math.round(fcp) : undefined,
        path: typeof location !== "undefined" ? location.pathname : undefined,
      };
      log.debug("performance", metrics);
      try {
        const { recordAudit } = await import("./audit");
        await recordAudit({
          action: "client.performance",
          entityType: "page",
          entityId: metrics.path ?? "/",
          metadata: metrics,
        });
      } catch (e) {
        /* not signed in — skip */
        console.debug('[errorMonitor] Failed to report performance:', e);
      }
    } catch (e) {
      console.debug('[errorMonitor] Failed to collect performance metrics:', e);
    }
  }

  public getRecentErrors(): ErrorReport[] {
    return [...this.reports];
  }

  public clearErrors(): void {
    this.reports = [];
    this.counts.clear();
  }
}

export const errorMonitor = new ErrorMonitorService();
