/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
// Ad SDK adapter — real revenue accounting layer.
// All CPM / fill-rate figures are derived from actual recorded impressions in
// `revenue_logs` and the ad networks configured in `ad_settings`.
// No simulated, random or demo rates are produced anywhere in this module.

import { supabase } from '@/integrations/supabase/loose';

export type AdNetwork = string;

export interface NetworkRateReview {
  network: AdNetwork;
  networkName: string;
  /** Measured eCPM (USD per 1,000 views) from recorded impressions. */
  cpmPer1kViews: number;
  creatorEarningsPer1k: number;
  platformRevenuePer1k: number;
  /** Share of recorded impressions for this network that produced revenue. */
  fillRate: number;
  /** Total views attributed to this network in the measured window. */
  views: number;
  /** Number of recorded impression rows in the measured window. */
  impressions: number;
  status: 'winning_optimal' | 'active_bid' | 'no_data';
}

export interface AdImpressionResult {
  revenue: number;
  creatorShare: number;
  platformShare: number;
  cpm: number;
  network: AdNetwork;
  filled: boolean;
  fillRate: number;
  creativeId?: string;
  fetchedAt: string;
  networkBreakdown?: NetworkRateReview[];
}

export interface LiveRates {
  cpm: number;
  network: AdNetwork;
  fillRate: number;
  fetchedAt: string;
  creatorSharePct: number;
  platformSharePct: number;
  networkBreakdown: NetworkRateReview[];
}

const RATE_TTL_MS = 60_000;
let cachedRates: { value: LiveRates; expiresAt: number } | null = null;

export const CREATOR_SHARE_PCT = 55;
export const PLATFORM_SHARE_PCT = 45;

/** Measurement window for network performance. */
const WINDOW_DAYS = 30;

const NETWORK_LABELS: Record<string, string> = {
  google_ima: 'Google IMA / AdSense for Video',
  google_adsense: 'Google AdSense',
  adsense: 'Google AdSense',
  adsterra: 'Adsterra',
  propellerads: 'PropellerAds',
  ezoic: 'Ezoic',
  unity: 'Unity Ads',
  applovin: 'AppLovin MAX',
  direct: 'Direct Sponsors',
  custom: 'Custom Ad Tag',
};

export function networkLabel(id: string) {
  return NETWORK_LABELS[id] ?? id.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Aggregate real eCPM / fill-rate per ad network from recorded impressions.
 * Returns an empty array when the platform has not served any paid impression yet.
 */
export async function fetchMultiNetworkLiveRates(): Promise<NetworkRateReview[]> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();

  const [{ data: logs }, { data: slots }] = await Promise.all([
    supabase
      .from('revenue_logs')
      .select('ad_network, gross_revenue, amount_earned, views_count, cpm')
      .gte('created_at', since)
      .limit(10_000),
    supabase.from('ad_settings').select('network, enabled'),
  ]);

  type Agg = { gross: number; views: number; rows: number; filledRows: number };
  const byNetwork = new Map<string, Agg>();

  for (const row of logs ?? []) {
    const id = (row.ad_network || 'direct').toString();
    const agg = byNetwork.get(id) ?? { gross: 0, views: 0, rows: 0, filledRows: 0 };
    const gross = Number(row.gross_revenue ?? row.amount_earned ?? 0);
    agg.gross += gross;
    agg.views += Number(row.views_count ?? 0);
    agg.rows += 1;
    if (gross > 0) agg.filledRows += 1;
    byNetwork.set(id, agg);
  }

  // Configured-but-not-yet-earning networks are listed with zeroed metrics
  // so the admin can see they are connected, without inventing numbers.
  for (const s of slots ?? []) {
    const id = (s.network || '').toString();
    if (!id || byNetwork.has(id) || !s.enabled) continue;
    byNetwork.set(id, { gross: 0, views: 0, rows: 0, filledRows: 0 });
  }

  const reviews: NetworkRateReview[] = [...byNetwork.entries()].map(([id, a]) => {
    const cpm = a.views > 0 ? +((a.gross / a.views) * 1000).toFixed(4) : 0;
    return {
      network: id,
      networkName: networkLabel(id),
      cpmPer1kViews: cpm,
      creatorEarningsPer1k: +(cpm * (CREATOR_SHARE_PCT / 100)).toFixed(4),
      platformRevenuePer1k: +(cpm * (PLATFORM_SHARE_PCT / 100)).toFixed(4),
      fillRate: a.rows > 0 ? a.filledRows / a.rows : 0,
      views: a.views,
      impressions: a.rows,
      status: a.rows > 0 ? 'active_bid' : 'no_data',
    };
  });

  reviews.sort((x, y) => y.cpmPer1kViews - x.cpmPer1kViews);
  if (reviews.length > 0 && reviews[0].cpmPer1kViews > 0) {
    reviews[0].status = 'winning_optimal';
  }
  return reviews;
}

