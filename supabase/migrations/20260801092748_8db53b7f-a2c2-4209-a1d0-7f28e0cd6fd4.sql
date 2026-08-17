CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');

CREATE TABLE public.playlist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    playlist_id uuid NOT NULL,
    video_id text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.user_wallets (
    user_id uuid NOT NULL,
    balance numeric(14,4) DEFAULT 0 NOT NULL,
    total_earned numeric(14,4) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    total_withdrawn numeric DEFAULT 0 NOT NULL
);
CREATE TABLE public.withdrawal_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount numeric NOT NULL,
    method text,
    destination text,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    country text,
    payment_details jsonb DEFAULT '{}'::jsonb NOT NULL,
    processed_at timestamp with time zone,
    CONSTRAINT withdrawal_requests_amount_check CHECK ((amount > (0)::numeric))
);
CREATE TABLE public.ab_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'running'::text NOT NULL,
    target text DEFAULT 'feed_weights'::text NOT NULL,
    variants jsonb DEFAULT '[]'::jsonb NOT NULL,
    metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    winner text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ab_tests_status_check CHECK ((status = ANY (ARRAY['running'::text, 'paused'::text, 'completed'::text])))
);
CREATE TABLE public.playlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    visibility text DEFAULT 'private'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT playlists_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'unlisted'::text, 'private'::text])))
);
CREATE TABLE public.videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text,
    tags text[] DEFAULT '{}'::text[],
    category text,
    language text DEFAULT 'en'::text,
    visibility text DEFAULT 'public'::text NOT NULL,
    age_restriction text DEFAULT 'none'::text,
    license text DEFAULT 'standard'::text,
    monetization_enabled boolean DEFAULT true,
    scheduled_at timestamp with time zone,
    r2_video_key text NOT NULL,
    r2_thumb_key text,
    video_url text NOT NULL,
    thumb_url text,
    mime_type text,
    size_bytes bigint,
    sha256 text,
    status text DEFAULT 'ready'::text NOT NULL,
    views_count bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_removed boolean DEFAULT false NOT NULL,
    is_shadow_banned boolean DEFAULT false NOT NULL,
    moderation_reason text,
    duration_seconds integer,
    is_short boolean DEFAULT false NOT NULL,
    preview_sprite_url text,
    preview_sprite_frames integer,
    is_pending_review boolean DEFAULT false NOT NULL,
    boost_score numeric DEFAULT 0 NOT NULL,
    report_count integer DEFAULT 0 NOT NULL,
    auto_suppressed boolean DEFAULT false NOT NULL,
    preview_url text,
    variants jsonb,
    audio_track_id text,
    original_sound_credit text,
    stitch_source_videos text[],
    stitch_position integer,
    duet_source_video text,
    reaction_source_video text,
    trending_score numeric DEFAULT 0 NOT NULL,
    sound_usage_count integer DEFAULT 0 NOT NULL,
    aspect_ratio numeric,
    likes_count integer DEFAULT 0,
    comments_count integer DEFAULT 0,
    shares_count integer DEFAULT 0,
    audio_track_title text,
    published_at timestamp with time zone
);
ALTER TABLE ONLY public.videos REPLICA IDENTITY FULL;
CREATE TABLE public.video_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id text NOT NULL,
    user_id uuid NOT NULL,
    parent_id uuid,
    text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    likes_count integer DEFAULT 0,
    replies_count integer DEFAULT 0,
    CONSTRAINT video_comments_text_check CHECK (((length(text) >= 1) AND (length(text) <= 2000)))
);
CREATE TABLE public.ab_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_id uuid NOT NULL,
    variant text NOT NULL,
    user_id uuid,
    event text NOT NULL,
    value numeric DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    experiment_id uuid
);
CREATE TABLE public.ab_experiments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'draft'::text NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    target_percentage integer DEFAULT 50 NOT NULL,
    variants jsonb DEFAULT '{"control": {}, "variant": {}}'::jsonb NOT NULL,
    metrics jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    target_type text,
    target_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.ad_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slot text NOT NULL,
    kind text NOT NULL,
    network text DEFAULT 'custom'::text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    html_snippet text,
    vast_tag_url text,
    ad_unit_id text,
    publisher_id text,
    frequency integer DEFAULT 0 NOT NULL,
    notes text,
    impressions_count bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ad_settings_kind_check CHECK ((kind = ANY (ARRAY['banner'::text, 'video'::text])))
);
CREATE TABLE public.admin_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.algorithm_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor uuid,
    previous jsonb DEFAULT '{}'::jsonb NOT NULL,
    next jsonb DEFAULT '{}'::jsonb NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.analytics_events (
    id bigint NOT NULL,
    event text NOT NULL,
    user_id uuid,
    video_id text,
    props jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    event_type text,
    revenue numeric,
    gross_revenue numeric,
    cpm numeric
);
CREATE SEQUENCE public.analytics_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.analytics_events_id_seq OWNED BY public.analytics_events.id;
CREATE TABLE public.app_settings (
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.appeals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text,
    message text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    icon text,
    "position" integer DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.channel_notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    notice_type text NOT NULL,
    severity text DEFAULT 'info'::text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    action_required boolean DEFAULT false NOT NULL,
    action_url text,
    action_label text,
    related_video_id uuid,
    related_claim_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.comment_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.copyright_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id uuid NOT NULL,
    claimant_id uuid NOT NULL,
    claim_type text NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    action_taken text,
    match_percentage numeric,
    matched_content_id text,
    matched_content_title text,
    matched_content_owner text,
    dispute_reason text,
    dispute_evidence text[],
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.copyright_fingerprints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_id text NOT NULL,
    content_type text NOT NULL,
    owner_id uuid NOT NULL,
    fingerprint_data jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.creator_earnings (
    user_id uuid NOT NULL,
    total_views bigint DEFAULT 0 NOT NULL,
    total_watch_seconds bigint DEFAULT 0 NOT NULL,
    total_earned numeric DEFAULT 0 NOT NULL,
    last_computed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    video_id text,
    gross_amount numeric,
    cpm numeric,
    impressions integer,
    source text,
    creator_id uuid NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT creator_earnings_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'available'::text, 'paid'::text])))
);
CREATE TABLE public.dynamic_routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    path text NOT NULL,
    title text,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.dynamic_widgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page text NOT NULL,
    kind text NOT NULL,
    title text,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.feature_flags (
    key text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    description text,
    rollout_percent integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.follows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    follower_id uuid NOT NULL,
    following_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT follows_check CHECK ((follower_id <> following_id))
);
CREATE TABLE public.moderation_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_type text NOT NULL,
    content_id text NOT NULL,
    owner_id uuid,
    flagged_reason text,
    snapshot jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.moderation_settings (
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    expires_at timestamp with time zone,
    action_url text,
    action_label text,
    icon text,
    category text
);
CREATE TABLE public.platform_revenue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_user_id uuid,
    video_id text NOT NULL,
    amount numeric(14,6) DEFAULT 0 NOT NULL,
    gross_revenue numeric(14,6) DEFAULT 0 NOT NULL,
    ad_network text,
    cpm numeric(14,4),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    display_name text,
    upload_limit_mb integer DEFAULT 1024 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_banned boolean DEFAULT false NOT NULL,
    banned_until timestamp with time zone,
    ban_reason text,
    bio text,
    avatar_url text,
    is_bot_flagged boolean DEFAULT false NOT NULL,
    bot_flagged_at timestamp with time zone,
    bot_flag_reason text,
    daily_earnings_usd numeric DEFAULT 0,
    banner_url text,
    handle text,
    verified boolean DEFAULT false,
    follower_count integer DEFAULT 0,
    following_count integer DEFAULT 0,
    video_count integer DEFAULT 0,
    total_views bigint DEFAULT 0,
    CONSTRAINT handle_format CHECK (((handle IS NULL) OR (handle ~ '^[a-zA-Z0-9_]{3,30}$'::text)))
);
CREATE TABLE public.revenue_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    video_id text NOT NULL,
    views_count integer DEFAULT 1 NOT NULL,
    amount_earned numeric(14,4) DEFAULT 0.001 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ad_network text,
    cpm numeric(14,4),
    gross_revenue numeric(14,6)
);
CREATE TABLE public.sidebar_menu (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section text DEFAULT 'sidebar'::text NOT NULL,
    label text NOT NULL,
    icon text,
    href text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.streams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'scheduled'::text NOT NULL,
    stream_key text,
    playback_url text,
    scheduled_at timestamp with time zone,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    viewer_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stream_url text,
    chat_enabled boolean DEFAULT true NOT NULL,
    recording_enabled boolean DEFAULT false NOT NULL,
    recording_url text,
    thumbnail_url text,
    category text,
    tags text[] DEFAULT '{}'::text[],
    viewer_peak integer DEFAULT 0 NOT NULL,
    chat_message_count integer DEFAULT 0 NOT NULL
);
CREATE TABLE public.system_config (
    id integer DEFAULT 1 NOT NULL,
    site_name text DEFAULT 'TubeApp'::text NOT NULL,
    site_description text,
    logo_url text,
    favicon_url text,
    primary_color text DEFAULT '#ff0000'::text,
    maintenance_mode boolean DEFAULT false NOT NULL,
    signup_enabled boolean DEFAULT true NOT NULL,
    uploads_enabled boolean DEFAULT true NOT NULL,
    ads_enabled boolean DEFAULT true NOT NULL,
    min_withdrawal numeric DEFAULT 10 NOT NULL,
    extra jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT system_config_singleton CHECK ((id = 1))
);
CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.user_withdrawal_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    method_type text NOT NULL,
    account_identifier text NOT NULL,
    account_holder_name text,
    is_default boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.video_ads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id text NOT NULL,
    ad_url text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT video_ads_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);
