// Ad Network Types & Configuration
export type AdNetworkType = 'adsense' | 'propeller' | 'unity' | 'direct';
export type AdPlacement = 'preroll' | 'midroll' | 'overlay' | 'banner';

export interface AdConfig {
  network: AdNetworkType;
  enabled: boolean;
  priority: number;
  credentials?: Record<string, string>;
}

export interface AdSlot {
  id: string;
  placement: AdPlacement;
  network: AdNetworkType;
  content: {
    type: 'video' | 'image' | 'html';
    src: string;
    duration?: number; // seconds for video ads
    clickUrl?: string;
    label: string;
  };
  skipAfter?: number; // seconds before skip is allowed
}

// Default ad network configs
export const adNetworks: AdConfig[] = [
  { network: 'adsense', enabled: false, priority: 1 },
  { network: 'propeller', enabled: false, priority: 2 },
  { network: 'unity', enabled: false, priority: 3 },
  { network: 'direct', enabled: true, priority: 4 },
];

// Demo ads for testing (replace with real ad serving)
export const demoAds: AdSlot[] = [
  {
    id: 'preroll-1',
    placement: 'preroll',
    network: 'direct',
    content: {
      type: 'image',
      src: '',
      duration: 5,
      clickUrl: '#',
      label: 'Premium Gaming Headset - 50% OFF',
    },
    skipAfter: 3,
  },
  {
    id: 'midroll-1',
    placement: 'midroll',
    network: 'direct',
    content: {
      type: 'image',
      src: '',
      duration: 8,
      clickUrl: '#',
      label: 'Try Pro Nax Premium - Ad Free Experience',
    },
    skipAfter: 5,
  },
  {
    id: 'overlay-1',
    placement: 'overlay',
    network: 'direct',
    content: {
      type: 'html',
      src: '',
      clickUrl: '#',
      label: '🔥 Pro Nax Premium — Remove all ads',
    },
  },
];

// Revenue calculation
export const REVENUE_PER_1000_VIEWS = 2.50; // USD
export const PLATFORM_FEE_PERCENT = 45;
export const CREATOR_EARNING_PERCENT = 55;

export function calculateRevenue(validViews: number) {
  const gross = (validViews / 1000) * REVENUE_PER_1000_VIEWS;
  const platformFee = gross * (PLATFORM_FEE_PERCENT / 100);
  const creatorEarning = gross * (CREATOR_EARNING_PERCENT / 100);
  return { gross, platformFee, creatorEarning };
}

// Mid-roll trigger points (every 5 minutes)
export function getMidrollTimestamps(videoDuration: number): number[] {
  const interval = 300; // 5 minutes
  const points: number[] = [];
  let t = interval;
  while (t < videoDuration - 30) {
    points.push(t);
    t += interval;
  }
  return points;
}
