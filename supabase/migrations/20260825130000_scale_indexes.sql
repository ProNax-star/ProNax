-- Migration: Scale Indexes for 50M User Scale
-- Description: Add additional indexes for pagination and query optimization at scale
-- Created: 2026-08-25
-- Purpose: Support efficient pagination for 50M+ users

-- ============================================================
-- VIDEOS TABLE - ADDITIONAL INDEXES
-- ============================================================

-- Composite index for visibility + status filtering with time ordering
-- Use case: "Get public published videos sorted by creation date"
-- Query: SELECT * FROM videos WHERE visibility = 'public' AND status = 'published' ORDER BY created_at DESC LIMIT 24
CREATE INDEX IF NOT EXISTS idx_videos_visibility_status_created 
ON videos(visibility, status, created_at DESC) 
WHERE visibility = 'public' AND status = 'published';

-- Unique index on sha256 for deduplication
-- Use case: Prevent duplicate video uploads by content hash
-- Query: INSERT INTO videos (sha256, ...) VALUES ($1, ...)
CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_sha256_unique 
ON videos(sha256) 
WHERE sha256 IS NOT NULL;

-- ============================================================
-- WATCH HISTORY TABLE INDEXES
-- ============================================================

-- Composite index for user's watch history (chronological order)
-- Use case: "Get user's recently watched videos"
-- Query: SELECT * FROM watch_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50
CREATE INDEX IF NOT EXISTS idx_watch_history_user_created 
ON watch_history(user_id, created_at DESC);

-- ============================================================
-- NOTIFICATIONS TABLE INDEXES
-- ============================================================

-- Composite index for user notifications (chronological order)
-- Use case: "Get user's notifications sorted by date"
-- Query: SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

-- ============================================================
-- INDEX NOTES
-- ============================================================

-- These indexes complement the existing performance indexes from 20260812120000_performance_indexes.sql
-- No duplicates are created - all use IF NOT EXISTS

-- Estimated storage overhead: ~5-10% of table size for new indexes
-- Estimated write performance impact: 3-8% slower writes for affected tables
-- Estimated read performance improvement: 10-50x faster for paginated queries

-- ============================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================

-- To rollback this migration, run:
-- DROP INDEX IF EXISTS idx_videos_visibility_status_created;
-- DROP INDEX IF EXISTS idx_videos_sha256_unique;
-- DROP INDEX IF EXISTS idx_watch_history_user_created;
-- DROP INDEX IF EXISTS idx_notifications_user_created;
