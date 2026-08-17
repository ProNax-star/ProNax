/*
 * ProNax - Server Entry Point
 * Copyright (c) 2026. All rights reserved.
 * 
 * Commercial Single-End Product License.
 * Reselling, distributing, sublicensing, or sharing this codebase 
 * or any portion thereof without explicit written permission is strictly prohibited.
 */

// Suppress browser extension warnings immediately
if (typeof console !== 'undefined') {
  const originalWarn = console.warn;
  const originalError = console.error;
  
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
  
  console.error = function(...args: any[]) {
    const message = args[0]?.toString() || '';
    // Suppress specific browser extension errors
    if (message.includes('MaxListenersExceededWarning') || 
        message.includes('ObjectMultiplex') ||
        message.includes('orphaned data') ||
        message.includes('contentscript.js')) {
      return; // Suppress these errors
    }
    originalError.apply(console, args);
  };
}

import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { withSecurityHeaders } from "./lib/security/headers";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
