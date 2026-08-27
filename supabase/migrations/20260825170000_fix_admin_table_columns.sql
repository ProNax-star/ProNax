-- Fix column mismatches for admin panel queries

-- Add sort_order column to categories (or rename position to sort_order)
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Update sort_order from position if it exists
UPDATE public.categories SET sort_order = "position" WHERE sort_order = 0 AND "position" > 0;

-- Check app_settings table structure and add id column if missing
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS id integer DEFAULT 1;

-- Add primary key constraint if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_settings_pkey') THEN
        ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);
    END IF;
END $$;

-- Ensure moderation_settings has proper id column
ALTER TABLE public.moderation_settings ADD COLUMN IF NOT EXISTS id integer DEFAULT 1;

-- Add primary key constraint if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'moderation_settings_pkey') THEN
        ALTER TABLE public.moderation_settings ADD CONSTRAINT moderation_settings_pkey PRIMARY KEY (id);
    END IF;
END $$;
