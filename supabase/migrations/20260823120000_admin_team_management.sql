/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. */
-- Admin team management: owner (super admin) can add/remove admins by email.
-- Run this once in the Supabase SQL editor of the ProNax project.

CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.super_admins TO authenticated;
GRANT ALL ON public.super_admins TO service_role;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read super admins" ON public.super_admins;
CREATE POLICY "admins read super admins" ON public.super_admins
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'admin',
  status text NOT NULL DEFAULT 'pending', -- pending | accepted | cancelled
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_invites_pending_email_idx
  ON public.admin_invites (lower(email)) WHERE status = 'pending';

GRANT SELECT ON public.admin_invites TO authenticated;
GRANT ALL ON public.admin_invites TO service_role;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read invites" ON public.admin_invites;
CREATE POLICY "admins read invites" ON public.admin_invites
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed the earliest admin as owner (super admin) if none exists yet.
INSERT INTO public.super_admins (user_id)
SELECT ur.user_id
FROM public.user_roles ur
WHERE ur.role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM public.super_admins)
ORDER BY ur.created_at ASC
LIMIT 1
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN EXISTS (SELECT 1 FROM public.super_admins) THEN
      EXISTS (SELECT 1 FROM public.super_admins s WHERE s.user_id = _user_id)
    ELSE
      _user_id = (SELECT ur.user_id FROM public.user_roles ur
                  WHERE ur.role = 'admin' ORDER BY ur.created_at ASC LIMIT 1)
  END;
$$;

CREATE OR REPLACE FUNCTION public.admin_team_list()
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  avatar_url text,
  is_super boolean,
  granted_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT ur.user_id,
         COALESCE(p.email, u.email)::text,
         COALESCE(p.display_name, p.username, split_part(COALESCE(p.email, u.email), '@', 1))::text,
         p.avatar_url::text,
         public.is_super_admin(ur.user_id),
         ur.created_at
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  LEFT JOIN auth.users u ON u.id = ur.user_id
  WHERE ur.role = 'admin'
  ORDER BY ur.created_at ASC;
END;
$$;

-- Grant admin access by email. Grants immediately if the account exists,
-- otherwise stores a pending invite that is consumed at signup.
CREATE OR REPLACE FUNCTION public.admin_invite_by_email(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_user uuid;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'owner only';
  END IF;
  IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  SELECT u.id INTO v_user FROM auth.users u WHERE lower(u.email) = v_email LIMIT 1;

  IF v_user IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.admin_invites
      SET status = 'accepted', accepted_user_id = v_user, accepted_at = now()
      WHERE lower(email) = v_email AND status = 'pending';
    INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
      VALUES (auth.uid(), 'grant_role', 'user', v_user::text,
              jsonb_build_object('role', 'admin', 'email', v_email));
    INSERT INTO public.notifications (user_id, type, payload)
      VALUES (v_user, 'system', jsonb_build_object('message', 'You have been granted admin access'));
    RETURN jsonb_build_object('ok', true, 'granted', true, 'user_id', v_user);
  END IF;

  INSERT INTO public.admin_invites (email, role, invited_by)
  VALUES (v_email, 'admin', auth.uid())
  ON CONFLICT (lower(email)) WHERE status = 'pending' DO NOTHING;

  INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
    VALUES (auth.uid(), 'invite_admin', 'email', v_email, jsonb_build_object('role', 'admin'));

  RETURN jsonb_build_object('ok', true, 'granted', false, 'pending', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_cancel_invite(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'owner only';
  END IF;
  UPDATE public.admin_invites SET status = 'cancelled' WHERE id = p_id AND status = 'pending';
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_admin(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'owner only';
  END IF;
  IF p_user = auth.uid() THEN
    RAISE EXCEPTION 'cannot remove yourself';
  END IF;
  IF public.is_super_admin(p_user) THEN
    RAISE EXCEPTION 'cannot remove another owner';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = p_user AND role = 'admin';
  UPDATE public.admin_invites SET status = 'cancelled'
    WHERE accepted_user_id = p_user AND status = 'pending';

  INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
    VALUES (auth.uid(), 'revoke_role', 'user', p_user::text, jsonb_build_object('role', 'admin'));
  INSERT INTO public.notifications (user_id, type, payload)
    VALUES (p_user, 'system', jsonb_build_object('message', 'Your admin access has been removed'));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Owner can promote/demote another admin to co-owner (full access).
CREATE OR REPLACE FUNCTION public.admin_set_owner(p_user uuid, p_grant boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'owner only';
  END IF;
  IF p_grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    INSERT INTO public.super_admins (user_id) VALUES (p_user) ON CONFLICT DO NOTHING;
  ELSE
    IF p_user = auth.uid() THEN
      RAISE EXCEPTION 'cannot demote yourself';
    END IF;
    DELETE FROM public.super_admins WHERE user_id = p_user;
  END IF;

  INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
    VALUES (auth.uid(), CASE WHEN p_grant THEN 'grant_owner' ELSE 'revoke_owner' END,
            'user', p_user::text, '{}'::jsonb);
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Consume pending invites automatically when the invited person signs up.
CREATE OR REPLACE FUNCTION public.consume_admin_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_invite public.admin_invites;
BEGIN
  IF NEW.email IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_invite FROM public.admin_invites
   WHERE lower(email) = lower(NEW.email) AND status = 'pending'
   ORDER BY created_at ASC LIMIT 1;

  IF v_invite.id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_invite.role)
      ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.admin_invites
      SET status = 'accepted', accepted_user_id = NEW.id, accepted_at = now()
      WHERE id = v_invite.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_admin_invite ON auth.users;
CREATE TRIGGER on_auth_user_created_admin_invite
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.consume_admin_invite();

GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_team_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_invite_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_owner(uuid, boolean) TO authenticated;
