/*
 * ProNax - Audit Trail Helper
 * Copyright (c) 2026. All rights reserved.
 * 
 * Commercial Single-End Product License.
 * Reselling, distributing, sublicensing, or sharing this codebase 
 * or any portion thereof without explicit written permission is strictly prohibited.
 */

/**
 * Audit trail helper. Writes to the `audit_logs` table through the
 * `log_audit_event` security-definer RPC, which stamps the acting user and
 * rate-limits floods server-side.
 */
import { supabase } from "@/integrations/supabase/loose";
import { createLogger } from "@/lib/logger";

const log = createLogger("audit");

export type AuditSeverity = "info" | "warning" | "critical";

export type AuditEvent = {
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  severity?: AuditSeverity;
};

function userAgent(): string | undefined {
  return typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 512) : undefined;
}

/** Record an audit event. Never throws — auditing must not break a user flow. */
export async function recordAudit(event: AuditEvent): Promise<void> {
  try {
    const { error } = await supabase.rpc("log_audit_event", {
      p_action: event.action,
      p_entity_type: event.entityType ?? undefined,
      p_entity_id: event.entityId ?? undefined,
      p_metadata: (event.metadata ?? {}) as never,
      p_severity: event.severity ?? "info",
      p_user_agent: userAgent(),
    });
    if (error) log.warn("failed to record audit event", event.action, error.message);
  } catch (err) {
    log.warn("audit rpc threw", err);
  }
}

export const AuditActions = {
  signIn: "auth.sign_in",
  signInFailed: "auth.sign_in_failed",
  signUp: "auth.sign_up",
  signOut: "auth.sign_out",
  passwordChanged: "auth.password_changed",
  passwordResetRequested: "auth.password_reset_requested",
  emailChangeRequested: "auth.email_change_requested",
  verificationResent: "auth.verification_resent",
  sessionRevoked: "auth.session_revoked",
  sessionsRevokedAll: "auth.sessions_revoked_all",
  sessionTimeout: "auth.session_timeout",
  consentUpdated: "privacy.consent_updated",
  dataExported: "privacy.data_exported",
  deletionRequested: "privacy.deletion_requested",
  deletionCancelled: "privacy.deletion_cancelled",
  adminAction: "admin.action",
  moderationDecision: "moderation.decision",
  clientError: "client.error",
} as const;