CREATE TABLE public.video_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.video_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id text NOT NULL,
    reporter_id uuid NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.video_saves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.video_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id uuid NOT NULL,
    user_id uuid,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    viewer_id uuid
);
CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    delta numeric NOT NULL,
    balance_after numeric,
    kind text NOT NULL,
    reference_id text,
    reason text,
    performed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.watch_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    video_id text NOT NULL,
    watched_at timestamp with time zone DEFAULT now() NOT NULL,
    watch_seconds integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_watched_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE ONLY public.analytics_events ALTER COLUMN id SET DEFAULT nextval('public.analytics_events_id_seq'::regclass);
ALTER TABLE ONLY public.ab_events
    ADD CONSTRAINT ab_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ab_experiments
    ADD CONSTRAINT ab_experiments_name_key UNIQUE (name);
ALTER TABLE ONLY public.ab_experiments
    ADD CONSTRAINT ab_experiments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ab_tests
    ADD CONSTRAINT ab_tests_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ad_settings
    ADD CONSTRAINT ad_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ad_settings
    ADD CONSTRAINT ad_settings_slot_key UNIQUE (slot);
ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.algorithm_audit_log
    ADD CONSTRAINT algorithm_audit_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);
ALTER TABLE ONLY public.appeals
    ADD CONSTRAINT appeals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.channel_notices
    ADD CONSTRAINT channel_notices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_comment_id_user_id_key UNIQUE (comment_id, user_id);
ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.copyright_claims
    ADD CONSTRAINT copyright_claims_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.copyright_fingerprints
    ADD CONSTRAINT copyright_fingerprints_content_id_key UNIQUE (content_id);
