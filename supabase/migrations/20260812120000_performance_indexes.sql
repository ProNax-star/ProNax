-- Migration: Performance Indexes for Scaling
-- Description: Add high-performance indexes for billion-scale operations
-- Created: 2026-08-12
-- Purpose: Optimize database queries for 1 billion user scale

-- ============================================================
-- VIDEOS TABLE INDEXES
-- ============================================================

-- 1. Composite index for creator profile feeds (fast creator video listing)
-- Use case: "Get videos by creator sorted by creation date"
-- Query: SELECT * FROM videos WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 20
CREATE INDEX IF NOT EXISTS idx_videos_owner_created 
ON videos(owner_id, created_at DESC);

-- 2. Partial index on visibility for public videos only
-- Use case: "Get all public videos"
-- Query: SELECT * FROM videos WHERE visibility = 'public'
CREATE INDEX IF NOT EXISTS idx_videos_visibility_public 
ON videos(visibility) 
WHERE visibility = 'public';

-- 3. Partial index on views for public videos (popular videos)
-- Use case: "Get most viewed public videos"
-- Query: SELECT * FROM videos WHERE visibility = 'public' ORDER BY views_count DESC LIMIT 20
CREATE INDEX IF NOT EXISTS idx_videos_views_public 
ON videos(views_count DESC) 
WHERE visibility = 'public';

-- 4. Index on category for category browsing
-- Use case: "Get videos by category"
-- Query: SELECT * FROM videos WHERE category = $1 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_videos_category 
ON videos(category, created_at DESC) 
WHERE visibility = 'public';

-- 5. Index on is_short for Shorts vs regular videos
-- Use case: "Get only Shorts" or "Get only regular videos"
-- Query: SELECT * FROM videos WHERE is_short = true ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_videos_is_short 
ON videos(is_short, created_at DESC) 
WHERE visibility = 'public';

-- 6. Index on status for filtering by video status
-- Use case: "Get published videos", "Get draft videos"
-- Query: SELECT * FROM videos WHERE status = 'published' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_videos_status 
ON videos(status, created_at DESC);

-- 7. Index on monetization_enabled for monetized videos
-- Use case: "Get monetized videos"
-- Query: SELECT * FROM videos WHERE monetization_enabled = true ORDER BY views_count DESC
CREATE INDEX IF NOT EXISTS idx_videos_monetization 
ON videos(monetization_enabled, views_count DESC) 
WHERE visibility = 'public';

-- 8. Index on upload_date (created_at) for time-based queries
-- Use case: "Get videos uploaded in last X days"
-- Query: SELECT * FROM videos WHERE created_at > NOW() - INTERVAL '7 days'
CREATE INDEX IF NOT EXISTS idx_videos_created_at 
ON videos(created_at DESC);

-- ============================================================
-- FULL-TEXT SEARCH INDEXES
-- ============================================================

-- 9. Full-text search index for video title and description
-- Use case: "Search videos by title or description"
-- Query: SELECT * FROM videos WHERE to_tsvector('english', title || ' ' || description) @@ to_tsquery('english', 'search term')
-- Note: Requires PostgreSQL text search extension (usually enabled by default in Supabase)
CREATE INDEX IF NOT EXISTS idx_videos_fulltext 
ON videos USING GIN(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- 10. Trigram index for fuzzy search (partial matches, typos)
-- Use case: "Fuzzy search for video titles"
-- Query: SELECT * FROM videos WHERE title % 'search term'
-- Note: Requires pg_trgm extension
-- Uncomment if pg_trgm is available
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_videos_title_trigram 
-- ON videos USING GIN(title gin_trgm_ops);

-- ============================================================
-- VIDEO COMMENTS TABLE INDEXES
-- ============================================================

-- 11. Composite index for video comments (chronological order)
-- Use case: "Get comments for a video"
-- Query: SELECT * FROM video_comments WHERE video_id = $1 ORDER BY created_at DESC LIMIT 50
CREATE INDEX IF NOT EXISTS idx_video_comments_video_created 
ON video_comments(video_id, created_at DESC);

-- 12. Composite index for user's comments (chronological order)
-- Use case: "Get comments by user"
-- Query: SELECT * FROM video_comments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20
CREATE INDEX IF NOT EXISTS idx_video_comments_user_created 
ON video_comments(user_id, created_at DESC);

-- 13. Index on parent_id for nested comment replies
-- Use case: "Get replies to a comment"
-- Query: SELECT * FROM video_comments WHERE parent_id = $1 ORDER BY created_at ASC
CREATE INDEX IF NOT EXISTS idx_video_comments_parent 
ON video_comments(parent_id, created_at ASC) 
WHERE parent_id IS NOT NULL;

-- ============================================================
-- VIDEO LIKES TABLE INDEXES
-- ============================================================

-- 15. Index on video_id for like counting
-- Use case: "Get likes for a video", "Count likes for a video"
-- Query: SELECT * FROM video_likes WHERE video_id = $1
CREATE INDEX IF NOT EXISTS idx_video_likes_video 
ON video_likes(video_id);

-- 16. Index on user_id for user's liked videos
-- Use case: "Get videos liked by user", "Check if user liked a video"
-- Query: SELECT * FROM video_likes WHERE user_id = $1
CREATE INDEX IF NOT EXISTS idx_video_likes_user 
ON video_likes(user_id);

-- 17. Composite unique index to prevent duplicate likes
-- Use case: "Prevent user from liking same video twice"
-- Query: INSERT INTO video_likes (video_id, user_id) VALUES ($1, $2)
CREATE UNIQUE INDEX IF NOT EXISTS idx_video_likes_video_user_unique 
ON video_likes(video_id, user_id);

-- ============================================================
-- FOLLOWS TABLE INDEXES
-- ============================================================

-- 18. Index on following_id for user's followings
-- Use case: "Get who user is following"
-- Query: SELECT * FROM follows WHERE follower_id = $1
CREATE INDEX IF NOT EXISTS idx_follows_follower 
ON follows(follower_id);

-- 19. Index on follower_id for user's followers
-- Use case: "Get user's followers"
-- Query: SELECT * FROM follows WHERE following_id = $1
CREATE INDEX IF NOT EXISTS idx_follows_following 
ON follows(following_id);

-- 20. Composite unique index to prevent duplicate follows
-- Use case: "Prevent duplicate follow relationships"
-- Query: INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)
CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_follower_following_unique 
ON follows(follower_id, following_id);

