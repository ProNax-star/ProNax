/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { supabase } from '@/integrations/supabase/loose';

export interface AdminContext {
  isAdmin: boolean;
  isModerator: boolean;
  isSupport: boolean;
  userId: string | null;
}

/**
 * Get admin context by checking user roles via RPC calls
 * This is a client-side function that still properly validates roles server-side via RPCs
 */
export const getAdminContext = async (): Promise<AdminContext> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        isAdmin: false,
        isModerator: false,
        isSupport: false,
        userId: null,
      };
    }

    // Check each role via authoritative server-side RPC
    const [adminCheck, moderatorCheck, supportCheck] = await Promise.all([
      supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
      supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' }),
      supabase.rpc('has_role', { _user_id: user.id, _role: 'support' }),
    ]);

    return {
      isAdmin: adminCheck.data === true,
      isModerator: moderatorCheck.data === true,
      isSupport: supportCheck.data === true,
      userId: user.id,
    };
  } catch (error) {
    console.error('Error getting admin context:', error);
    return {
      isAdmin: false,
      isModerator: false,
      isSupport: false,
      userId: null,
    };
  }
};
