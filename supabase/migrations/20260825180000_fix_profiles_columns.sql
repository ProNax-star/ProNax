-- Fix profiles table columns to match admin panel queries

-- Add missing columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscribers_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS videos_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_creator boolean DEFAULT false;

-- Update existing data if columns were just added
-- Map verified to is_verified
UPDATE public.profiles SET is_verified = verified WHERE is_verified IS NULL AND verified IS NOT NULL;
-- Map follower_count to subscribers_count  
UPDATE public.profiles SET subscribers_count = follower_count WHERE subscribers_count = 0 AND follower_count > 0;
-- Map video_count to videos_count
UPDATE public.profiles SET videos_count = video_count WHERE videos_count = 0 AND video_count > 0;
