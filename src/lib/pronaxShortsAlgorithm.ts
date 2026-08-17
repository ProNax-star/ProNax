/**
 * ProNax Pro-Grade FYP (For You Page) Short Video Recommendation Algorithm Engine
 * High-Level Professional Architecture
 *
 * Implements ProNax's proprietary core recommendation system:
 * 1. Watch Time & Completion Rate (CR) & Loop/Rewatch Factor (Highest Weight)
 * 2. 3-Second Hook Retention vs Quick-Scroll Penalty
 * 3. Weighted Engagement Score (Rewatch > Share > Save > Comment > Like)
 * 4. Tiered Batch Cold-Start Testing Cohorts (Batch 1: 300 views -> Batch 2: 10k -> Batch 3: Viral FYP)
 * 5. Real-Time Viewer Interest Vector Matching (Session Category/Tag Affinity)
 * 6. Audio/Sound Viral Momentum Index
 */

import { getOrComputeAIQuality, AIContentQualityAssessment } from './mlAlgorithmEngine';

export interface ProNaxShortMetrics {
  id: string;
  title: string;
  description?: string;
  src: string;
  channel: string;
  avatar?: string;
  likes: number;
  comments: number;
  shares: number;
  saves?: number; // Bookmarks
  music?: string;
  music_id?: string;
  owner_id?: string;
  tags?: string[];
  duration_seconds?: number; // Short video length (default 15-60s)
  views_count?: number;
  completion_rate_pct?: number; // e.g., 82% watched to completion
  loop_rewatch_rate_pct?: number; // e.g., 24% rewatched
  hook_3s_retention_pct?: number; // e.g., 91% passed 3-second mark
  quick_skip_rate_pct?: number; // e.g., 8% skipped under 2 seconds
  created_at?: string;
  tier?: 'tier1_testing' | 'tier2_growth' | 'tier3_viral' | 'tier4_global_fyp';
  aiContentQuality?: AIContentQualityAssessment;
}

export interface FYPRankingResult {
  score: number; // 0.0 to 100.0
  fypRank: number;
  tierBadge: '🔥 Global FYP Surge' | '🚀 Viral Cohort' | '⚡ Growth Pool' | '🌱 Testing Batch';
  completionScore: number;
  loopScore: number;
  hookScore: number;
  engagementScore: number;
  interestMatchBonus: number;
  quickSkipPenalty: number;
  predictedReachCount: number;
  aiQualityBonus?: number;
  clickbaitPenalty?: number;
}

export interface ViewerSessionVector {
  recentCategoryTags: Record<string, number>; // Tag/Category -> affinity weight (0.0 to 1.0)
  favAudioIds: Set<string>;
  completedVideoIds: Set<string>;
  skippedVideoIds: Set<string>;
  lastInteractionTime: number;
}

/**
 * Global viewer session state for real-time FYP personalization
 */
let currentSessionVector: ViewerSessionVector = {
  recentCategoryTags: {},
  favAudioIds: new Set(),
  completedVideoIds: new Set(),
  skippedVideoIds: new Set(),
  lastInteractionTime: Date.now(),
};

/**
 * Record viewer interaction in real-time to update the ProNax Interest Vector.
 */
export function recordProNaxViewerSignal(opts: {
  videoId: string;
  watchTimeSeconds: number;
  durationSeconds: number;
  tags?: string[];
  audioId?: string;
  liked?: boolean;
  shared?: boolean;
  saved?: boolean;
}) {
  const duration = Math.max(1, opts.durationSeconds || 15);
  const completionRatio = opts.watchTimeSeconds / duration;

  // Update session
  currentSessionVector.lastInteractionTime = Date.now();

  if (completionRatio >= 0.9) {
    currentSessionVector.completedVideoIds.add(opts.videoId);
  } else if (completionRatio < 0.2 && opts.watchTimeSeconds < 2.5) {
    currentSessionVector.skippedVideoIds.add(opts.videoId);
  }

  // Update interest vector weights for video tags
  if (opts.tags && opts.tags.length > 0) {
    const delta = completionRatio >= 0.8 ? 0.2 : completionRatio < 0.2 ? -0.15 : 0.05;
    opts.tags.forEach((tag) => {
      const cleanTag = tag.toLowerCase().trim();
      if (!cleanTag) return;
      const currentVal = currentSessionVector.recentCategoryTags[cleanTag] || 0.5;
      currentSessionVector.recentCategoryTags[cleanTag] = Math.min(1.0, Math.max(0.0, currentVal + delta));
    });
  }

  if (opts.audioId && (opts.liked || opts.saved || completionRatio > 1.2)) {
    currentSessionVector.favAudioIds.add(opts.audioId);
  }
}

/**
 * Calculate ProNax's Tiered Batch Cohort Level
 */
export function calculateProNaxTier(short: ProNaxShortMetrics): {
  tier: FYPRankingResult['tierBadge'];
  predictedReach: number;
} {
  const views = short.views_count || Math.max(short.likes * 8, 100);
  const completion = short.completion_rate_pct ?? 65;
  const rewatch = short.loop_rewatch_rate_pct ?? 18;

  if (views >= 100000 || (completion >= 80 && rewatch >= 25)) {
    return { tier: '🔥 Global FYP Surge', predictedReach: 1500000 };
  } else if (views >= 10000 || (completion >= 68 && rewatch >= 18)) {
    return { tier: '🚀 Viral Cohort', predictedReach: 150000 };
  } else if (views >= 1000 || completion >= 55) {
    return { tier: '⚡ Growth Pool', predictedReach: 15000 };
  }
  return { tier: '🌱 Testing Batch', predictedReach: 500 };
}

