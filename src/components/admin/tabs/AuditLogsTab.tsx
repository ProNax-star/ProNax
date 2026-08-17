import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, ScrollText, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/loose";

type AuditRow = {
  id: string;
  user_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  severity: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-primary/15 text-primary",
  warning: "bg-amber-500/15 text-amber-400",
  critical: "bg-red-500/15 text-red-400",
};

/** Full application audit trail (auth, privacy, moderation and client errors). */
export function AuditLogsTab() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState<"all" | "info" | "warning" | "critical">("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (severity !== "all") q = q.eq("severity", severity);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as AuditRow[] | null) ?? []);
    setLoading(false);
  }, [severity]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel(`admin:audit-logs-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_logs" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.action, r.actor_email, r.entity_type, r.entity_id, r.ip_address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [rows, query]);

  return (
    <div className="glass-strong rounded-2xl border border-border/40 p-5">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 flex-1">
          <ScrollText className="w-4 h-4 text-primary" /> Application audit trail
          <span className="text-[10px] text-emerald-400 font-normal normal-case">● live</span>
        </h2>
        <div className="flex items-center gap-2 bg-muted/30 border border-border/40 rounded-lg px-2 py-1.5">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by action, email, IP…"
            className="bg-transparent text-xs focus:outline-none w-48"
          />
        </div>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as typeof severity)}
          className="bg-muted/30 border border-border/40 rounded-lg px-2 py-1.5 text-xs"
        >
          <option value="all">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <button
          onClick={() => void load()}
          className="p-2 rounded-lg glass border border-border/40"
          aria-label="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2 max-h-[70vh] overflow-y-auto">
          {filtered.map((r) => (
            <div key={r.id} className="glass rounded-xl border border-border/30 p-3">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${SEVERITY_STYLES[r.severity] ?? SEVERITY_STYLES.info}`}
                >
                  {r.severity}
                </span>
                <span className="font-semibold font-mono">{r.action}</span>
                {r.entity_type && (
                  <span className="text-muted-foreground">
                    {r.entity_type}
                    {r.entity_id ? (
                      <span className="font-mono"> · {r.entity_id.slice(0, 48)}</span>
                    ) : null}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                <span>{r.actor_email ?? r.user_id ?? "anonymous"}</span>
                {r.ip_address && <span className="font-mono">{r.ip_address}</span>}
                <span>{new Date(r.created_at).toLocaleString()}</span>
              </div>
              {r.metadata && Object.keys(r.metadata).length > 0 && (
                <pre className="text-[10px] text-muted-foreground mt-2 bg-muted/20 rounded p-2 overflow-x-auto max-h-40">
                  {JSON.stringify(r.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No audit events match this filter.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
