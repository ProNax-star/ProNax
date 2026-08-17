-- Fix admin_bootstrap_status function to ensure has_role dependency is properly handled
-- This migration recreates the admin_bootstrap_status function after has_role is properly defined

CREATE OR REPLACE FUNCTION public.admin_bootstrap_status()
 RETURNS TABLE(is_admin boolean, can_claim_initial_admin boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_count int;
  v_user_id uuid := auth.uid();
BEGIN
  SELECT count(*) INTO v_admin_count
  FROM public.user_roles
  WHERE role = 'admin';

  RETURN QUERY SELECT
    public.has_role(v_user_id, 'admin'::app_role) as is_admin,
    (v_admin_count = 0 AND v_user_id IS NOT NULL) as can_claim_initial_admin;
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_bootstrap_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bootstrap_status() TO anon;