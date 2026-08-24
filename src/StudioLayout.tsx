/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createContext, useContext, useState } from 'react';
import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuthSession } from '@/hooks/useAuthSession';
import { SignInGate } from '@/components/auth/SignInGate';
import { useStudioData, type ChannelNotice } from '@/hooks/useStudioData';
import { StudioShell } from '@/components/studio/StudioShell';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Info, AlertCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/loose';
import { formatMoney, DEFAULT_CURRENCY } from '@/lib/money';

type StudioContextValue = ReturnType<typeof useStudioData> & {
  markNoticeRead: (id: string) => Promise<void>;
};

const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used within StudioLayout');
  return ctx;
}

function NoticesDialog({
  open,
  onOpenChange,
  notices,
  onMarkRead,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  notices: ChannelNotice[];
  onMarkRead: (id: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#0f0f0f]">Channel notifications</DialogTitle>
          <DialogDescription>
            Important updates about your channel, copyright, and policy.
          </DialogDescription>
        </DialogHeader>
        {notices.length === 0 ? (
          <div className="py-8 text-center">
            <Info className="w-10 h-10 mx-auto text-[#909090] mb-3" />
            <p className="text-sm text-[#606060]">No notifications at this time.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className={`p-4 rounded-lg border ${
                  notice.is_read
                    ? 'bg-[#f9f9f9] border-[#e5e5e5] opacity-70'
                    : notice.severity === 'critical'
                      ? 'bg-cyan-50 border-cyan-200'
                      : notice.severity === 'warning'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {notice.severity === 'critical' ? (
                      <XCircle className="w-4 h-4 text-cyan-600" />
                    ) : notice.severity === 'warning' ? (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0f0f0f]">{notice.title}</p>
                    <p className="text-xs text-[#606060] mt-1">{notice.message}</p>
                    <div className="flex gap-2 mt-2">
                      {notice.action_required && notice.action_label && (
                        <button
                          onClick={() => {
                            if (notice.action_url) window.open(notice.action_url, '_blank');
                            else if (notice.related_video_id) navigate(`/watch/${notice.related_video_id}`);
                          }}
                          className="text-xs px-3 py-1 rounded-full bg-cyan-500 text-white font-medium"
                        >
                          {notice.action_label}
                        </button>
                      )}
                      {!notice.is_read && (
                        <button
                          onClick={() => onMarkRead(notice.id)}
                          className="text-xs px-3 py-1 rounded-full border border-[#e5e5e5] text-[#606060] hover:bg-[#f2f2f2]"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function StudioLayout() {
  const { session, user, loading: authLoading } = useAuthSession();
  const studioData = useStudioData(user?.id);
  const [noticesOpen, setNoticesOpen] = useState(false);

  const markNoticeRead = async (noticeId: string) => {
    await supabase.rpc('mark_notice_read', { p_notice_id: noticeId });
    studioData.fetchAll();
  };

  if (authLoading) {
    return (
      <div className="studio-theme min-h-screen flex items-center justify-center bg-[#f9f9f9]">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SignInGate
          title="Sign in to Studio"
          description="Manage your channel, check analytics, and grow your audience."
        />
      </div>
    );
  }

  const ctx: StudioContextValue = { ...studioData, markNoticeRead };

  return (
    <StudioContext.Provider value={ctx}>
      <StudioShell
        profile={studioData.profile}
        unreadNotices={studioData.unreadNoticeCount}
        onNoticesClick={() => setNoticesOpen(true)}
        followersCount={studioData.followersCount}
        totalViews={studioData.totalViews}
        estimatedRevenue={formatMoney(studioData.wallet?.total_earned ?? 0, { currency: DEFAULT_CURRENCY })}
        copyrightClaimsCount={
          studioData.copyrightClaims
            ? Object.values(studioData.copyrightClaims).flat().length
            : 0
        }
      >
        <Outlet />
      </StudioShell>
      <NoticesDialog
        open={noticesOpen}
        onOpenChange={setNoticesOpen}
        notices={studioData.notices}
        onMarkRead={markNoticeRead}
      />
    </StudioContext.Provider>
  );
}

export function StudioIndexRedirect() {
  return <Navigate to="/studio" replace />;
}
