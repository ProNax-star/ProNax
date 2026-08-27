/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
-- Fix pg_cron scheduling syntax for expire_bans function

-- Remove any existing cron job
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('expire-bans');
    END IF;
END $$;

-- Schedule the expire_bans function to run every 10 minutes using pg_cron
-- Note: This requires the pg_cron extension to be installed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'expire-bans',
            '*/10 * * * *',
            'SELECT public.expire_bans();'
        );
    ELSE
        RAISE NOTICE 'pg_cron extension not found. Ban expiry will need to be triggered manually or via application code.';
    END IF;
END $$;
