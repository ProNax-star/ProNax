import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Gauge, Loader2, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/loose";

type RateEvent = {
  id: string;
  user_id: string | null;
  ip_address: string | null;
  bucket: string;
  hits: number;
  blocked: boolean;
  created_at: string;
};

type IpRule = {
  id: string;
  ip_address: string;
  mode: string;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
};

/** Rate-limit telemetry plus the IP allow/deny list used to stop abuse. */
export function RateLimitTab() {
  const [events, setEvents] = useState<RateEvent[]>([]);
  const [rules, setRules] = useState<IpRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIp, setNewIp] = useState("");
  const [newMode, setNewMode] = useState<"block" | "allow">("block");
  const [newReason, setNewReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [ev, ir] = await Promise.all([
      supabase
        .from("rate_limit_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("ip_rules").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (ev.error) toast.error(ev.error.message);
    if (ir.error) toast.error(ir.error.message);
    setEvents((ev.data as RateEvent[] | null) ?? []);
    setRules((ir.data as IpRule[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const recent = events.filter((e) => new Date(e.created_at).getTime() > since);
    const byBucket = new Map<string, { hits: number; blocked: number }>();
    for (const e of recent) {
      const cur = byBucket.get(e.bucket) ?? { hits: 0, blocked: 0 };
      cur.hits += e.hits || 1;
      if (e.blocked) cur.blocked += 1;
      byBucket.set(e.bucket, cur);
    }
    return {
      total: recent.length,
      blocked: recent.filter((e) => e.blocked).length,
      uniqueIps: new Set(recent.map((e) => e.ip_address).filter(Boolean)).size,
      buckets: [...byBucket.entries()].sort((a, b) => b[1].hits - a[1].hits).slice(0, 8),
    };
  }, [events]);

  const addRule = async () => {
    const ip = newIp.trim();
    if (!/^[0-9a-fA-F:.]{3,45}(\/\d{1,3})?$/.test(ip))
      return toast.error("Enter a valid IP address or CIDR range");
    setBusy(true);
    const { error } = await supabase.from("ip_rules").insert({
      ip_address: ip,
      mode: newMode,
      reason: newReason.trim().slice(0, 300) || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNewIp("");
    setNewReason("");
    toast.success(`IP ${newMode === "block" ? "blocked" : "allow-listed"}`);
    void load();
  };

  const removeRule = async (id: string) => {
    const { error } = await supabase.from("ip_rules").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Rule removed");
    void load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Events (24h)", value: stats.total },
          { label: "Blocked (24h)", value: stats.blocked },
          { label: "Unique IPs", value: stats.uniqueIps },
          { label: "Active IP rules", value: rules.length },
        ].map((s) => (
          <div key={s.label} className="glass-strong rounded-2xl border border-border/40 p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-display font-bold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-strong rounded-2xl border border-border/40 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
          <Gauge className="w-4 h-4 text-primary" /> Top rate-limit buckets (24h)
          <button
            onClick={() => void load()}
            className="ml-auto p-1.5 rounded-lg glass border border-border/40"
            aria-label="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </h2>
        <div className="space-y-2">
          {stats.buckets.map(([bucket, v]) => {
            const max = stats.buckets[0]?.[1].hits || 1;
            return (
              <div key={bucket}>
                <div className="flex justify-between text-xs">
                  <span className="font-mono text-foreground">{bucket}</span>
                  <span className="text-muted-foreground">
                    {v.hits} hits · {v.blocked} blocked
                  </span>
                </div>
                <div className="h-1.5 bg-border/40 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full gradient-primary"
                    style={{ width: `${Math.round((v.hits / max) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
          {stats.buckets.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No rate-limit activity recorded in the last 24 hours.
            </p>
          )}
        </div>
      </div>

      <div className="glass-strong rounded-2xl border border-border/40 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-primary" /> IP allow / deny list
        </h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="203.0.113.10 or 203.0.113.0/24"
            className="flex-1 min-w-[180px] bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary/60"
          />
          <select
            value={newMode}
            onChange={(e) => setNewMode(e.target.value as "block" | "allow")}
            className="bg-muted/30 border border-border/40 rounded-lg px-2 py-2 text-xs"
          >
            <option value="block">Block</option>
            <option value="allow">Allow</option>
          </select>
          <input
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder="Reason"
            className="flex-1 min-w-[140px] bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary/60"
          />
          <button
            onClick={addRule}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold gradient-primary text-primary-foreground disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> Add rule
          </button>
        </div>
        <div className="space-y-2">
          {rules.map((r) => (
            <div
              key={r.id}
              className="glass rounded-xl border border-border/30 p-3 flex items-center gap-3"
            >
              {r.mode === "block" ? (
                <Ban className="w-4 h-4 text-red-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-foreground">{r.ip_address}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {r.mode} · {r.reason ?? "no reason given"} ·{" "}
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => void removeRule(r.id)}
                className="p-1.5 rounded-lg glass border border-border/40"
                aria-label="Remove rule"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          ))}
          {rules.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No IP rules configured.
            </p>
          )}
        </div>
      </div>

      <div className="glass-strong rounded-2xl border border-border/40 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Recent rate-limit events
        </h2>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {events.slice(0, 100).map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 text-[11px] py-1 border-b border-border/20"
            >
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${e.blocked ? "bg-red-500/15 text-red-400" : "bg-primary/15 text-primary"}`}
              >
                {e.blocked ? "blocked" : "allowed"}
              </span>
              <span className="font-mono text-foreground">{e.bucket}</span>
              <span className="text-muted-foreground font-mono">{e.ip_address ?? "—"}</span>
              <span className="text-muted-foreground ml-auto">
                {new Date(e.created_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No events yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