-- ============================================================
-- PROFILES TABLE INDEXES
-- ============================================================

-- 21. Index on display_name for user search
-- Use case: "Search users by display name"
-- Query: SELECT * FROM profiles WHERE display_name ILIKE '%search%'
CREATE INDEX IF NOT EXISTS idx_profiles_display_name 
ON profiles(display_name);

-- 22. Index on handle for username lookup
-- Use case: "Get user by handle"
-- Query: SELECT * FROM profiles WHERE handle = $1
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_handle_unique 
ON profiles(handle);

-- ============================================================
-- COPYRIGHT FINGERPRINTS TABLE INDEXES
-- ============================================================

-- 23. Index on is_active for active fingerprints only
-- Use case: "Get active copyright fingerprints"
-- Query: SELECT * FROM copyright_fingerprints WHERE is_active = true
CREATE INDEX IF NOT EXISTS idx_copyright_fingerprints_active 
ON copyright_fingerprints(is_active);

-- 24. Index on content_type for filtering by content type
-- Use case: "Get fingerprints by content type"
-- Query: SELECT * FROM copyright_fingerprints WHERE content_type = 'video'
CREATE INDEX IF NOT EXISTS idx_copyright_fingerprints_type 
ON copyright_fingerprints(content_type);

-- ============================================================
-- ANALYTICS EVENTS TABLE INDEXES
-- ============================================================

-- 25. Index on video_id for video analytics
-- Use case: "Get analytics for a video"
-- Query: SELECT * FROM analytics_events WHERE video_id = $1 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_analytics_events_video 
ON analytics_events(video_id, created_at DESC);

-- 26. Index on user_id for user analytics
-- Use case: "Get analytics for a user"
-- Query: SELECT * FROM analytics_events WHERE user_id = $1 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_analytics_events_user 
ON analytics_events(user_id, created_at DESC);

-- 27. Index on event_type for event filtering
-- Use case: "Get all view events", "Get all like events"
-- Query: SELECT * FROM analytics_events WHERE event_type = 'video_view'
CREATE INDEX IF NOT EXISTS idx_analytics_events_type 
ON analytics_events(event_type, created_at DESC);

-- 28. Index on created_at for time-based analytics queries
-- Use case: "Get analytics for last 7 days"
-- Query: SELECT * FROM analytics_events WHERE created_at > NOW() - INTERVAL '7 days'
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at 
ON analytics_events(created_at DESC);

-- ============================================================
-- CHANNEL ANALYTICS TABLE INDEXES
-- ============================================================

-- 29. Index on channel_id for channel analytics
-- Use case: "Get analytics for a channel"
-- Query: SELECT * FROM channel_analytics WHERE channel_id = $1 ORDER BY date DESC
-- Note: channel_analytics table may not exist yet, skip this index if table doesn't exist
-- CREATE INDEX IF NOT EXISTS idx_channel_analytics_channel 
-- ON channel_analytics(channel_id, date DESC);

-- 30. Index on date for date-based analytics
-- Use case: "Get analytics for specific date range"
-- Query: SELECT * FROM channel_analytics WHERE date BETWEEN $1 AND $2
-- Note: channel_analytics table may not exist yet, skip this index if table doesn't exist
-- CREATE INDEX IF NOT EXISTS idx_channel_analytics_date 
-- ON channel_analytics(date DESC);

-- ============================================================
-- SUBTITLE TRACKS TABLE INDEXES
-- ============================================================

