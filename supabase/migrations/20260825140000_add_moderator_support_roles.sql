/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
-- Add moderator and support roles to the app_role enum
-- Moderators can action reports/claims/bans but NOT wallets, payouts, roles or app settings
-- Support role for basic customer service operations

-- First, add the new roles to the app_role enum type
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'support';

-- Drop existing functions that need to be updated with new role checks
DROP FUNCTION IF EXISTS public.admin_ban_user(uuid, text, timestamptz);
DROP FUNCTION IF EXISTS public.admin_unban_user(uuid);
DROP FUNCTION IF EXISTS public.admin_adjust_wallet(uuid, numeric, numeric, text);
DROP FUNCTION IF EXISTS public.admin_mark_withdrawal_processed(uuid, text);
DROP FUNCTION IF EXISTS public.admin_set_role(uuid, app_role, boolean);
DROP FUNCTION IF EXISTS public.admin_set_ip_rule(inet, text, text);

-- Update admin RPCs to include moderator role checks where appropriate
-- Moderators can ban users, resolve reports, and manage content but NOT financial operations

-- Update admin_ban_user to allow moderators
CREATE FUNCTION public.admin_ban_user(p_user uuid, p_reason text, p_until timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins and moderators can ban users
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'admin or moderator only';
  END IF;
  
  IF p_user = auth.uid() THEN
    RAISE EXCEPTION 'cannot ban yourself';
  END IF;

  UPDATE public.profiles
  SET is_banned = true,
      ban_reason = p_reason,
      banned_until = p_until,
      status = 'banned'
  WHERE id = p_user;

  INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
  VALUES (auth.uid(), 'ban_user', 'user', p_user::text, jsonb_build_object('reason', p_reason, 'until', p_until));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Update admin_unban_user to allow moderators
CREATE FUNCTION public.admin_unban_user(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins and moderators can unban users
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'admin or moderator only';
  END IF;

  UPDATE public.profiles
  SET is_banned = false,
      ban_reason = null,
      banned_until = null,
      status = 'active'
  WHERE id = p_user;

  INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
  VALUES (auth.uid(), 'unban_user', 'user', p_user::text, '{}'::jsonb);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Keep admin_adjust_wallet as admin-only (financial operations)
CREATE FUNCTION public.admin_adjust_wallet(p_user_id uuid, p_delta numeric, p_set_balance numeric DEFAULT NULL, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance numeric;
BEGIN
  -- Only admins can adjust wallets (financial operations)
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM public.user_wallets
  WHERE user_id = p_user_id;

  -- If wallet doesn't exist, create it
  IF v_current_balance IS NULL THEN
    INSERT INTO public.user_wallets (user_id, balance, total_earned, total_withdrawn)
    VALUES (p_user_id, COALESCE(p_set_balance, 0), COALESCE(p_set_balance, 0), 0);
    v_current_balance := COALESCE(p_set_balance, 0);
  END IF;

  -- Apply adjustment or override
  IF p_set_balance IS NOT NULL THEN
    UPDATE public.user_wallets
    SET balance = p_set_balance,
        total_earned = GREATEST(total_earned, p_set_balance)
    WHERE user_id = p_user_id;
  ELSE
    UPDATE public.user_wallets
    SET balance = balance + p_delta,
        total_earned = total_earned + GREATEST(p_delta, 0),
        total_withdrawn = total_withdrawn + GREATEST(-p_delta, 0)
    WHERE user_id = p_user_id;
  END IF;

  -- Log the transaction
  INSERT INTO public.wallet_transactions (user_id, kind, delta, details)
  VALUES (p_user_id, 'admin_adjust', COALESCE(p_delta, p_set_balance - v_current_balance), jsonb_build_object('reason', p_reason));

  INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
  VALUES (auth.uid(), 'adjust_wallet', 'user', p_user_id::text, jsonb_build_object('delta', p_delta, 'set_balance', p_set_balance, 'reason', p_reason));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Keep admin_mark_withdrawal_processed as admin-only (financial operations)
CREATE FUNCTION public.admin_mark_withdrawal_processed(p_request_id uuid, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can process withdrawals (financial operations)
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  UPDATE public.withdrawal_requests
  SET status = 'processed',
      processed_at = now(),
      payment_details = COALESCE(payment_details, '{}'::jsonb) || jsonb_build_object('admin_note', p_note)
  WHERE id = p_request_id;

  INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
  VALUES (auth.uid(), 'mark_withdrawal_processed', 'withdrawal', p_request_id::text, jsonb_build_object('note', p_note));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Keep admin_set_role as admin-only (role management)
CREATE FUNCTION public.admin_set_role(p_user uuid, p_role app_role, p_grant boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can manage roles
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF p_grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user, p_role)
      ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = p_user AND role = p_role;
  END IF;

  INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
  VALUES (auth.uid(), CASE WHEN p_grant THEN 'grant_role' ELSE 'revoke_role' END, 'user', p_user::text, jsonb_build_object('role', p_role));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Keep admin_set_ip_rule as admin-only (system settings)
CREATE FUNCTION public.admin_set_ip_rule(p_ip inet, p_action text, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can manage IP rules (system settings)
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  INSERT INTO public.ip_rules (ip_address, action, reason, created_by)
  VALUES (p_ip, p_action, p_reason, auth.uid())
  ON CONFLICT (ip_address) DO UPDATE SET
    action = EXCLUDED.action,
    reason = EXCLUDED.reason,
    updated_at = now();

  INSERT INTO public.admin_actions (admin_id, action, target_type, target_id, payload)
  VALUES (auth.uid(), 'set_ip_rule', 'ip', p_ip::text, jsonb_build_object('action', p_action, 'reason', p_reason));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Grant execute permissions on updated functions
GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_withdrawal_processed(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_ip_rule(inet, text, text) TO authenticated;
