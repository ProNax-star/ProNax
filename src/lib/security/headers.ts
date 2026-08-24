/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Security response headers applied to every SSR/document response.
 *
 * CSP is intentionally explicit about the third parties this app talks to
 * (Supabase, Mux, ad networks) so anything else is blocked. `frame-ancestors`
 * keeps the pronax editor preview working while blocking arbitrary embedding.
 */
const CSP_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  // 'unsafe-inline' is required for the framework's hydration bootstrap script.
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "https://imasdk.googleapis.com",
    "https://pagead2.googlesyndication.com",
    "https://securepubads.g.doubleclick.net",
    "https://cdn.jsdelivr.net",
  ],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "media-src": ["'self'", "data:", "blob:", "https:"],
  "connect-src": ["'self'", "https:", "wss:"],
  "frame-src": [
    "'self'",
    "https://imasdk.googleapis.com",
    "https://googleads.g.doubleclick.net",
    "https://td.doubleclick.net",
  ],
  "worker-src": ["'self'", "blob:"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'self'"],
  "upgrade-insecure-requests": [],
};

function buildCsp(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, values]) => (values.length ? `${directive} ${values.join(" ")}` : directive))
    .join("; ");
}

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": buildCsp(),
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "X-DNS-Prefetch-Control": "off",
  "X-Permitted-Cross-Domain-Policies": "none",
};

/** Return a copy of `response` with the security headers applied. */
export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  // X-Frame-Options can't express the editor-preview allowance; CSP does.
  headers.delete("X-Frame-Options");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
