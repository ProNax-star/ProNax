-- Add missing likes column to videos table
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0;
