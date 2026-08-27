/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Cookie / privacy consent. Stored locally so it applies before sign-in, and
 * mirrored to `user_consents` (GDPR record of consent) whenever a session
 * exists. Analytics and advertising scripts must check `getConsent()` first.
 */
import { supabase } from "@/integrations/supabase/loose";
import { recordAudit, AuditActions } from "@/lib/audit";
import { createLogger } from "@/lib/logger";
import { getItem, setItem, getJSON, setJSON } from '@/lib/safeStorage';

const log = createLogger("consent");

export const POLICY_VERSION = "2026-01";
const STORAGE_KEY = "pn_consent_v1";
const ANON_KEY = "pn_anon_id";

export type Consent = {
  necessary: true;
  analytics: boolean;
  advertising: boolean;
  policyVersion: string;
  decidedAt: string;
};

const listeners = new Set<(c: Consent | null) => void>();

export function anonId(): string {
  let id = getItem(ANON_KEY);
  if (!id) {
    // Browser-compatible unique ID generation
    const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      // Fallback for older browsers
      return `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };
    id = generateId();
    setItem(ANON_KEY, id);
  }
  return id;
}

export function getConsent(): Consent | null {
  const raw = getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Consent;
    if (parsed.policyVersion !== POLICY_VERSION) return null;
    return { ...parsed, necessary: true };
  } catch {
    return null;
  }
}

export function hasConsent(kind: "analytics" | "advertising"): boolean {
  return getConsent()?.[kind] === true;
}

export function onConsentChange(cb: (c: Consent | null) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function setConsent(choice: {
  analytics: boolean;
  advertising: boolean;
}): Promise<Consent> {
  const consent: Consent = {
    necessary: true,
    analytics: choice.analytics,
    advertising: choice.advertising,
    policyVersion: POLICY_VERSION,
    decidedAt: new Date().toISOString(),
  };
  setJSON(STORAGE_KEY, consent);
  for (const l of listeners) l(consent);

  try {
    const { data } = await supabase.auth.getUser();
    const row = {
      user_id: data.user?.id ?? null,
      anon_id: data.user ? null : anonId(),
      necessary: true,
      analytics: consent.analytics,
      advertising: consent.advertising,
      policy_version: POLICY_VERSION,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("user_consents").insert(row);
    if (error) log.warn("could not persist consent", error.message);
    if (data.user) {
      void recordAudit({
        action: AuditActions.consentUpdated,
        entityType: "consent",
        metadata: {
          analytics: consent.analytics,
          advertising: consent.advertising,
          policy_version: POLICY_VERSION,
        },
      });
    }
  } catch (err) {
    log.warn("consent sync failed", err);
  }
  return consent;
}

export function clearConsent() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
  for (const l of listeners) l(null);
}
