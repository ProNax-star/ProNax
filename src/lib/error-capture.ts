/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

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

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
