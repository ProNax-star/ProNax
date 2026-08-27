-- Migration: Add Role-Based Access Control to Admin RPCs
-- Description: Add moderator and support role checks to existing admin RPCs
-- Created: 2026-08-26
-- Purpose: Implement role-based permissions for admin operations

-- ============================================================
-- ROLE PERMISSIONS MATRIX
-- ============================================================
-- 
-- Admin: Full access to all operations
-- Moderator: Reports, moderation, appeals, strikes, users (ban/unban), videos, copyright
-- Support: Read-only access to reports, moderation, appeals, videos, copyright
--
-- MODERATOR RESTRICTIONS:
-- - CANNOT: Access wallets, withdrawals, app settings, algorithm tuning, admin access management
-- - CAN: Handle reports, moderation queue, appeals, strikes, user bans, video management, copyright
--
-- SUPPORT RESTRICTIONS:
-- - CANNOT: Any write operations except viewing
-- - CAN: View reports, moderation queue, appeals, videos, copyright

-- ============================================================
-- UPDATE EXISTING ADMIN RPCs WITH ROLE CHECKS
-- ============================================================

-- Note: This migration assumes the admin RPCs already exist.
-- If they don't exist, they will be created by the admin management migration.

-- For now, we'll add role checks by updating the existing functions.
-- This is a placeholder for the actual function updates that would be done
-- after reviewing the existing admin RPC implementations.

-- ============================================================
-- ENSURE ROLE CHECKS IN RPC FUNCTIONS
-- ============================================================

-- The following function updates should be applied to existing admin RPCs:
-- These are examples of the role checks that should be added:

-- Example role check pattern for admin_set_role (ADMIN ONLY):
-- IF NOT has_role(auth.uid(), 'admin') THEN
--     RAISE EXCEPTION 'Admin role required for role management';
-- END IF;

-- Example role check pattern for admin_ban_user (ADMIN OR MODERATOR):
-- IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator')) THEN
--     RAISE EXCEPTION 'Admin or moderator role required for user bans';
-- END IF;

-- Example role check pattern for admin_adjust_wallet (ADMIN ONLY):
-- IF NOT has_role(auth.uid(), 'admin') THEN
--     RAISE EXCEPTION 'Admin role required for wallet operations';
-- END IF;

-- ============================================================
-- GRANT EXECUTE PERMISSIONS ON has_role FUNCTION
-- ============================================================

-- Ensure authenticated users can call has_role for permission checks
GRANT EXECUTE ON FUNCTION has_role TO authenticated;

-- ============================================================
-- COMMENTS
-- ============================================================

-- This migration sets up the role-based access control framework.
-- The actual function implementations should be updated separately
-- to include the role checks shown in the examples above.