ALTER TABLE ONLY public.copyright_fingerprints
    ADD CONSTRAINT copyright_fingerprints_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.creator_earnings
    ADD CONSTRAINT creator_earnings_pkey PRIMARY KEY (user_id);
ALTER TABLE ONLY public.dynamic_routes
    ADD CONSTRAINT dynamic_routes_path_key UNIQUE (path);
ALTER TABLE ONLY public.dynamic_routes
    ADD CONSTRAINT dynamic_routes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.dynamic_widgets
    ADD CONSTRAINT dynamic_widgets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (key);
ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_following_id_key UNIQUE (follower_id, following_id);
ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.moderation_queue
    ADD CONSTRAINT moderation_queue_content_type_content_id_key UNIQUE (content_type, content_id);
ALTER TABLE ONLY public.moderation_queue
    ADD CONSTRAINT moderation_queue_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.moderation_settings
    ADD CONSTRAINT moderation_settings_pkey PRIMARY KEY (key);
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.platform_revenue
    ADD CONSTRAINT platform_revenue_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.playlist_items
    ADD CONSTRAINT playlist_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.playlist_items
    ADD CONSTRAINT playlist_items_playlist_id_video_id_key UNIQUE (playlist_id, video_id);
ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_handle_key UNIQUE (handle);
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.revenue_logs
    ADD CONSTRAINT revenue_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sidebar_menu
    ADD CONSTRAINT sidebar_menu_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.streams
    ADD CONSTRAINT streams_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_pkey PRIMARY KEY (user_id);
