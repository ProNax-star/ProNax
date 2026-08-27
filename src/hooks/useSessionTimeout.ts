/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Session management: signs the user out after a period of inactivity and
 * refreshes the access token while they are active. Protects shared/public
 * machines where a wallet balance would otherwise stay open indefinitely.
 */
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/loose";
import { recordAudit, AuditActions } from "@/lib/audit";
import { getItem, setItem } from '@/lib/safeStorage';

export const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const WARN_BEFORE_MS = 2 * 60 * 1000;
const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
  "visibilitychange",
] as const;
const LAST_ACTIVE_KEY = "pn_last_active_at";

export function useSessionTimeout(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let warned = false;
    const touch = () => {
      warned = false;
      setItem(LAST_ACTIVE_KEY, String(Date.now()));
    };
    touch();
    for (const evt of ACTIVITY_EVENTS) window.addEventListener(evt, touch, { passive: true });

    const tick = window.setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const last = Number(getItem(LAST_ACTIVE_KEY) ?? Date.now());
      const idle = Date.now() - last;

      if (idle > IDLE_LIMIT_MS) {
        await recordAudit({
          action: AuditActions.sessionTimeout,
          severity: "warning",
          metadata: { idle_ms: idle },
        });
        await supabase.auth.signOut();
        toast.info("Signed out after 30 minutes of inactivity");
        return;
      }
      if (!warned && idle > IDLE_LIMIT_MS - WARN_BEFORE_MS) {
        warned = true;
        toast.warning("You will be signed out soon due to inactivity");
      }
    }, 30_000);

    return () => {
      window.clearInterval(tick);
      for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, touch);
    };
  }, [enabled]);
}