-- 31. Index on video_id for video subtitles
-- Use case: "Get subtitles for a video"
-- Query: SELECT * FROM subtitle_tracks WHERE video_id = $1
-- Note: subtitle_tracks table may not exist yet, skip this index if table doesn't exist
-- CREATE INDEX IF NOT EXISTS idx_subtitle_tracks_video 
-- ON subtitle_tracks(video_id);

-- 32. Index on language for language filtering
-- Use case: "Get subtitles in a specific language"
-- Query: SELECT * FROM subtitle_tracks WHERE language = 'en'
-- Note: subtitle_tracks table may not exist yet, skip this index if table doesn't exist
-- CREATE INDEX IF NOT EXISTS idx_subtitle_tracks_language 
-- ON subtitle_tracks(language);

-- 33. Index on status for filtering by subtitle status
-- Use case: "Get published subtitles", "Get draft subtitles"
-- Query: SELECT * FROM subtitle_tracks WHERE status = 'Published'
-- Note: subtitle_tracks table may not exist yet, skip this index if table doesn't exist
-- CREATE INDEX IF NOT EXISTS idx_subtitle_tracks_status 
-- ON subtitle_tracks(status);

-- ============================================================
-- INDEX ANALYSIS & OPTIMIZATION
-- ============================================================

-- Analyze the created indexes
-- Run this after index creation to check their usage
-- ANALYZE idx_videos_owner_created;
-- ANALYZE idx_videos_visibility_public;
-- ANALYZE idx_videos_views_public;
-- ANALYZE idx_videos_fulltext;
-- ANALYZE idx_video_comments_video_created;
-- ANALYZE idx_video_comments_user_created;
-- ANALYZE idx_video_likes_video;
-- ANALYZE idx_video_likes_user;

-- ============================================================
-- PERFORMANCE NOTES
-- ============================================================

-- Partial indexes save storage space and improve write performance
-- Full-text search index enables fast text search without LIKE queries
-- Composite indexes optimize multi-column WHERE clauses
-- UNIQUE indexes prevent duplicate data at database level
-- Index order matters: most selective column first

-- Estimated storage overhead: ~10-20% of table size
-- Estimated write performance impact: 5-15% slower writes
-- Estimated read performance improvement: 10-100x faster reads

-- ============================================================
-- MAINTENANCE NOTES
-- ============================================================

-- Reindex when table grows significantly (>1M rows)
-- REINDEX INDEX idx_videos_owner_created;

-- Monitor index usage with:
-- SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';

-- Remove unused indexes periodically:
-- DROP INDEX IF EXISTS idx_unused_index;

-- Consider table partitioning for very large tables (>100M rows)
-- Tables > 100M rows should use partitioning by date or region

-- ============================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================

-- To rollback this migration, run:
-- DROP INDEX IF EXISTS idx_videos_owner_created;
-- DROP INDEX IF EXISTS idx_videos_visibility_public;
-- DROP INDEX IF EXISTS idx_videos_views_public;
-- DROP INDEX IF EXISTS idx_videos_category;
-- DROP INDEX IF EXISTS idx_videos_is_short;
-- DROP INDEX IF EXISTS idx_videos_status;
-- DROP INDEX IF EXISTS idx_videos_monetization;
-- DROP INDEX IF EXISTS idx_videos_created_at;
-- DROP INDEX IF EXISTS idx_videos_fulltext;
-- DROP INDEX IF EXISTS idx_video_comments_video_created;
-- DROP INDEX IF EXISTS idx_video_comments_user_created;
-- DROP INDEX IF EXISTS idx_video_comments_parent;
-- DROP INDEX IF EXISTS idx_video_likes_video;
-- DROP INDEX IF EXISTS idx_video_likes_user;
-- DROP INDEX IF EXISTS idx_video_likes_video_user_unique;
-- DROP INDEX IF EXISTS idx_follows_follower;
-- DROP INDEX IF EXISTS idx_follows_following;
-- DROP INDEX IF EXISTS idx_follows_follower_following_unique;
-- DROP INDEX IF EXISTS idx_profiles_display_name;
-- DROP INDEX IF EXISTS idx_profiles_handle_unique;
-- DROP INDEX IF EXISTS idx_copyright_fingerprints_active;
-- DROP INDEX IF EXISTS idx_copyright_fingerprints_type;
-- DROP INDEX IF EXISTS idx_analytics_events_video;
-- DROP INDEX IF EXISTS idx_analytics_events_user;
-- DROP INDEX IF EXISTS idx_analytics_events_type;
-- DROP INDEX IF EXISTS idx_analytics_events_created_at;
-- DROP INDEX IF EXISTS idx_channel_analytics_channel;
-- DROP INDEX IF EXISTS idx_channel_analytics_date;
-- Note: channel_analytics table may not exist yet
-- DROP INDEX IF EXISTS idx_videos_title_trigram;
-- DROP INDEX IF EXISTS idx_subtitle_tracks_video;
-- DROP INDEX IF EXISTS idx_subtitle_tracks_language;
-- DROP INDEX IF EXISTS idx_subtitle_tracks_status;
-- Note: subtitle_tracks table may not exist yet
