/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Video Metadata Caching Layer
 * Caches video data from Supabase with automatic invalidation and TTL management
 */

import { cache, getDefaultTTL } from './redis';
import { supabase } from '@/integrations/supabase/loose';

// Cache key prefixes
const CACHE_PREFIXES = {
  VIDEO: 'video',
  VIDEO_METADATA: 'video:metadata',
  VIDEO_LIST: 'video:list',
  VIDEO_BY_CREATOR: 'video:creator',
  VIDEO_POPULAR: 'video:popular',
  VIDEO_SEARCH: 'video:search',
} as const;

// Default TTL values (in seconds)
const TTL = {
  VIDEO_METADATA: 3600, // 1 hour
  VIDEO_LIST: 300, // 5 minutes
  VIDEO_BY_CREATOR: 600, // 10 minutes
  VIDEO_POPULAR: 300, // 5 minutes
  VIDEO_SEARCH: 1800, // 30 minutes
} as const;

/**
 * Video type definition for cache
 */
export interface CachedVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  video_url: string;
  duration: string;
  visibility: string;
  monetization: boolean;
  created_at: string;
  views: number;
  comments_count: number;
  likes: number;
  tags: string[];
  category: string;
  is_short: boolean;
  // Add other video fields as needed
}

/**
 * Get video by ID with caching
 * @param videoId - Video UUID
 * @returns Video data or null if not found
 */