/**
 * Current best-performing network, based on measured eCPM.
 * Returns cpm = 0 when there is no measured revenue yet.
 */
export async function fetchLiveRates(): Promise<LiveRates> {
  if (cachedRates && cachedRates.expiresAt > Date.now()) return cachedRates.value;

  const breakdown = await fetchMultiNetworkLiveRates();
  const winner = breakdown.find((n) => n.cpmPer1kViews > 0);

  const value: LiveRates = {
    cpm: winner?.cpmPer1kViews ?? 0,
    network: winner?.network ?? 'direct',
    fillRate: winner?.fillRate ?? 0,
    fetchedAt: new Date().toISOString(),
    creatorSharePct: CREATOR_SHARE_PCT,
    platformSharePct: PLATFORM_SHARE_PCT,
    networkBreakdown: breakdown,
  };

  cachedRates = { value, expiresAt: Date.now() + RATE_TTL_MS };
  return value;
}

export function invalidateLiveRates() {
  cachedRates = null;
}

/**
 * Account for a single served ad impression using measured network rates.
 * Revenue is exactly eCPM / 1000 — no randomised variance or synthetic fill.
 */
export async function requestAdImpression(opts: {
  videoId: string;
  adTagUrl?: string;
  network?: AdNetwork;
  cpm?: number;
}): Promise<AdImpressionResult> {
  const rates = await fetchLiveRates();
  const cpm = opts.cpm ?? rates.cpm;
  const network = opts.network ?? rates.network;
  const grossRevenue = +(cpm / 1000).toFixed(6);
  const filled = grossRevenue > 0;

  return {
    revenue: grossRevenue,
    creatorShare: +(grossRevenue * (CREATOR_SHARE_PCT / 100)).toFixed(6),
    platformShare: +(grossRevenue * (PLATFORM_SHARE_PCT / 100)).toFixed(6),
    cpm,
    network,
    fillRate: rates.fillRate,
    filled,
    creativeId: filled ? `pronax-ad-${opts.videoId}-${Date.now()}` : undefined,
    fetchedAt: rates.fetchedAt,
    networkBreakdown: rates.networkBreakdown,
  };
}

/** Expected creator & platform split for a given view count at a given eCPM. */
export function calculatePayoutForViews(viewsCount: number, cpmPer1k: number) {
  const gross = (viewsCount / 1000) * cpmPer1k;
  return {
    viewsCount,
    cpmPer1k,
    grossPayout: +gross.toFixed(4),
    creatorPayout: +(gross * (CREATOR_SHARE_PCT / 100)).toFixed(4),
    platformPayout: +(gross * (PLATFORM_SHARE_PCT / 100)).toFixed(4),
    creatorPercent: CREATOR_SHARE_PCT,
    platformPercent: PLATFORM_SHARE_PCT,
  };
}

/** Comparative report across all networks with recorded performance. */
export async function getNetworkCpmComparisonReport() {
  const breakdown = await fetchMultiNetworkLiveRates();
  const winner = breakdown.find((n) => n.cpmPer1kViews > 0) ?? null;

  return {
    timestamp: new Date().toISOString(),
    windowDays: WINDOW_DAYS,
    winningNetwork: winner?.networkName ?? null,
    topCpmPer1kViews: winner?.cpmPer1kViews ?? 0,
    creator1kEarnings: winner?.creatorEarningsPer1k ?? 0,
    platform1kRevenue: winner?.platformRevenuePer1k ?? 0,
    splitRatio: `${CREATOR_SHARE_PCT}% Creator / ${PLATFORM_SHARE_PCT}% Platform`,
    networks: breakdown,
  };
}
