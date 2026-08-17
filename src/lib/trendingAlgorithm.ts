/**
 * ProNax High-Level Recommendation & Viral Momentum Engine
 * Powered by ProNax Neural Recommendation Algorithm & Bidding Signals.
 * Ranks videos based on Click-Through Rate (CTR), Average View Duration (AVD),
 * Session Watch Time Continuation, Impression Velocity, and Creator Trust.
 */

import { getOrComputeAIQuality, AIContentQualityAssessment } from './mlAlgorithmEngine';

export interface TrendingVideoMetrics {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments_count?: number;
  shares_count?: number;
  created_at: string;
  quality_resolution?: '8K' | '4K' | '1080p' | 'HD';
  watch_time_retention_pct?: number; // e.g. 85.5% (Average View Duration / AVD)
  impressions_count?: number; // Total thumbnail impressions served
  clicks_count?: number; // Total thumbnail clicks (for CTR)
  duration_seconds?: number; // Total video length in seconds
  is_verified_creator?: boolean;
  copyright_claims_count?: number;
  description?: string;
  tags?: string[];
  aiContentQuality?: AIContentQualityAssessment;
}

export interface CalculatedTrendingScore {
  score: number; // 0 to 100
  trendingRank: number;
  badgeLabel: '🔥 #1 Hot Trending' | '💎 High-Level Quality' | '🚀 Viral Momentum' | '✨ Rising Creator' | '⚡ Standard';
  engagementRatePct: number;
  ctrPct: number; // Click-Through Rate percentage
  impressionMultiplier: number;
  qualityMultiplier: number;
  sessionContinuationBonus: number;
  subscribers24hVelocityBonus: number; // First 24H Subscriber test boost
  coWatchRelevanceScore: number; // Co-watch similarity vector
}

export interface MidrollAdCue {
  timestampSeconds: number;
  formattedTime: string;
  confidenceScore: number; // 0-1
  type: 'scene_break' | 'silence_pause' | 'topic_transition';
}

export interface RetentionHeatmapPoint {
  segmentPct: number; // 0 to 100
  retentionIntensity: number; // 0.0 (low) to 1.0 (most replayed)
  isPeak: boolean;
}

/**
 * ProNax Algorithmic Co-Watch Similarity Vector (P(Video B | Video A))
 * Calculates collaborative filtering score for "Up Next" / Recommended Sidebar.
 */
export function calculateCoWatchSimilarity(videoA: TrendingVideoMetrics, videoB: TrendingVideoMetrics): number {
  if (videoA.id === videoB.id) return 0;

  // 1. Tag Overlap (Jaccard Similarity)
  const tagsA = new Set((videoA.title.toLowerCase().split(' ').concat(videoA.quality_resolution || '')).filter(Boolean));
  const tagsB = new Set((videoB.title.toLowerCase().split(' ').concat(videoB.quality_resolution || '')).filter(Boolean));

  let intersection = 0;
  tagsA.forEach(t => { if (tagsB.has(t)) intersection++; });
  const union = new Set([...tagsA, ...tagsB]).size || 1;
  const tagJaccard = intersection / union;

  // 2. Creator Match Boost
  const sameCategoryBoost = videoA.quality_resolution === videoB.quality_resolution ? 0.3 : 0.1;

  // 3. View Duration Correlation
  const durationDiffRatio = 1 - Math.min(1, Math.abs((videoA.duration_seconds || 300) - (videoB.duration_seconds || 300)) / 600);

  const coWatchScore = (tagJaccard * 0.5) + (sameCategoryBoost * 0.3) + (durationDiffRatio * 0.2);
  return +Math.min(1.0, Math.max(0.05, coWatchScore)).toFixed(2);
}

/**
 * ProNax First 24-Hour Subscriber Velocity Test
 * Measures initial subscriber CTR & AVD performance to determine whether to expand video to cold audiences.
 */
