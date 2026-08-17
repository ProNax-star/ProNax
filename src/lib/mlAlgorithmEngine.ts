/**
 * ProNax ML & AI Recommendation Algorithm Engine
 * Addresses Core Recommendation Engine Upgrades:
 * 1. Dynamic Weight Optimization via ML Feedback Loops & Multi-Armed Bandit strategy
 * 2. Deep AI Content Quality Assessment (Hook, Depth, Virality, Clickbait Risk)
 * 3. Machine Learning Score Predictor & Dynamic Ranking
 */

export interface AIContentQualityAssessment {
  qualityIndex: number; // 0 - 100
  hookScore: number; // 0 - 100
  viralityPotential: number; // 0 - 100
  clickbaitSpamRisk: number; // 0 - 100 (High = penalty)
  contentDepthScore: number; // 0 - 100
  aiQualityMultiplier: number; // e.g. 0.7x to 1.5x
  keyTakeaways: string[];
  recommendedCategory: string;
  sentimentTone: 'educational' | 'entertaining' | 'inspiring' | 'controversial' | 'promotional';
}

export interface DynamicAlgorithmWeights {
  ctrWeight: number; // Default 65
  retentionWeight: number; // Default 150
  shortsCompletionWeight: number; // Default 210
  tagAffinityWeight: number; // Default 70
  freshnessBoostWeight: number; // Default 35
  categoryAffinityWeight: number; // Default 12
  watchedPenaltyWeight: number; // Default 50
  aiQualityWeight: number; // Weight for AI content score (Default 85)
  learningRate: number; // ML update step size (Default 0.05)
  autoOptimizationEnabled: boolean;
}

export const DEFAULT_DYNAMIC_WEIGHTS: DynamicAlgorithmWeights = {
  ctrWeight: 65,
  retentionWeight: 150,
  shortsCompletionWeight: 210,
  tagAffinityWeight: 70,
  freshnessBoostWeight: 35,
  categoryAffinityWeight: 12,
  watchedPenaltyWeight: 50,
  aiQualityWeight: 85,
  learningRate: 0.05,
  autoOptimizationEnabled: true,
};

// In-memory ML Feedback State & AI Content Quality Cache
let currentMLWeights: DynamicAlgorithmWeights = { ...DEFAULT_DYNAMIC_WEIGHTS };
const aiQualityCache = new Map<string, AIContentQualityAssessment>();

/**
 * Get current active dynamic ML weights
 */
export function getActiveMLWeights(): DynamicAlgorithmWeights {
  return { ...currentMLWeights };
}

/**
 * Dynamic Algorithm Weight Optimizer
 * Computes personalized or global dynamic weights based on user session metrics, CTR history, and AI user engagement patterns.
 */
export async function getDynamicAlgorithmWeights(params?: {
  averageSessionDuration?: number;
  clickThroughRateHistory?: number[];
  userEngagementPatterns?: {
    preferredCategories?: string[];
    bouncesRate?: number;
    avgCompletionRate?: number;
    highEngagementTimeOfDay?: string;
  };
}): Promise<DynamicAlgorithmWeights> {
  const base = { ...currentMLWeights };
  if (!params) return base;

  // 1. Session Duration Multiplier: If user spends high session duration, boost retention weight
  if (params.averageSessionDuration && params.averageSessionDuration > 300) {
    base.retentionWeight = Math.min(400, Math.round(base.retentionWeight * 1.15));
    base.shortsCompletionWeight = Math.min(300, Math.round(base.shortsCompletionWeight * 1.10));
  }

  // 2. CTR History Trend: If CTR is dropping, boost CTR and Freshness weight
  if (params.clickThroughRateHistory && params.clickThroughRateHistory.length > 0) {
    const avgCTR = params.clickThroughRateHistory.reduce((a, b) => a + b, 0) / params.clickThroughRateHistory.length;
    if (avgCTR < 0.08) {
      base.ctrWeight = Math.min(200, Math.round(base.ctrWeight * 1.2));
      base.freshnessBoostWeight = Math.min(100, Math.round(base.freshnessBoostWeight * 1.15));
    }
  }

  // 3. User Engagement Patterns (Bounce Rate & Completion Rate)
  if (params.userEngagementPatterns) {
    if (params.userEngagementPatterns.bouncesRate && params.userEngagementPatterns.bouncesRate > 0.4) {
      // High bounce rate -> strengthen AI quality weight & watched penalty to prevent low quality recommendations
      base.aiQualityWeight = Math.min(150, Math.round(base.aiQualityWeight * 1.25));
      base.watchedPenaltyWeight = Math.min(200, Math.round(base.watchedPenaltyWeight * 1.20));
    }
    if (params.userEngagementPatterns.avgCompletionRate && params.userEngagementPatterns.avgCompletionRate > 0.75) {
      base.retentionWeight = Math.min(400, Math.round(base.retentionWeight * 1.10));
    }
  }

  return base;
}

/**
 * Update active dynamic ML weights manually or from AI Optimizer
 */
export function updateActiveMLWeights(newWeights: Partial<DynamicAlgorithmWeights>) {
  currentMLWeights = {
    ...currentMLWeights,
    ...newWeights,
  };
}

