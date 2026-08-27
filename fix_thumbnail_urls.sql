-- Fix malformed thumbnail URLs in videos table
-- Run this in your Supabase SQL editor

-- Update videos with malformed thumb_url values (missing path prefix)
UPDATE videos 
SET thumb_url = '/uploads/' || thumb_url 
WHERE thumb_url IS NOT NULL 
AND thumb_url NOT LIKE 'http%' 
AND thumb_url NOT LIKE '/uploads/%'
AND thumb_url NOT LIKE 'https://via.placeholder.com/%';

-- Update videos with 'thumb.jpg' or similar simple filenames
UPDATE videos 
SET thumb_url = '/uploads/' || thumb_url 
WHERE thumb_url IS NOT NULL 
AND thumb_url LIKE '%.jpg' 
AND thumb_url NOT LIKE 'http%' 
AND thumb_url NOT LIKE '/%';

-- Set placeholder for videos with NULL thumb_url
UPDATE videos 
SET thumb_url = 'https://via.placeholder.com/320x180?text=No+Thumbnail'
WHERE thumb_url IS NULL;
