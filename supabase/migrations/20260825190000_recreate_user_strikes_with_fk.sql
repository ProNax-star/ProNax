-- Recreate user_strikes table with proper foreign key relationship
DROP TABLE IF EXISTS public.user_strikes CASCADE;

CREATE TABLE public.user_strikes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    reason text NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    expires_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT user_strikes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Re-enable RLS
ALTER TABLE public.user_strikes ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "user_strikes_read" ON public.user_strikes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
