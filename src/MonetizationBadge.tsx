/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { CheckCircle2, DollarSign, Clock, XCircle, ShieldAlert } from 'lucide-react';

export type MonetizationStatus =
  | 'monetized'
  | 'ready_for_ads'
  | 'pending_review'
  | 'not_approved';

export function deriveMonetizationStatus(v: {
  views_count?: number | null;
  monetization_enabled?: boolean | null;
  visibility?: string | null;
}): MonetizationStatus {
  const views = v.views_count ?? 0;
  if (v.visibility === 'private') return 'not_approved';
  if (v.monetization_enabled && views >= 100) return 'monetized';
  if (views >= 100) return 'ready_for_ads';
  return 'pending_review';
}

const META: Record<MonetizationStatus, {
  label: string; icon: any; bg: string; text: string; ring: string;
}> = {
  monetized: {
    label: 'Monetized', icon: DollarSign,
    bg: 'bg-emerald-500/15', text: 'text-emerald-400', ring: 'ring-emerald-400/30',
  },
  ready_for_ads: {
    label: 'Ready for Ads', icon: CheckCircle2,
    bg: 'bg-cyan-500/15', text: 'text-cyan-300', ring: 'ring-cyan-400/30',
  },
  pending_review: {
    label: 'Pending Review', icon: Clock,
    bg: 'bg-amber-500/15', text: 'text-amber-300', ring: 'ring-amber-400/30',
  },
  not_approved: {
    label: 'Not Approved', icon: XCircle,
    bg: 'bg-destructive/15', text: 'text-destructive', ring: 'ring-destructive/30',
  },
};

export function MonetizationBadge({ status }: { status: MonetizationStatus }) {
  const m = META[status];
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${m.bg} ${m.text} ${m.ring}`}
      title={m.label}
    >
      <Icon className="w-3 h-3" /> {m.label}
    </span>
  );
}

export function MonetizationChecklist({
  views, monetizationEnabled, visibility,
}: { views: number; monetizationEnabled: boolean; visibility: string }) {
  const items = [
    { ok: visibility !== 'private', label: 'Public / Unlisted visibility' },
    { ok: views >= 100, label: 'At least 100 valid views' },
    { ok: monetizationEnabled, label: 'Monetization enabled by creator' },
    { ok: true, label: 'Original content — passes automated review' },
  ];
  return (
    <ul className="space-y-1.5 text-xs">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          {i.ok ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}
          <span className={i.ok ? 'text-foreground' : 'text-muted-foreground'}>{i.label}</span>
        </li>
      ))}
    </ul>
  );
}
