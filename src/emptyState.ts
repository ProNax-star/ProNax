/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Zeroed / empty defaults for the Creator Studio.
 *
 * These are NOT demo data: every numeric field is 0 and every collection is
 * empty, so the UI renders real "no data yet" states instead of fake numbers
 * while the Supabase queries are still loading or when a channel is brand new.
 */
import type { AudioTrack, ChannelStats, SubtitleTrack } from "./types";

export const emptyChannelStats: ChannelStats = {
  name: "",
  handle: "",
  avatar: "",
  banner: "",
  subscribers: 0,
  subscriberChange28Days: 0,
  views28Days: 0,
  watchTimeHours28Days: 0,
  estimatedRevenue28Days: 0,
  realtime48HoursViews: 0,
  realtime60MinsViews: 0,
};

export const emptyAudioTracks: AudioTrack[] = [];

export const emptySubtitleTracks: SubtitleTrack[] = [];
