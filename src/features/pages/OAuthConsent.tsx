import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Minimal typed shim for the beta supabase.auth.oauth namespace.
type OAuthClient = { name?: string; client_uri?: string; logo_uri?: string };
type OAuthDetails = {
  client?: OAuthClient;
  redirect_uri?: string;
  scope?: string | string[];
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { redirect_url?: string; redirect_to?: string };
type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: any }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id') ?? '';
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError('Missing authorization_id');
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = '/auth?next=' + encodeURIComponent(next);
        return;
      }
      setUserEmail(sess.session.user.email ?? null);
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message || 'Could not load authorization');
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message || 'Authorization failed');
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError('No redirect returned by the authorization server.');
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-strong rounded-2xl p-6 max-w-md w-full border border-destructive/40 text-center">
          <h1 className="text-lg font-display font-bold mb-2">Authorization error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </main>
    );
  }

  const clientName = details.client?.name ?? 'An app';
  const scopes = Array.isArray(details.scope)
    ? details.scope
    : (details.scope ?? '').split(/\s+/).filter(Boolean);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-8 max-w-md w-full border border-primary/30 glow-border-primary"
      >
        <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-4 mx-auto">
          <ShieldCheck className="w-7 h-7 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-display font-bold text-center mb-1">
          Connect {clientName} to Pro Nax
        </h1>
        <p className="text-xs text-muted-foreground text-center mb-6">
          Signed in as <span className="text-foreground">{userEmail ?? 'your account'}</span>
        </p>

        <div className="rounded-xl border border-border/40 p-4 mb-5 text-sm space-y-2">
          <p>
            <span className="text-foreground font-medium">{clientName}</span> will be able to call
            Pro Nax's enabled tools while you are signed in.
          </p>
          {scopes.length > 0 && (
            <ul className="text-xs text-muted-foreground list-disc list-inside">
              {scopes.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            This does not bypass Pro Nax's permissions or backend policies.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 h-10 rounded-xl border border-border/40 text-sm font-medium hover:bg-secondary/20 transition disabled:opacity-50"
          >
            <X className="w-4 h-4 inline mr-1" /> Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 h-10 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Approve'}
          </button>
        </div>
      </motion.div>
    </main>
  );
}
