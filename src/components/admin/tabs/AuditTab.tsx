/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useState, useEffect } from 'react';
import { ScrollText, Loader2, Filter } from 'lucide-react';
import { supabase as _supabase } from '@/integrations/supabase/loose';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

export function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadLogs();
  }, [filter]);

  const loadLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('admin_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (filter !== 'all') {
      query = query.eq('action', filter);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error loading audit logs:', error);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-background border border-border/40 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Actions</option>
            <option value="ban_user">Ban User</option>
            <option value="unban_user">Unban User</option>
            <option value="set_role">Set Role</option>
            <option value="remove_video">Remove Video</option>
            <option value="adjust_wallet">Adjust Wallet</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No audit logs found
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="glass rounded-lg border border-border/30 p-3">
              <div className="flex items-start gap-3">
                <ScrollText className="w-4 h-4 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{log.action}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Target: {log.target_type} ({log.target_id?.slice(0, 8)}...)
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}