ALTER TABLE ONLY public.user_withdrawal_methods
    ADD CONSTRAINT user_withdrawal_methods_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.video_ads
    ADD CONSTRAINT video_ads_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.video_comments
    ADD CONSTRAINT video_comments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.video_likes
    ADD CONSTRAINT video_likes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.video_likes
    ADD CONSTRAINT video_likes_video_id_user_id_key UNIQUE (video_id, user_id);
ALTER TABLE ONLY public.video_reports
    ADD CONSTRAINT video_reports_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.video_saves
    ADD CONSTRAINT video_saves_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.video_saves
    ADD CONSTRAINT video_saves_video_id_user_id_key UNIQUE (video_id, user_id);
ALTER TABLE ONLY public.video_views
    ADD CONSTRAINT video_views_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.video_views
    ADD CONSTRAINT video_views_video_id_user_id_key UNIQUE (video_id, user_id);
ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_user_id_video_id_key UNIQUE (user_id, video_id);
ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);
CREATE INDEX ab_events_test_variant_idx ON public.ab_events USING btree (test_id, variant, created_at DESC);
CREATE INDEX follows_follower_idx ON public.follows USING btree (follower_id);
CREATE INDEX idx_ab_events_experiment ON public.ab_events USING btree (experiment_id, created_at DESC);
CREATE INDEX idx_ab_events_user ON public.ab_events USING btree (user_id, created_at DESC);
CREATE INDEX idx_ab_experiments_status ON public.ab_experiments USING btree (status, start_date);
CREATE INDEX idx_activity_user ON public.activity_log USING btree (user_id, created_at DESC);
CREATE INDEX idx_admin_actions_created ON public.admin_actions USING btree (created_at DESC);
CREATE INDEX idx_analytics_event ON public.analytics_events USING btree (event, created_at DESC);
CREATE INDEX idx_analytics_events_type ON public.analytics_events USING btree (event_type, created_at DESC);
CREATE INDEX idx_analytics_events_user ON public.analytics_events USING btree (user_id, created_at DESC);
CREATE INDEX idx_channel_notices_severity ON public.channel_notices USING btree (severity);
CREATE INDEX idx_channel_notices_type ON public.channel_notices USING btree (notice_type);
CREATE INDEX idx_channel_notices_user ON public.channel_notices USING btree (user_id, is_read, created_at DESC);
CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes USING btree (comment_id);
CREATE INDEX idx_comment_likes_user_id ON public.comment_likes USING btree (user_id);
CREATE INDEX idx_copyright_claims_claimant ON public.copyright_claims USING btree (claimant_id);
CREATE INDEX idx_copyright_claims_detected ON public.copyright_claims USING btree (detected_at DESC);
CREATE INDEX idx_copyright_claims_severity ON public.copyright_claims USING btree (severity);
CREATE INDEX idx_copyright_claims_status ON public.copyright_claims USING btree (status);
CREATE INDEX idx_copyright_claims_video ON public.copyright_claims USING btree (video_id);
CREATE INDEX idx_copyright_fingerprints_content ON public.copyright_fingerprints USING btree (content_id);
CREATE INDEX idx_copyright_fingerprints_owner ON public.copyright_fingerprints USING btree (owner_id);
CREATE INDEX idx_copyright_fingerprints_type ON public.copyright_fingerprints USING btree (content_type);
CREATE INDEX idx_creator_earnings_creator_id ON public.creator_earnings USING btree (creator_id);
CREATE INDEX idx_creator_earnings_period ON public.creator_earnings USING btree (period_start, period_end);
CREATE INDEX idx_creator_earnings_status ON public.creator_earnings USING btree (status);
CREATE INDEX idx_creator_earnings_user ON public.creator_earnings USING btree (user_id, created_at DESC);
CREATE INDEX idx_creator_earnings_video ON public.creator_earnings USING btree (video_id, created_at DESC);
CREATE INDEX idx_creator_earnings_video_id ON public.creator_earnings USING btree (video_id);
CREATE INDEX idx_follows_created_at ON public.follows USING btree (created_at DESC);
CREATE INDEX idx_follows_follower ON public.follows USING btree (follower_id);
CREATE INDEX idx_follows_following ON public.follows USING btree (following_id);
CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);
CREATE INDEX idx_notifications_read_at ON public.notifications USING btree (read_at) WHERE (read_at IS NULL);
CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);
CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, read_at) WHERE (read_at IS NULL);
CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX idx_profiles_created_at ON public.profiles USING btree (created_at DESC);
CREATE INDEX idx_profiles_display_name ON public.profiles USING btree (display_name);
CREATE INDEX idx_profiles_follower_count ON public.profiles USING btree (follower_count DESC);
CREATE INDEX idx_profiles_handle ON public.profiles USING btree (handle);
CREATE INDEX idx_revenue_logs_analytics ON public.revenue_logs USING btree (user_id, video_id, created_at DESC);
CREATE INDEX idx_shorts_feed ON public.videos USING btree (created_at DESC) WHERE ((is_short = true) AND (visibility = 'public'::text) AND (status = 'ready'::text) AND (COALESCE(is_removed, false) = false));
CREATE INDEX idx_user_wallets_user ON public.user_wallets USING btree (user_id);
CREATE INDEX idx_user_withdrawal_methods_user ON public.user_withdrawal_methods USING btree (user_id, updated_at DESC);
CREATE INDEX idx_video_comments_parent ON public.video_comments USING btree (parent_id);
CREATE INDEX idx_video_comments_video ON public.video_comments USING btree (video_id, created_at DESC);
CREATE INDEX idx_video_likes_created_at ON public.video_likes USING btree (created_at DESC);
CREATE INDEX idx_video_likes_user ON public.video_likes USING btree (user_id);
CREATE INDEX idx_video_likes_video ON public.video_likes USING btree (video_id);
CREATE INDEX idx_video_saves_user ON public.video_saves USING btree (user_id, created_at DESC);
CREATE INDEX idx_video_views_created_at ON public.video_views USING btree (created_at DESC);
CREATE INDEX idx_video_views_user_id ON public.video_views USING btree (user_id);
CREATE INDEX idx_video_views_video_id ON public.video_views USING btree (video_id);
CREATE INDEX idx_video_views_viewer_id ON public.video_views USING btree (viewer_id);
CREATE INDEX idx_videos_audio_track ON public.videos USING btree (audio_track_id);
CREATE INDEX idx_videos_category ON public.videos USING btree (category);
CREATE INDEX idx_videos_category_feed ON public.videos USING btree (category, visibility, status, created_at DESC) WHERE ((visibility = 'public'::text) AND (status = 'ready'::text));
CREATE INDEX idx_videos_created_at ON public.videos USING btree (created_at DESC);
CREATE INDEX idx_videos_feed_query ON public.videos USING btree (visibility, status, is_removed, is_short, created_at DESC);
CREATE INDEX idx_videos_is_short ON public.videos USING btree (is_short);
CREATE INDEX idx_videos_likes_count ON public.videos USING btree (likes_count DESC);
CREATE INDEX idx_videos_longform_feed ON public.videos USING btree (is_short, status, visibility, published_at DESC) WHERE ((is_short = false) AND (status = 'published'::text) AND (visibility = 'public'::text));
CREATE INDEX idx_videos_owner_id ON public.videos USING btree (owner_id);
CREATE INDEX idx_videos_owner_status ON public.videos USING btree (owner_id, status, created_at DESC);
CREATE INDEX idx_videos_public_ready ON public.videos USING btree (created_at DESC) WHERE ((visibility = 'public'::text) AND (status = 'ready'::text) AND (COALESCE(is_removed, false) = false));
CREATE INDEX idx_videos_published_at ON public.videos USING btree (published_at DESC NULLS LAST);
CREATE INDEX idx_videos_shorts_feed ON public.videos USING btree (is_short, status, visibility, published_at DESC) WHERE ((is_short = true) AND (status = 'published'::text) AND (visibility = 'public'::text));
CREATE INDEX idx_videos_status ON public.videos USING btree (status);
CREATE INDEX idx_videos_tags ON public.videos USING gin (tags);
CREATE INDEX idx_videos_views_count ON public.videos USING btree (views_count DESC);
CREATE INDEX idx_videos_visibility ON public.videos USING btree (visibility);
CREATE INDEX idx_wallet_tx_user ON public.wallet_transactions USING btree (user_id, created_at DESC);
CREATE INDEX idx_watch_history_created_at ON public.watch_history USING btree (created_at DESC);
CREATE INDEX idx_watch_history_last_watched ON public.watch_history USING btree (user_id, last_watched_at DESC);
CREATE INDEX idx_watch_history_user_id ON public.watch_history USING btree (user_id);
CREATE INDEX idx_watch_history_video_id ON public.watch_history USING btree (video_id);
CREATE INDEX playlist_items_playlist_pos_idx ON public.playlist_items USING btree (playlist_id, "position");
CREATE INDEX revenue_logs_user_idx ON public.revenue_logs USING btree (user_id, created_at DESC);
CREATE INDEX revenue_logs_user_video_idx ON public.revenue_logs USING btree (user_id, video_id);
CREATE INDEX video_ads_video_id_idx ON public.video_ads USING btree (video_id);
CREATE INDEX video_likes_video_idx ON public.video_likes USING btree (video_id);
CREATE INDEX video_reports_reporter_id_idx ON public.video_reports USING btree (reporter_id);
CREATE INDEX video_reports_video_id_idx ON public.video_reports USING btree (video_id);
CREATE INDEX videos_boost_idx ON public.videos USING btree (boost_score DESC);
CREATE INDEX videos_category_idx ON public.videos USING btree (category);
CREATE INDEX videos_created_idx ON public.videos USING btree (created_at DESC);
CREATE INDEX videos_feed_hot_idx ON public.videos USING btree (visibility, status, is_removed, is_short, created_at DESC) WHERE ((visibility = 'public'::text) AND (status = 'ready'::text) AND (is_removed = false));
CREATE INDEX videos_owner_idx ON public.videos USING btree (owner_id);
CREATE INDEX videos_views_idx ON public.videos USING btree (views_count DESC) WHERE ((visibility = 'public'::text) AND (status = 'ready'::text) AND (is_removed = false));
CREATE INDEX watch_history_user_idx ON public.watch_history USING btree (user_id, watched_at DESC);
CREATE INDEX watch_history_user_time_idx ON public.watch_history USING btree (user_id, watched_at DESC);
ALTER TABLE ONLY public.ab_events
    ADD CONSTRAINT ab_events_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES public.ab_experiments(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.ab_events
    ADD CONSTRAINT ab_events_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.ab_tests(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.ab_experiments
    ADD CONSTRAINT ab_experiments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.ab_tests
    ADD CONSTRAINT ab_tests_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.algorithm_audit_log
    ADD CONSTRAINT algorithm_audit_log_actor_fkey FOREIGN KEY (actor) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.channel_notices
    ADD CONSTRAINT channel_notices_related_claim_id_fkey FOREIGN KEY (related_claim_id) REFERENCES public.copyright_claims(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.channel_notices
    ADD CONSTRAINT channel_notices_related_video_id_fkey FOREIGN KEY (related_video_id) REFERENCES public.videos(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.channel_notices
    ADD CONSTRAINT channel_notices_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.copyright_claims
    ADD CONSTRAINT copyright_claims_claimant_id_fkey FOREIGN KEY (claimant_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.copyright_claims
    ADD CONSTRAINT copyright_claims_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.copyright_fingerprints
    ADD CONSTRAINT copyright_fingerprints_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.creator_earnings
    ADD CONSTRAINT creator_earnings_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.playlist_items
    ADD CONSTRAINT playlist_items_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.playlists(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.revenue_logs
    ADD CONSTRAINT revenue_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_wallets
    ADD CONSTRAINT user_wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_withdrawal_methods
    ADD CONSTRAINT user_withdrawal_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.video_comments
    ADD CONSTRAINT video_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.video_comments(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.video_comments
    ADD CONSTRAINT video_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.video_likes
    ADD CONSTRAINT video_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.video_saves
    ADD CONSTRAINT video_saves_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.video_views
    ADD CONSTRAINT video_views_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.video_views
    ADD CONSTRAINT video_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ab_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.algorithm_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copyright_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copyright_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sidebar_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_withdrawal_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.playlist_items TO authenticated;
GRANT SELECT ON TABLE public.playlist_items TO anon;
GRANT ALL ON TABLE public.playlist_items TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.user_wallets TO authenticated;
GRANT ALL ON TABLE public.user_wallets TO service_role;
GRANT SELECT,INSERT ON TABLE public.withdrawal_requests TO authenticated;
GRANT ALL ON TABLE public.withdrawal_requests TO service_role;
GRANT SELECT ON TABLE public.ab_tests TO anon;
GRANT SELECT ON TABLE public.ab_tests TO authenticated;
GRANT ALL ON TABLE public.ab_tests TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.playlists TO authenticated;
GRANT SELECT ON TABLE public.playlists TO anon;
GRANT ALL ON TABLE public.playlists TO service_role;
GRANT SELECT ON TABLE public.videos TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.videos TO authenticated;
GRANT ALL ON TABLE public.videos TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.video_comments TO authenticated;
GRANT SELECT ON TABLE public.video_comments TO anon;
GRANT ALL ON TABLE public.video_comments TO service_role;
GRANT SELECT,INSERT ON TABLE public.ab_events TO authenticated;
GRANT SELECT,INSERT ON TABLE public.ab_events TO anon;
GRANT ALL ON TABLE public.ab_events TO service_role;
GRANT SELECT ON TABLE public.ab_experiments TO authenticated;
GRANT ALL ON TABLE public.ab_experiments TO service_role;
GRANT SELECT,INSERT ON TABLE public.activity_log TO authenticated;
GRANT ALL ON TABLE public.activity_log TO service_role;
GRANT SELECT ON TABLE public.ad_settings TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.ad_settings TO authenticated;
GRANT ALL ON TABLE public.ad_settings TO service_role;
GRANT SELECT ON TABLE public.admin_actions TO authenticated;
GRANT ALL ON TABLE public.admin_actions TO service_role;
GRANT SELECT ON TABLE public.algorithm_audit_log TO authenticated;
GRANT ALL ON TABLE public.algorithm_audit_log TO service_role;
GRANT SELECT,INSERT ON TABLE public.analytics_events TO authenticated;
GRANT SELECT,INSERT ON TABLE public.analytics_events TO anon;
GRANT ALL ON TABLE public.analytics_events TO service_role;
GRANT ALL ON SEQUENCE public.analytics_events_id_seq TO service_role;
GRANT SELECT ON TABLE public.app_settings TO anon;
GRANT SELECT ON TABLE public.app_settings TO authenticated;
GRANT ALL ON TABLE public.app_settings TO service_role;
GRANT SELECT,INSERT ON TABLE public.appeals TO authenticated;
GRANT ALL ON TABLE public.appeals TO service_role;
GRANT SELECT ON TABLE public.categories TO anon;
GRANT SELECT ON TABLE public.categories TO authenticated;
GRANT ALL ON TABLE public.categories TO service_role;
GRANT SELECT,UPDATE ON TABLE public.channel_notices TO authenticated;
GRANT ALL ON TABLE public.channel_notices TO service_role;
GRANT SELECT,INSERT,DELETE ON TABLE public.comment_likes TO authenticated;
GRANT ALL ON TABLE public.comment_likes TO service_role;
GRANT SELECT ON TABLE public.copyright_claims TO authenticated;
GRANT ALL ON TABLE public.copyright_claims TO service_role;
GRANT SELECT ON TABLE public.copyright_fingerprints TO authenticated;
GRANT ALL ON TABLE public.copyright_fingerprints TO service_role;
GRANT SELECT ON TABLE public.creator_earnings TO authenticated;
GRANT ALL ON TABLE public.creator_earnings TO service_role;
GRANT SELECT ON TABLE public.dynamic_routes TO anon;
GRANT SELECT ON TABLE public.dynamic_routes TO authenticated;
GRANT ALL ON TABLE public.dynamic_routes TO service_role;
GRANT SELECT ON TABLE public.dynamic_widgets TO anon;
GRANT SELECT ON TABLE public.dynamic_widgets TO authenticated;
GRANT ALL ON TABLE public.dynamic_widgets TO service_role;
GRANT SELECT ON TABLE public.feature_flags TO anon;
GRANT SELECT ON TABLE public.feature_flags TO authenticated;
GRANT ALL ON TABLE public.feature_flags TO service_role;
GRANT SELECT,INSERT,DELETE ON TABLE public.follows TO authenticated;
GRANT SELECT ON TABLE public.follows TO anon;
GRANT ALL ON TABLE public.follows TO service_role;
GRANT SELECT,UPDATE ON TABLE public.moderation_queue TO authenticated;
GRANT ALL ON TABLE public.moderation_queue TO service_role;
GRANT SELECT ON TABLE public.moderation_settings TO authenticated;
GRANT ALL ON TABLE public.moderation_settings TO service_role;
GRANT SELECT,DELETE,UPDATE ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;
GRANT SELECT ON TABLE public.platform_revenue TO authenticated;
GRANT ALL ON TABLE public.platform_revenue TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.profiles TO anon;
GRANT SELECT,INSERT ON TABLE public.revenue_logs TO authenticated;
GRANT ALL ON TABLE public.revenue_logs TO service_role;
GRANT SELECT ON TABLE public.sidebar_menu TO anon;
GRANT SELECT ON TABLE public.sidebar_menu TO authenticated;
GRANT ALL ON TABLE public.sidebar_menu TO service_role;
GRANT SELECT ON TABLE public.streams TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.streams TO authenticated;
GRANT ALL ON TABLE public.streams TO service_role;
GRANT SELECT(id) ON TABLE public.streams TO anon;
GRANT SELECT(id) ON TABLE public.streams TO authenticated;
GRANT SELECT(user_id) ON TABLE public.streams TO anon;
GRANT SELECT(user_id) ON TABLE public.streams TO authenticated;
GRANT SELECT(title) ON TABLE public.streams TO anon;
GRANT SELECT(title) ON TABLE public.streams TO authenticated;
GRANT SELECT(description) ON TABLE public.streams TO anon;
GRANT SELECT(description) ON TABLE public.streams TO authenticated;
GRANT SELECT(status) ON TABLE public.streams TO anon;
GRANT SELECT(status) ON TABLE public.streams TO authenticated;
GRANT SELECT(playback_url) ON TABLE public.streams TO anon;
GRANT SELECT(playback_url) ON TABLE public.streams TO authenticated;
GRANT SELECT(scheduled_at) ON TABLE public.streams TO anon;
GRANT SELECT(scheduled_at) ON TABLE public.streams TO authenticated;
GRANT SELECT(started_at) ON TABLE public.streams TO anon;
GRANT SELECT(started_at) ON TABLE public.streams TO authenticated;
GRANT SELECT(ended_at) ON TABLE public.streams TO anon;
GRANT SELECT(ended_at) ON TABLE public.streams TO authenticated;
GRANT SELECT(viewer_count) ON TABLE public.streams TO anon;
GRANT SELECT(viewer_count) ON TABLE public.streams TO authenticated;
GRANT SELECT(created_at) ON TABLE public.streams TO anon;
GRANT SELECT(created_at) ON TABLE public.streams TO authenticated;
GRANT SELECT(updated_at) ON TABLE public.streams TO anon;
GRANT SELECT(updated_at) ON TABLE public.streams TO authenticated;
GRANT SELECT ON TABLE public.system_config TO anon;
GRANT SELECT ON TABLE public.system_config TO authenticated;
GRANT ALL ON TABLE public.system_config TO service_role;
GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_withdrawal_methods TO authenticated;
GRANT ALL ON TABLE public.user_withdrawal_methods TO service_role;
GRANT SELECT ON TABLE public.video_ads TO anon;
GRANT SELECT ON TABLE public.video_ads TO authenticated;
GRANT ALL ON TABLE public.video_ads TO service_role;
GRANT SELECT,INSERT,DELETE ON TABLE public.video_likes TO authenticated;
GRANT SELECT ON TABLE public.video_likes TO anon;
GRANT ALL ON TABLE public.video_likes TO service_role;
GRANT SELECT,INSERT ON TABLE public.video_reports TO authenticated;
GRANT ALL ON TABLE public.video_reports TO service_role;
GRANT SELECT,INSERT,DELETE ON TABLE public.video_saves TO authenticated;
GRANT ALL ON TABLE public.video_saves TO service_role;
GRANT ALL ON TABLE public.video_views TO service_role;
GRANT SELECT ON TABLE public.wallet_transactions TO authenticated;
GRANT ALL ON TABLE public.wallet_transactions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.watch_history TO authenticated;
GRANT ALL ON TABLE public.watch_history TO service_role;

ALTER TABLE public.video_views ADD COLUMN IF NOT EXISTS watch_seconds integer NOT NULL DEFAULT 0;