/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
export type ViewMode =
  | "dashboard"
  | "content"
  | "analytics"
  | "comments"
  | "earn"
  | "customization"
  | "audio-library"
  | "subtitles"
  | "settings";

export type ContentTab = "videos" | "shorts" | "live" | "playlists";

export interface CopyrightClaim {
  id: string;
  videoId: string;
  claimedTrack: string;
  claimOwner: string;
  claimType: string;
  timestampRange: string;
  channelImpact: string;
  monetizationImpact: string;
  status: "Active claim" | "Resolved" | "Dispute Pending";
}

export interface AdSuitabilityRating {
  inappropriateLanguage: "none" | "mild" | "strong";
  adultContent: "none" | "mild" | "explicit";
  violence: "none" | "mild" | "extreme";
  harmfulActs: boolean;
  firearms: boolean;
  status: "green" | "yellow" | "red";
}

export interface SubtitleItem {
  id: string;
  startTime: string;
  endTime: string;
  text: string;
}

export interface SubtitleTrack {
  id: string;
  videoId: string;
  language: string;
  isAutomatic?: boolean;
  status: "Published" | "Draft" | "Processing";
  captions: SubtitleItem[];
}

export interface VideoBlurOverlay {
  id: string;
  type: "face" | "custom";
  shape: "box" | "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
  startTime: number;
  endTime: number;
}

export interface VideoEndScreenElement {
  id: string;
  type: "video" | "subscribe" | "link" | "playlist";
  title: string;
  x: number;
  y: number;
  startTime: number;
  endTime: number;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl?: string;
  duration: string;
  visibility: "Public" | "Unlisted" | "Private" | "Draft";
  monetization: boolean;
  adSuitabilityStatus?: "green" | "yellow" | "red";
  restrictions: any;
  copyrightClaimDetails?: CopyrightClaim;
  uploadDate: string;
  views: number;
  commentsCount: number;
  likes: number;
  dislikes: number;
  likePercentage: number;
  ctr: number; // Click-through rate %
  avgViewDuration: string; // e.g., "4:12"
  tags: string[];
  category: string;
  isShort?: boolean;
  blurOverlays?: VideoBlurOverlay[];
  endScreenElements?: VideoEndScreenElement[];
  trimmedStartSec?: number;
  trimmedEndSec?: number;
}

export interface Comment {
  id: string;
  videoId: string;
  videoTitle: string;
  author: string;
  avatar: string;
  text: string;
  timeAgo: string;
  likes: number;
  heart: boolean;
  status: "published" | "held_for_review";
  subscriberCount?: string;
  replyText?: string;
}

export interface AudioTrack {
  id: string;
  title: string;
  genre: string;
  mood: string;
  artist: string;
  duration: string;
  audioUrl: string;
  isStarred?: boolean;
  licenseType: "ProNax Audio Library" | "Attribution Required";
}

export interface ChannelStats {
  name: string;
  handle: string;
  avatar: string;
  banner: string;
  subscribers: number;
  subscriberChange28Days: number;
  views28Days: number;
  watchTimeHours28Days: number;
  estimatedRevenue28Days: number;
  realtime48HoursViews: number;
  realtime60MinsViews: number;
}

export interface ChartDataPoint {
  date: string;
  views: number;
  watchTime: number;
  subscribers: number;
  revenue: number;
}

export interface TrafficSource {
  name: string;
  percentage: number;
  views: number;
}