/**
 * Core ProNax For You Page (FYP) Ranking Algorithm Formula
 * Score = f(CompletionRate, LoopRate, Hook3s, EngagementWeights, InterestVectorMatch, AudioBoost) - QuickSkipPenalty
 */
export function calculateProNaxFYPScore(
  short: ProNaxShortMetrics,
  viewerVector: ViewerSessionVector = currentSessionVector
): FYPRankingResult {
  const views = Math.max(short.views_count || 1, 10);
  const likes = short.likes || 0;
  const comments = short.comments || Math.round(likes * 0.08);
  const shares = short.shares || Math.round(likes * 0.04);
  const saves = short.saves || Math.round(likes * 0.06);

  // 1. Completion Rate (CR) Index (Highest priority in ProNax FYP algorithm)
  const crPct = short.completion_rate_pct ?? (likes > 500 ? 78 : 62);
  const completionScore = (crPct / 100) * 35.0; // Up to 35 points

  // 2. Loop / Rewatch Factor (Rewatching video multiple times triggers viral loop)
  const rewatchPct = short.loop_rewatch_rate_pct ?? (crPct > 70 ? 22 : 12);
  const loopScore = (rewatchPct / 100) * 22.0; // Up to 22 points

  // 3. 3-Second Hook Retention vs Quick-Skip Penalty
  const hookPct = short.hook_3s_retention_pct ?? 82;
  const hookScore = (hookPct / 100) * 15.0; // Up to 15 points

  const quickSkipPct = short.quick_skip_rate_pct ?? (crPct < 50 ? 25 : 8);
  const quickSkipPenalty = (quickSkipPct / 100) * 18.0; // Up to -18 points penalty

  // 4. Weighted Engagement Signals (ProNax Formula: Shares & Saves weigh significantly more than Likes)
  // Shares (1.8x), Saves (1.5x), Comments (1.2x), Likes (1.0x)
  const engagementPoints = (shares * 1.8) + (saves * 1.5) + (comments * 1.2) + (likes * 1.0);
  const engagementRate = Math.min(1.0, (engagementPoints / views) * 3);
  const engagementScore = engagementRate * 18.0; // Up to 18 points

  // 5. Real-Time Viewer Interest Tag Vector Matching
  let interestMatchBonus = 0;
  if (short.tags && short.tags.length > 0) {
    let totalAffinity = 0;
    short.tags.forEach((tag) => {
      const cleanTag = tag.toLowerCase().trim();
      totalAffinity += viewerVector.recentCategoryTags[cleanTag] ?? 0.3;
    });
    const avgAffinity = totalAffinity / short.tags.length;
    interestMatchBonus = avgAffinity * 10.0; // Up to +10 points
  } else {
    interestMatchBonus = 3.0; // Baseline neutral interest
  }

  // 6. Sound / Music Viral Affinity
  let audioBonus = 0;
  if (short.music_id && viewerVector.favAudioIds.has(short.music_id)) {
    audioBonus = 5.0; // Audio match boost
  }

  // 7. Freshness / Recency Decay Factor
  const hoursOld = short.created_at
    ? Math.max(0.1, (Date.now() - new Date(short.created_at).getTime()) / (1000 * 60 * 60))
    : 12;
  const freshnessMultiplier = Math.pow(hoursOld + 1, -0.15); // Smooth recency boost

  // 8. AI Content Quality Assessment & Spam Risk Shield
  const aiAssessment = short.aiContentQuality || getOrComputeAIQuality(short.id, short);
  const aiQualityBonus = ((aiAssessment.qualityIndex - 50) / 100) * 12.0; // Up to +6.0 or -6.0 pts
  const clickbaitPenalty = aiAssessment.clickbaitSpamRisk > 65 ? (aiAssessment.clickbaitSpamRisk / 100) * 15.0 : 0;

  // Raw FYP Composite Score
  const rawScore =
    (completionScore + loopScore + hookScore + engagementScore + interestMatchBonus + audioBonus + aiQualityBonus - quickSkipPenalty - clickbaitPenalty) *
    freshnessMultiplier *
    aiAssessment.aiQualityMultiplier;

  const finalScore = +Math.min(99.9, Math.max(10.0, rawScore * 1.15)).toFixed(1);
  const { tier, predictedReach } = calculateProNaxTier(short);

  return {
    score: finalScore,
    fypRank: 0,
    tierBadge: tier,
    completionScore: +completionScore.toFixed(1),
    loopScore: +loopScore.toFixed(1),
    hookScore: +hookScore.toFixed(1),
    engagementScore: +engagementScore.toFixed(1),
    interestMatchBonus: +interestMatchBonus.toFixed(1),
    quickSkipPenalty: +(quickSkipPenalty + clickbaitPenalty).toFixed(1),
    predictedReachCount: predictedReach,
    aiQualityBonus: +aiQualityBonus.toFixed(1),
    clickbaitPenalty: +clickbaitPenalty.toFixed(1),
  };
}

/**
 * Rank array of Short Videos using the ProNax FYP Recommendation Algorithm Engine
 */
export function rankShortsByProNaxFYP<T extends ProNaxShortMetrics>(
  shorts: T[],
  viewerVector: ViewerSessionVector = currentSessionVector
): Array<T & { fypInfo: FYPRankingResult }> {
  const ranked = shorts.map((s) => ({
    ...s,
    fypInfo: calculateProNaxFYPScore(s, viewerVector),
  }));

  // Sort descending by highest ProNax FYP Score
  ranked.sort((a, b) => b.fypInfo.score - a.fypInfo.score);

  return ranked.map((item, idx) => ({
    ...item,
    fypInfo: {
      ...item.fypInfo,
      fypRank: idx + 1,
    },
  }));
}

// ProNax FYP Engine complete
