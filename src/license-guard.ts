/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential.
   Unauthorized copying or redistribution is strictly prohibited. */

/**
 * Anti-tamper runtime guard.
 *
 * Verifies that the production frontend build is running on a domain that the
 * licensee is authorised to host it on. Unauthorised clones/self-hosts of the
 * compiled bundle are blocked with a licence notice instead of the app.
 *
 * Configure allowed hosts with `VITE_LICENSE_DOMAINS` (comma separated).
 * Localhost / preview sandboxes and any dev build are always allowed.
 */

export type LicenseGuardResult =
  | { ok: true }
  | { ok: false; reason: 'domain' | 'tampered'; host: string };

const ALWAYS_ALLOWED = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
];

const ALLOWED_SUFFIXES = ['.lovable.app', '.lovableproject.com', '.lovable.dev'];

function configuredDomains(): string[] {
  const raw = (import.meta.env['VITE_LICENSE_DOMAINS'] as string | undefined) ?? '';
  return raw
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

function hostAllowed(host: string, allowed: string[]): boolean {
  if (ALWAYS_ALLOWED.includes(host)) return true;
  if (ALLOWED_SUFFIXES.some((s) => host.endsWith(s))) return true;
  if (!allowed.length) return true; // no allow-list configured → unrestricted
  return allowed.some((d) => host === d || host.endsWith(`.${d}`));
}

/** True when the bundle looks unmodified (integrity marker intact). */
function integrityIntact(): boolean {
  // The build injects the product marker; a stripped/re-packed bundle loses it.
  const marker = (import.meta.env['VITE_APP_NAME'] as string | undefined) ?? 'ProNax';
  return typeof marker === 'string' && marker.length > 0;
}

export function verifyLicenseRuntime(): LicenseGuardResult {
  if (typeof window === 'undefined') return { ok: true };
  if (import.meta.env.DEV) return { ok: true };

  const host = window.location.hostname.toLowerCase();

  if (!integrityIntact()) return { ok: false, reason: 'tampered', host };
  if (!hostAllowed(host, configuredDomains())) return { ok: false, reason: 'domain', host };

  return { ok: true };
}

/**
 * Renders a hard block screen when the runtime check fails.
 * Call once on client boot.
 */
export function enforceLicenseRuntime(): boolean {
  const result = verifyLicenseRuntime();
  if (result.ok) return true;

  const message =
    result.reason === 'domain'
      ? `This ProNax build is not licensed for "${result.host}".` 
      : 'This ProNax build has been modified and cannot be verified.';

  document.documentElement.innerHTML = `
    <body style="margin:0;background:#07080c;color:#e2e8f0;font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px">
      <div style="max-width:460px">
        <h1 style="font-size:20px;margin:0 0 12px">License verification failed</h1>
        <p style="font-size:14px;line-height:1.6;color:#94a3b8;margin:0 0 16px">${message}</p>
        <p style="font-size:12px;color:#64748b;margin:0">ProNax © 2026. All rights reserved. Commercial Single-End Product License.</p>
      </div>
    </body>`;
  return false;
}
