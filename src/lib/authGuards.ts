/**
 * Client-side gates for actions that require a verified account. The database
 * still enforces ownership through RLS — these guards exist so the user gets a
 * clear message instead of an opaque error.
 */
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/loose";

export type VerifiedUser = { id: string; email: string | null };

/** Resolve the signed-in, email-verified user or show a toast and return null. */
export async function requireVerifiedUser(action = "continue"): Promise<VerifiedUser | null> {
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user) {
    toast.error(`Sign in to ${action}`);
    return null;
  }
  if (!user.email_confirmed_at) {
    toast.error(`Verify your email address to ${action}`, {
      description: "Open the confirmation link we sent you, or resend it from Security & privacy.",
    });
    return null;
  }
  return { id: user.id, email: user.email ?? null };
}

/** True when the current user has a confirmed email address. */
export async function isEmailVerified(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  return Boolean(data.user?.email_confirmed_at);
}

/** Ensure the user has a profile record in the database, create if missing. */
export async function ensureUserProfile(userId: string): Promise<boolean> {
  try {
    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (profile && !profileError) {
      return true; // Profile already exists
    }

    // Profile doesn't exist, create it
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Cannot create profile: no authenticated user');
      return false;
    }

    const { error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || null,
        bio: null
      });

    if (createError) {
      console.error('Failed to create user profile:', createError);
      return false;
    }

    console.log('User profile created successfully for:', userId);
    return true;
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    return false;
  }
}