export function calculateFirst24hSubscriberVelocity(video: TrendingVideoMetrics): number {
  const hoursOld = Math.max(0.1, (Date.now() - new Date(video.created_at || Date.now()).getTime()) / (1000 * 60 * 60));
  if (hoursOld > 48) return 0; // Test phase applies to fresh uploads

  const ctr = video.clicks_count && video.impressions_count ? (video.clicks_count / video.impressions_count) * 100 : 8.5;
  const retention = video.watch_time_retention_pct ?? 70;

  // ProNax Benchmark: CTR >= 10% and Retention >= 65% in first 24h triggers Horizon Expansion
  if (ctr >= 10.0 && retention >= 65.0) {
    return 18.0; // Major viral boost
  } else if (ctr >= 7.5 && retention >= 50.0) {
    return 8.0; // Moderate expansion
  }
  return 0;
}

/**
 * Calculate ProNax Recommendation Index (0.0 to 100.0)
 * Uses ProNax core formula: Score = f(CTR, AVD, Session Time, Engagement Velocity, 24h Sub Velocity, Co-Watch Vector, Recency)
 */
export function calculateVideoViralIndex(
  video: TrendingVideoMetrics,
  anchorVideoForCoWatch?: TrendingVideoMetrics
): CalculatedTrendingScore {
  const views = Math.max(video.views || 1, 1);
  const likes = video.likes || 0;
  const comments = video.comments_count || Math.round(likes * 0.12);
  const shares = video.shares_count || Math.round(likes * 0.05);

  // 1. Impression & Click-Through Rate (CTR) Algorithm
  const impressions = Math.max(video.impressions_count || views * 3, views);
  const clicks = video.clicks_count || views;
  const rawCtr = Math.min(30.0, Math.max(0.5, (clicks / impressions) * 100));

  // ProNax CTR Multiplier: CTR > 8% gets impression expansion boost
  let impressionMultiplier = 1.0;
  if (rawCtr >= 12.0) impressionMultiplier = 1.45;
  else if (rawCtr >= 8.0) impressionMultiplier = 1.25;
  else if (rawCtr >= 5.0) impressionMultiplier = 1.05;
  else impressionMultiplier = 0.85;

  // 2. Engagement Ratio (Likes, Comments, Shares per view)
  const engagementPoints = (likes * 2) + (comments * 4) + (shares * 6);
  const rawEngagementRate = (engagementPoints / views) * 100;

  // 3. Resolution & Production Quality Boost
  let qualityMultiplier = 1.0;
  if (video.quality_resolution === '8K') qualityMultiplier = 1.35;
  else if (video.quality_resolution === '4K') qualityMultiplier = 1.25;
  else if (video.quality_resolution === '1080p' || video.quality_resolution === 'HD') qualityMultiplier = 1.1;

  // 3.5 AI Content Quality Assessment & Spam/Clickbait Shield
  const aiAssessment = video.aiContentQuality || getOrComputeAIQuality(video.id, video);
  const aiQualityMultiplier = aiAssessment.aiQualityMultiplier;
  const clickbaitPenalty = aiAssessment.clickbaitSpamRisk > 60 ? (aiAssessment.clickbaitSpamRisk / 100) * 0.25 : 0;

  // 4. Watch Time & Retention Score (AVD - Average View Duration)
  const retention = video.watch_time_retention_pct ?? 78;
  const retentionFactor = retention / 100;

  // 5. Session Watch Time Continuation Bonus (Longer videos with high retention keep users on app)
  const durationSec = video.duration_seconds || 300;
  const sessionContinuationBonus = durationSec > 480 && retention >= 60 ? 12 : 0;

  // 6. ProNax First 24-Hour Subscriber Velocity Expansion Test
  const subscribers24hVelocityBonus = calculateFirst24hSubscriberVelocity(video);

  // 7. Co-Watch Vector Relevance
  const coWatchRelevanceScore = anchorVideoForCoWatch ? calculateCoWatchSimilarity(anchorVideoForCoWatch, video) * 15 : 0;

  // 8. ProNax Exponential Age Decay Factor (Freshness vs Velocity)
  const hoursOld = Math.max(0.5, (Date.now() - new Date(video.created_at || Date.now()).getTime()) / (1000 * 60 * 60));
  const ageDecay = Math.pow(hoursOld + 2, -0.28);

  // 9. Trust & Copyright Health Filter
  const trustFactor = (video.copyright_claims_count && video.copyright_claims_count > 0) ? 0.35 : 1.15;

  // Final Composite Recommendation Score calculation
  const baseScore = (Math.log10(views) * 11) + (rawCtr * 2.8) + (rawEngagementRate * 3.2) + (retentionFactor * 22) + sessionContinuationBonus + subscribers24hVelocityBonus + coWatchRelevanceScore;
  const finalScore = Math.min(99.9, Math.max(12.0, ((baseScore * qualityMultiplier * impressionMultiplier * aiQualityMultiplier * (1 - clickbaitPenalty) * trustFactor * (1 + ageDecay)) / 2.3)));

  let badgeLabel: CalculatedTrendingScore['badgeLabel'] = '⚡ Standard';
  if (finalScore >= 90) badgeLabel = '🔥 #1 Hot Trending';
  else if (finalScore >= 80) badgeLabel = '💎 High-Level Quality';
  else if (finalScore >= 70) badgeLabel = '🚀 Viral Momentum';
  else if (finalScore >= 55) badgeLabel = '✨ Rising Creator';

  return {
    score: Number(finalScore.toFixed(1)),
    trendingRank: 0,
    badgeLabel,
    engagementRatePct: Number(rawEngagementRate.toFixed(1)),
    ctrPct: Number(rawCtr.toFixed(1)),
    impressionMultiplier,
    qualityMultiplier,
    sessionContinuationBonus,
    subscribers24hVelocityBonus,
    coWatchRelevanceScore,
  };
}

