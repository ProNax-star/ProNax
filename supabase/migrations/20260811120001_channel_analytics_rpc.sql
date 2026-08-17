-- Create RPC function for Channel Analytics that returns real-time metrics and audience demographics
CREATE OR REPLACE FUNCTION get_channel_analytics(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    realtime_data RECORD;
    geography_data RECORD;
    minute_data RECORD;
    result jsonb;
    timestamps jsonb := '[]'::jsonb;
BEGIN
    -- Get real-time views (48h and 60m)
    SELECT * INTO realtime_data
    FROM get_realtime_views(p_user_id);
    
    -- Get top geographies
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'countryCode', country_code,
                'countryName', country_name,
                'percentage', percentage
            )
        ) INTO geography_data
    FROM get_geography_analytics(p_user_id);
    
    -- Get minute-by-minute timestamps for the last 60 minutes
    FOR minute_data IN 
        SELECT 
            minute_label,
            views,
            NOW() - (i * INTERVAL '1 minute') as timestamp
        FROM get_minute_views(p_user_id, 60)
        ORDER BY i DESC
    LOOP
        timestamps := timestamps || jsonb_build_object(
            'time', minute_data.timestamp::text,
            'label', minute_data.minute_label,
            'views', minute_data.views
        );
    END LOOP;
    
    -- Build the final JSON response
    result := jsonb_build_object(
        'realTimeViews', jsonb_build_object(
            '48h', COALESCE(realtime_data.last_48_hours, 0),
            '60m', COALESCE(realtime_data.last_60_minutes, 0),
            'timestamps', timestamps
        ),
        'topGeographies', COALESCE(geography_data, '[]'::jsonb)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_channel_analytics(uuid) TO authenticated;