/**
 * Heuristic fallback for AI Content Quality Assessment when offline or fast pre-calc needed
 */
export function calculateHeuristicAIQuality(video: {
  title: string;
  description?: string;
  tags?: string[];
  duration_seconds?: number;
  quality_resolution?: string;
}): AIContentQualityAssessment {
  const titleLen = video.title.length;
  const hasCaps = (video.title.match(/[A-Z]/g) || []).length > titleLen * 0.4;
  const hasExclamation = video.title.includes('!') || video.title.includes('???');
  
  // Detect clickbait risk
  let clickbaitRisk = 10;
  if (hasCaps) clickbaitRisk += 25;
  if (hasExclamation) clickbaitRisk += 20;
  if (/OMG|SHOCKING|MUST SEE|UNBELIEVABLE|SECRET/i.test(video.title)) clickbaitRisk += 30;
  clickbaitRisk = Math.min(95, clickbaitRisk);

  // Hook Score & Depth
  const descLen = video.description?.length || 0;
  const tagCount = video.tags?.length || 0;
  const contentDepthScore = Math.min(98, Math.max(30, (descLen / 15) + (tagCount * 4) + (video.duration_seconds && video.duration_seconds > 300 ? 20 : 5)));

  let qualityIndex = Math.min(99, Math.max(20, (contentDepthScore * 0.5) + (video.quality_resolution === '4K' || video.quality_resolution === '8K' ? 30 : 15) - (clickbaitRisk * 0.3)));
  const hookScore = Math.min(98, Math.max(25, 60 + (titleLen > 15 && titleLen < 65 ? 20 : 0) - (clickbaitRisk > 60 ? 15 : 0)));
  const viralityPotential = Math.min(99, Math.max(15, (hookScore * 0.4) + (qualityIndex * 0.4) + (tagCount > 3 ? 15 : 0)));

  const aiQualityMultiplier = Number(Math.min(1.5, Math.max(0.6, (qualityIndex / 70) * (1 - clickbaitRisk / 200))).toFixed(2));

  return {
    qualityIndex: Math.round(qualityIndex),
    hookScore: Math.round(hookScore),
    viralityPotential: Math.round(viralityPotential),
    clickbaitSpamRisk: Math.round(clickbaitRisk),
    contentDepthScore: Math.round(contentDepthScore),
    aiQualityMultiplier,
    keyTakeaways: [
      qualityIndex > 75 ? 'Strong content depth and high retention potential' : 'Standard quality content structure',
      clickbaitRisk > 50 ? 'High sensationalism detected — slight algorithm penalty applied' : 'Balanced, authentic title formatting',
    ],
    recommendedCategory: video.tags?.[0] || 'General',
    sentimentTone: clickbaitRisk > 50 ? 'controversial' : descLen > 200 ? 'educational' : 'entertaining',
  };
}

/**
 * Cache or retrieve AI Content Quality
 */
export function getOrComputeAIQuality(videoId: string, videoData?: any): AIContentQualityAssessment {
  if (aiQualityCache.has(videoId)) {
    return aiQualityCache.get(videoId)!;
  }
  const computed = calculateHeuristicAIQuality(videoData || { title: videoId });
  aiQualityCache.set(videoId, computed);
  return computed;
}

export function cacheAIQuality(videoId: string, assessment: AIContentQualityAssessment) {
  aiQualityCache.set(videoId, assessment);
}

/**
 * Machine Learning Multi-Armed Bandit Weight Auto-Tuner
 * Adjusts weights dynamically based on live performance signals (reward feedback)
 */
export function recordMLRewardSignal(signal: {
  videoId: string;
  isClick: boolean;
  completionRate: number; // 0.0 to 1.0+
  isShareOrSave: boolean;
  isQuickSkip: boolean;
}) {
  if (!currentMLWeights.autoOptimizationEnabled) return;

  const lr = currentMLWeights.learningRate;

  // Reward calculation (+1 for completion/share, -1 for quick skip)
  let reward = 0;
  if (signal.isShareOrSave) reward += 1.5;
  if (signal.completionRate > 0.8) reward += 1.0;
  if (signal.isClick) reward += 0.3;
  if (signal.isQuickSkip) reward -= 1.2;

  // Adapt weights in direction of reward
  if (reward > 0) {
    if (signal.completionRate > 0.8) {
      currentMLWeights.retentionWeight = Math.min(400, currentMLWeights.retentionWeight + lr * 2);
      currentMLWeights.shortsCompletionWeight = Math.min(300, currentMLWeights.shortsCompletionWeight + lr * 2.5);
    }
    if (signal.isClick) {
      currentMLWeights.ctrWeight = Math.min(200, currentMLWeights.ctrWeight + lr * 1.5);
    }
  } else {
    // Penalty adjustment to tighten quality requirements
    currentMLWeights.aiQualityWeight = Math.min(150, currentMLWeights.aiQualityWeight + lr * 3);
    currentMLWeights.watchedPenaltyWeight = Math.min(200, currentMLWeights.watchedPenaltyWeight + lr * 1.5);
  }
}