export async function getVideoWithCache(videoId: string): Promise<CachedVideo | null> {
  const cacheKey = `${CACHE_PREFIXES.VIDEO}:${videoId}`;
  
  // Try cache first
  const cached = await cache.get<CachedVideo>(cacheKey);
  if (cached) {
    console.log(`Cache HIT: video:${videoId}`);
    return cached;
  }
  
  console.log(`Cache MISS: video:${videoId}`);
  
  // Fetch from database
  const { data: video, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();
  
  if (error || !video) {
    console.error(`Error fetching video ${videoId}:`, error);
    return null;
  }
  
  // Cache the result
  await cache.set(cacheKey, video, TTL.VIDEO_METADATA);
  
  return video as unknown as CachedVideo;
}

/**
 * Get multiple videos by IDs with caching
 * @param videoIds - Array of video UUIDs
 * @returns Array of video data
 */
export async function getVideosWithCache(videoIds: string[]): Promise<CachedVideo[]> {
  if (videoIds.length === 0) {
    return [];
  }

  const cacheKeys = videoIds.map(id => `${CACHE_PREFIXES.VIDEO}:${id}`);
  
  // Try to get all from cache
  const cachedVideos = await cache.mget<CachedVideo>(cacheKeys);
  
  // Identify which videos are not in cache
  const missingIndices: number[] = [];
  const missingIds: string[] = [];
  
  cachedVideos.forEach((video, index) => {
    if (!video) {
      missingIndices.push(index);
      missingIds.push(videoIds[index]);
    }
  });
  
  // Fetch missing videos from database
  let fetchedVideos: CachedVideo[] = [];
  if (missingIds.length > 0) {
    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .in('id', missingIds);
    
    if (error) {
      console.error('Error fetching videos:', error);
    } else if (videos) {
      fetchedVideos = videos as unknown as CachedVideo[];
      
      // Cache the fetched videos
      for (const video of fetchedVideos) {
        const cacheKey = `${CACHE_PREFIXES.VIDEO}:${video.id}`;
        await cache.set(cacheKey, video, TTL.VIDEO_METADATA);
      }
    }
  }
  
  // Merge cached and fetched videos
  const result: CachedVideo[] = [];
  let fetchedIndex = 0;
  
  for (let i = 0; i < videoIds.length; i++) {
    if (cachedVideos[i]) {
      result.push(cachedVideos[i]!);
    } else {
      result.push(fetchedVideos[fetchedIndex] || null);
      fetchedIndex++;
    }
  }
  
  return result.filter((v): v is CachedVideo => v !== null);
}

/**
 * Get videos by creator with caching
 * @param creatorId - Creator/user UUID
 * @param limit - Maximum number of videos to return
 * @returns Array of creator's videos
 */
export async function getVideosByCreatorWithCache(
  creatorId: string,
  limit: number = 20
): Promise<CachedVideo[]> {
  const cacheKey = `${CACHE_PREFIXES.VIDEO_BY_CREATOR}:${creatorId}:${limit}`;
  
  // Try cache first
  const cached = await cache.get<CachedVideo[]>(cacheKey);
  if (cached) {
    console.log(`Cache HIT: creator videos:${creatorId}`);
    return cached;
  }
  
  console.log(`Cache MISS: creator videos:${creatorId}`);
  
  // Fetch from database
  const { data: videos, error } = await supabase
    .from('videos')
    .select('*')
    .eq('owner_id', creatorId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error || !videos) {
    console.error(`Error fetching videos for creator ${creatorId}:`, error);
    return [];
  }
  
  // Cache the result
  await cache.set(cacheKey, videos, TTL.VIDEO_BY_CREATOR);
  
  return videos as unknown as CachedVideo[];
}

/**
 * Get popular videos with caching
 * @param limit - Maximum number of videos to return
 * @returns Array of popular videos
 */
export async function getPopularVideosWithCache(limit: number = 20): Promise<CachedVideo[]> {
  const cacheKey = `${CACHE_PREFIXES.VIDEO_POPULAR}:${limit}`;
  
  // Try cache first
  const cached = await cache.get<CachedVideo[]>(cacheKey);
  if (cached) {
    console.log('Cache HIT: popular videos');
    return cached;
  }
  
  console.log('Cache MISS: popular videos');
  
  // Fetch from database
  const { data: videos, error } = await supabase
    .from('videos')
    .select('*')
    .eq('visibility', 'public')
    .order('views', { ascending: false })
    .limit(limit);
  
  if (error || !videos) {
    console.error('Error fetching popular videos:', error);
    return [];
  }
  
  // Cache the result
  await cache.set(cacheKey, videos, TTL.VIDEO_POPULAR);
  
  return videos as unknown as CachedVideo[];
}

/**
 * Search videos with caching
 * @param searchTerm - Search query
 * @param limit - Maximum number of results
 * @returns Array of matching videos
 */
export async function searchVideosWithCache(
  searchTerm: string,
  limit: number = 20
): Promise<CachedVideo[]> {
  const normalizedSearch = searchTerm.toLowerCase().trim();
  const cacheKey = `${CACHE_PREFIXES.VIDEO_SEARCH}:${normalizedSearch}:${limit}`;
  
  // Try cache first
  const cached = await cache.get<CachedVideo[]>(cacheKey);
  if (cached) {
    console.log(`Cache HIT: search:${searchTerm}`);
    return cached;
  }
  
  console.log(`Cache MISS: search:${searchTerm}`);
  
  // Fetch from database (using full-text search if available)
  const { data: videos, error } = await supabase
    .from('videos')
    .select('*')
    .or(`title.ilike.%${normalizedSearch}%,description.ilike.%${normalizedSearch}%`)
    .eq('visibility', 'public')
    .limit(limit);
  
  if (error || !videos) {
    console.error(`Error searching videos for "${searchTerm}":`, error);
    return [];
  }
  
  // Cache the result
  await cache.set(cacheKey, videos, TTL.VIDEO_SEARCH);
  
  return videos as unknown as CachedVideo[];
}

/**
 * Invalidate video cache
 * @param videoId - Video UUID to invalidate
 */
export async function invalidateVideoCache(videoId: string): Promise<boolean> {
  const cacheKey = `${CACHE_PREFIXES.VIDEO}:${videoId}`;
  return await cache.del(cacheKey);
}

/**
 * Invalidate all video-related caches for a creator
 * @param creatorId - Creator/user UUID
 */
export async function invalidateCreatorVideoCache(creatorId: string): Promise<number> {
  // Invalidate all creator-specific cache keys
  const pattern = `${CACHE_PREFIXES.VIDEO_BY_CREATOR}:${creatorId}:*`;
  return await cache.invalidatePattern(pattern);
}

/**
 * Invalidate all video list/popular caches
 * Used when a new video is uploaded or video status changes
 */
export async function invalidateVideoListCaches(): Promise<number> {
  const patterns = [
    `${CACHE_PREFIXES.VIDEO_LIST}:*`,
    `${CACHE_PREFIXES.VIDEO_POPULAR}:*`,
    `${CACHE_PREFIXES.VIDEO_SEARCH}:*`,
  ];
  
  let totalInvalidated = 0;
  for (const pattern of patterns) {
    totalInvalidated += await cache.invalidatePattern(pattern);
  }
  
  return totalInvalidated;
}

/**
 * Batch invalidate multiple video caches
 * @param videoIds - Array of video UUIDs to invalidate
 */
export async function invalidateMultipleVideoCaches(videoIds: string[]): Promise<boolean> {
  if (videoIds.length === 0) {
    return true;
  }

  try {
    const keys = videoIds.map(id => `${CACHE_PREFIXES.VIDEO}:${id}`);
    await Promise.all(keys.map((k) => cache.del(k)));
    console.log(`Invalidated ${keys.length} video caches`);
    return true;
  } catch (error) {
    console.error('Error invalidating multiple video caches:', error);
    return false;
  }
}

/**
 * Warm up cache for popular videos
 * Call this during application startup or scheduled intervals
 */
export async function warmUpVideoCache(): Promise<void> {
  console.log('Warming up video cache...');
  
  try {
    // Cache popular videos
    await getPopularVideosWithCache(50);
    
    // Cache recent videos (if you have a way to get them)
    // await getRecentVideosWithCache(50);
    
    console.log('Video cache warm-up complete');
  } catch (error) {
    console.error('Error during cache warm-up:', error);
  }
}

/**
 * Get cache statistics for monitoring
 */
export async function getVideoCacheStats(): Promise<{
  totalKeys: number;
  videoKeys: number;
  creatorKeys: number;
  popularKeys: number;
  searchKeys: number;
}> {
  try {
    const videoKeys = await cache.invalidatePattern(`${CACHE_PREFIXES.VIDEO}:*`);
    const creatorKeys = await cache.invalidatePattern(`${CACHE_PREFIXES.VIDEO_BY_CREATOR}:*`);
    const popularKeys = await cache.invalidatePattern(`${CACHE_PREFIXES.VIDEO_POPULAR}:*`);
    const searchKeys = await cache.invalidatePattern(`${CACHE_PREFIXES.VIDEO_SEARCH}:*`);
    
    return {
      totalKeys: videoKeys + creatorKeys + popularKeys + searchKeys,
      videoKeys,
      creatorKeys,
      popularKeys,
      searchKeys,
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return {
      totalKeys: 0,
      videoKeys: 0,
      creatorKeys: 0,
      popularKeys: 0,
      searchKeys: 0,
    };
  }
}