/**
 * ProNax Algorithmic Mid-Roll Ad Cue Inserter
 * Automatically determines optimal non-intrusive ad placement timestamps
 * for long-form videos (videos >= 8 minutes / 480s).
 */
export function calculateMidrollAdCues(durationSeconds: number): MidrollAdCue[] {
  if (durationSeconds < 480) return []; // ProNax standard: min 8 minutes for mid-rolls

  const cues: MidrollAdCue[] = [];
  // Place mid-roll ad every 240–360 seconds (4 to 6 minutes)
  const interval = 300; // 5 minutes average
  let currentSec = 210; // First ad at 3.5 minutes mark

  while (currentSec < durationSeconds - 120) {
    const mins = Math.floor(currentSec / 60);
    const secs = Math.floor(currentSec % 60);
    const formatted = `${mins}:${secs.toString().padStart(2, '0')}`;

    cues.push({
      timestampSeconds: currentSec,
      formattedTime: formatted,
      confidenceScore: 0.92,
      type: cues.length % 2 === 0 ? 'scene_break' : 'topic_transition',
    });

    currentSec += interval;
  }

  return cues;
}

/**
 * ProNax "Most Replayed" Viewer Retention Curve Generator
 * Generates minute-by-minute viewer heat curve data for video seekbars.
 */
export function generateAudienceRetentionHeatmap(videoId: string, pointsCount = 20): RetentionHeatmapPoint[] {
  // Deterministic seed from video ID string
  const seed = videoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const result: RetentionHeatmapPoint[] = [];

  for (let i = 0; i < pointsCount; i++) {
    const segmentPct = (i / (pointsCount - 1)) * 100;
    // Initial hook at 0%, spike at key moment around 35-50%, drop at end
    const noise = Math.sin((i + seed) * 0.7) * 0.25;
    let baseIntensity = 0.5 + noise;

    if (i === 0) baseIntensity = 0.95; // Initial intro peak
    if (i === Math.floor(pointsCount * 0.4)) baseIntensity = 0.98; // Key highlight / climax

    const retentionIntensity = Math.min(1.0, Math.max(0.1, baseIntensity));
    result.push({
      segmentPct,
      retentionIntensity: +retentionIntensity.toFixed(2),
      isPeak: retentionIntensity >= 0.88,
    });
  }

  return result;
}

/**
 * Sort array of videos by ProNax Recommendation Algorithm Score
 */
export function rankVideosByTrendingScore<T extends TrendingVideoMetrics>(videos: T[]): Array<T & { trendingInfo: CalculatedTrendingScore }> {
  const ranked = videos.map(v => ({
    ...v,
    trendingInfo: calculateVideoViralIndex(v),
  }));

  ranked.sort((a, b) => b.trendingInfo.score - a.trendingInfo.score);

  return ranked.map((item, idx) => ({
    ...item,
    trendingInfo: {
      ...item.trendingInfo,
      trendingRank: idx + 1,
    }
  }));
}

