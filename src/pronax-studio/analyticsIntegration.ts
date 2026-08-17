/**
 * Integration helper for adding analytics tracking to video components
 * This provides ready-to-use functions for common analytics scenarios
 */

import React from "react";
import { trackVideoView, trackVideoImpression, trackAnalyticsEvent } from './analyticsTracker';

/**
 * Add analytics tracking to a video component
 * Call this when a video thumbnail is visible (impression)
 */
export function trackVideoThumbnailImpression(videoId: string): void {
  // Debounce to avoid tracking the same impression multiple times
  const key = `impression_${videoId}`;
  const lastTracked = localStorage.getItem(key);
  const now = Date.now();
  
  // Only track if not tracked in the last hour
  if (!lastTracked || now - parseInt(lastTracked) > 3600000) {
    trackVideoImpression(videoId);
    localStorage.setItem(key, now.toString());
  }
}

/**
 * Track video play start
 */
export function trackVideoPlayStart(videoId: string): void {
  trackVideoView(videoId, 0);
}

/**
 * Track video watch progress
 * Call this periodically during video playback
 */
export function trackVideoWatchProgress(videoId: string, watchTimeSeconds: number): void {
  // Only track every 30 seconds to avoid too many events
  if (watchTimeSeconds > 0 && watchTimeSeconds % 30 === 0) {
    trackVideoView(videoId, watchTimeSeconds);
  }
}

/**
 * Track video completion
 */
export function trackVideoCompletion(videoId: string, totalDuration: number): void {
  trackAnalyticsEvent({
    videoId,
    eventType: 'view',
    eventData: { 
      watch_time_seconds: totalDuration,
      completed: true 
    },
  });
}

/**
 * Track video engagement (likes, comments, shares)
 */
export function trackVideoEngagement(
  videoId: string, 
  engagementType: 'like' | 'comment' | 'share' | 'dislike'
): void {
  trackAnalyticsEvent({
    videoId,
    eventType: 'click',
    eventData: { engagement_type: engagementType },
  });
}

/**
 * Batch import helper - add this to your video component
 * 
 * Usage:
 * import { useVideoAnalytics } from '@/pronax-studio/analyticsIntegration';
 * 
 * function VideoCard({ video }) {
 *   const { onImpression, onPlayStart, onWatchProgress, onEngagement } = useVideoAnalytics(video.id);
 *   
 *   useEffect(() => {
 *     const observer = new IntersectionObserver((entries) => {
 *       entries.forEach(entry => {
 *         if (entry.isIntersecting) {
 *           onImpression();
 *         }
 *       });
 *     });
 *     
 *     if (thumbnailRef.current) {
 *       observer.observe(thumbnailRef.current);
 *     }
 *     
 *     return () => observer.disconnect();
 *   }, [onImpression]);
 * }
 */
export function useVideoAnalytics(videoId: string) {
  const handleImpression = React.useCallback(() => {
    trackVideoThumbnailImpression(videoId);
  }, [videoId]);
  
  const handlePlayStart = React.useCallback(() => {
    trackVideoPlayStart(videoId);
  }, [videoId]);
  
  const handleWatchProgress = React.useCallback((watchTimeSeconds: number) => {
    trackVideoWatchProgress(videoId, watchTimeSeconds);
  }, [videoId]);
  
  const handleCompletion = React.useCallback((totalDuration: number) => {
    trackVideoCompletion(videoId, totalDuration);
  }, [videoId]);
  
  const handleEngagement = React.useCallback((engagementType: 'like' | 'comment' | 'share' | 'dislike') => {
    trackVideoEngagement(videoId, engagementType);
  }, [videoId]);
  
  return {
    onImpression: handleImpression,
    onPlayStart: handlePlayStart,
    onWatchProgress: handleWatchProgress,
    onCompletion: handleCompletion,
    onEngagement: handleEngagement,
  };
}