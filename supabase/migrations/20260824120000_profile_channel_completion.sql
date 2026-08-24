-- ProNax — Profile / Channel completion
-- Run this against your Supabase project (SQL editor or `supabase db push`).
-- Handle system, channel about fields, privacy controls, blocking, channel reports.

-- ---------------------------------------------------------------------------
-- 1. Profile columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS business_email text,
  ADD COLUMN IF NOT EXISTS external_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS handle_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS hide_subscriptions boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_liked_videos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hide_playlists boolean NOT NULL DEFAULT false;

-- Case-insensitive uniqueness for handles
CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_lower_key
  ON public.profiles (lower(handle))
  WHERE handle IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Reserved handles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reserved_handles (
  handle text PRIMARY KEY
);

GRANT SELECT ON public.reserved_handles TO anon, authenticated;
GRANT ALL ON public.reserved_handles TO service_role;
ALTER TABLE public.reserved_handles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reserved handles are readable" ON public.reserved_handles;
CREATE POLICY "Reserved handles are readable"
  ON public.reserved_handles FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.reserved_handles (handle) VALUES
  ('admin'), ('api'), ('studio'), ('watch'), ('shorts'), ('live'), ('wallet'),
  ('auth'), ('settings'), ('explore'), ('trending'), ('p'), ('sound'),
  ('playlist'), ('playlists'), ('channel'), ('profile'), ('pronax'), ('support'),
  ('help'), ('about'), ('login'), ('logout'), ('signup'), ('security'),
  ('privacy'), ('appeal'), ('history'), ('likes'), ('saved'), ('subscriptions'),
  ('upload'), ('root'), ('system'), ('moderator'), ('mod'), ('staff')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Handle history (old handle -> redirect)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.handle_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_handle text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS handle_history_old_handle_lower_key
  ON public.handle_history (lower(old_handle));

GRANT SELECT ON public.handle_history TO anon, authenticated;
GRANT ALL ON public.handle_history TO service_role;
ALTER TABLE public.handle_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Handle history is readable" ON public.handle_history;
CREATE POLICY "Handle history is readable"
  ON public.handle_history FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 4. Blocked users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own blocks" ON public.blocked_users;
CREATE POLICY "Users manage their own blocks"
  ON public.blocked_users FOR ALL TO authenticated
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- ---------------------------------------------------------------------------
-- 5. Channel reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.channel_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT, SELECT ON public.channel_reports TO authenticated;
GRANT ALL ON public.channel_reports TO service_role;
ALTER TABLE public.channel_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can report channels" ON public.channel_reports;
CREATE POLICY "Users can report channels"
  ON public.channel_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id AND auth.uid() <> channel_id);

DROP POLICY IF EXISTS "Users see their own channel reports" ON public.channel_reports;
CREATE POLICY "Users see their own channel reports"
  ON public.channel_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

-- ---------------------------------------------------------------------------
-- 6. Handle helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_handle(_handle text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(btrim(coalesce(_handle, '')));
$$;

CREATE OR REPLACE FUNCTION public.is_handle_valid(_handle text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.normalize_handle(_handle) ~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$'
     AND public.normalize_handle(_handle) !~ '\.\.';
$$;

-- Security definer: availability can be checked without exposing profile rows.
CREATE OR REPLACE FUNCTION public.is_handle_available(_handle text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h text := public.normalize_handle(_handle);
BEGIN
  IF NOT public.is_handle_valid(h) THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.reserved_handles r WHERE r.handle = h) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(p.handle) = h
      AND (auth.uid() IS NULL OR p.id <> auth.uid())
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.handle_history hh
    WHERE lower(hh.old_handle) = h
      AND (auth.uid() IS NULL OR hh.user_id <> auth.uid())
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_handle_available(text) TO anon, authenticated;

-- Deterministic, availability-checked suggestions (no client randomness).
CREATE OR REPLACE FUNCTION public.suggest_handles(_base text, _limit int DEFAULT 5)
RETURNS TABLE (handle text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean text;
  candidate text;
  found int := 0;
  suffixes text[];
  s text;
BEGIN
  clean := regexp_replace(public.normalize_handle(_base), '[^a-z0-9._]', '', 'g');
  clean := btrim(clean, '._');
  IF length(clean) < 3 THEN
    clean := 'creator';
  END IF;
  clean := left(clean, 22);

  suffixes := ARRAY[
    '', '.official', '.tv', '.hq', '_yt', '.live', '.studio', '1', '01', '_1',
    '2', '02', '7', '11', '21', '99', '.co', '.original', '.real', '.on'
  ];

  FOREACH s IN ARRAY suffixes LOOP
    EXIT WHEN found >= _limit;
    candidate := left(clean || s, 30);
    IF public.is_handle_available(candidate) THEN
      handle := candidate;
      found := found + 1;
      RETURN NEXT;
    END IF;
  END LOOP;

  FOR i IN 1..200 LOOP
    EXIT WHEN found >= _limit;
    candidate := left(clean, 26) || i::text;
    IF public.is_handle_available(candidate) THEN
      handle := candidate;
      found := found + 1;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.suggest_handles(text, int) TO anon, authenticated;

-- Atomic handle change: validates, enforces a 14 day cooldown and records the
-- previous handle so old channel URLs keep resolving.
CREATE OR REPLACE FUNCTION public.change_handle(_handle text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  h text := public.normalize_handle(_handle);
  current_handle text;
  last_change timestamptz;
  cooldown interval := interval '14 days';
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT p.handle, p.handle_changed_at INTO current_handle, last_change
  FROM public.profiles p WHERE p.id = uid;

  IF lower(coalesce(current_handle, '')) = h THEN
    RETURN jsonb_build_object('ok', true, 'handle', h, 'unchanged', true);
  END IF;

  IF last_change IS NOT NULL AND last_change > now() - cooldown THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'cooldown',
      'available_at', to_jsonb(last_change + cooldown)
    );
  END IF;

  IF NOT public.is_handle_valid(h) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  IF NOT public.is_handle_available(h) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'taken');
  END IF;

  IF current_handle IS NOT NULL AND btrim(current_handle) <> '' THEN
    INSERT INTO public.handle_history (user_id, old_handle)
    VALUES (uid, lower(current_handle))
    ON CONFLICT DO NOTHING;
  END IF;

  DELETE FROM public.handle_history WHERE user_id = uid AND lower(old_handle) = h;

  UPDATE public.profiles
  SET handle = h, handle_changed_at = now(), updated_at = now()
  WHERE id = uid;

  RETURN jsonb_build_object('ok', true, 'handle', h);
END;
$$;

GRANT EXECUTE ON FUNCTION public.change_handle(text) TO authenticated;

-- Resolve a handle (current or historical) to a channel id.
CREATE OR REPLACE FUNCTION public.resolve_channel_handle(_handle text)
RETURNS TABLE (user_id uuid, canonical_handle text, redirected boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.handle, false
  FROM public.profiles p
  WHERE lower(p.handle) = public.normalize_handle(_handle)
  UNION ALL
  SELECT p.id, p.handle, true
  FROM public.handle_history hh
  JOIN public.profiles p ON p.id = hh.user_id
  WHERE lower(hh.old_handle) = public.normalize_handle(_handle)
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE lower(p2.handle) = public.normalize_handle(_handle)
    )
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_channel_handle(text) TO anon, authenticated;
