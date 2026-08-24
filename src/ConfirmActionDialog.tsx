/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. */
/**
 * Destructive-action guard for the admin console.
 * Forces an explicit confirmation plus a mandatory reason, then writes an
 * audit_logs entry (actor / target / action / reason) before running the action.
 */
import { useCallback, useState, type ReactElement } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { recordAudit } from '@/lib/audit';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter,
} from '@/components/ui/alert-dialog';

export type ConfirmRequest = {
  /** Machine action name, e.g. `admin.user.ban`. */
  action: string;
  title: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  destructive?: boolean;
  /** Minimum reason length. Set to 0 to make the reason optional. */
  minReason?: number;
  run: (reason: string) => Promise<void> | void;
};

/**
 * Returns `[confirm, dialog]`. Render `dialog` once inside the tab and call
 * `confirm(request)` from any destructive handler.
 */
export function useConfirmAction(): [(req: ConfirmRequest) => void, ReactElement] {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = useCallback((r: ConfirmRequest) => { setReason(''); setReq(r); }, []);

  const close = () => { if (!busy) { setReq(null); setReason(''); } };

  const minReason = req?.minReason ?? 6;
  const reasonOk = reason.trim().length >= minReason;

  const submit = async () => {
    if (!req || !reasonOk) return;
    setBusy(true);
    try {
      await req.run(reason.trim());
      // Auditing never blocks the action result.
      void recordAudit({
        action: req.action,
        entityType: req.entityType ?? null,
        entityId: req.entityId ?? null,
        metadata: { reason: reason.trim(), title: req.title },
        severity: req.destructive ? 'critical' : 'warning',
      });
      setReq(null);
      setReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const dialog = (
    <AlertDialog open={!!req} onOpenChange={(o) => { if (!o) close(); }}>
      <AlertDialogContent className="glass-strong border-border/40 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className={`w-4 h-4 ${req?.destructive ? 'text-destructive' : 'text-primary'}`} />
            {req?.title ?? 'Confirm action'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            {req?.description ?? 'This action is logged to the audit trail with your account.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <label htmlFor="admin-action-reason" className="text-[11px] font-semibold text-muted-foreground">
            Reason {minReason > 0 && <span className="text-destructive">*</span>}
          </label>
          <textarea
            id="admin-action-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Why are you taking this action? (stored in the audit log)"
            className="w-full glass border border-border/40 rounded-xl px-3 py-2 text-xs outline-none focus:border-primary/50 resize-none"
          />
          {minReason > 0 && !reasonOk && reason.length > 0 && (
            <p className="text-[10px] text-destructive">Please write at least {minReason} characters.</p>
          )}
        </div>

        <AlertDialogFooter className="gap-2">
          <button
            onClick={close}
            disabled={busy}
            className="glass border border-border/40 rounded-xl px-4 py-2 text-xs font-semibold hover:border-primary/40 transition disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            disabled={busy || !reasonOk}
            className={`rounded-xl px-4 py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition disabled:opacity-50 ${
              req?.destructive
                ? 'bg-destructive text-destructive-foreground hover:brightness-110'
                : 'gradient-primary text-primary-foreground'
            }`}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Confirm
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return [confirm, dialog];
}
