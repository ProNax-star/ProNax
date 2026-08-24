/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Video,
  PlaySquare,
  Users,
  HeartHandshake,
  ShoppingBag,
  CreditCard,
  X,
  Store,
} from "lucide-react";
import { ChannelStats } from "../types";
import { supabase } from "@/integrations/supabase/loose";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useEarningsSeries } from "@/hooks/useEarningsSeries";

interface EarnViewProps {
  channelStats: ChannelStats;
}

export const EarnView: React.FC<EarnViewProps> = ({ channelStats }) => {
  const { user } = useAuthSession();
  const { logs: earningsSeries } = useEarningsSeries(user?.id);
  const [walletData, setWalletData] = useState({ balance: 0, total_earned: 0, total_withdrawn: 0 });
  const [loading, setLoading] = useState(true);
  const [estimatedRevenue28Days, setEstimatedRevenue28Days] = useState(0);
  const [revenueBySource, setRevenueBySource] = useState({
    watchPageAds: 0,
    shortsAds: 0,
    memberships: 0,
    membershipCount: 0,
    superThanks: 0,
  });
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'shopify' | 'spring' | null>(null);
  const [storeUrl, setStoreUrl] = useState('');
  const [modalTilt, setModalTilt] = useState({ x: 0, y: 0 });

  // Fetch wallet data
  useEffect(() => {
    const fetchWalletData = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('user_wallets')
          .select('balance, total_earned, total_withdrawn')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) {
          console.error('Error fetching wallet data:', error);
        } else {
          setWalletData(data || { balance: 0, total_earned: 0, total_withdrawn: 0 });
        }
      } catch (err) {
        console.error('Error fetching wallet data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
  }, [user?.id]);

  // Calculate 28-day estimated revenue from earnings series
  useEffect(() => {
    if (!earningsSeries || earningsSeries.length === 0) {
      setEstimatedRevenue28Days(0);
      setRevenueBySource({
        watchPageAds: 0,
        shortsAds: 0,
        memberships: 0,
        membershipCount: 0,
        superThanks: 0,
      });
      return;
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEarnings = earningsSeries.filter(
      (log) => new Date(log.created_at) >= thirtyDaysAgo
    );

    // Calculate total revenue for 28 days
    const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const recent28Days = earningsSeries.filter(
      (log) => new Date(log.created_at) >= twentyEightDaysAgo
    );
    const totalRevenue = recent28Days.reduce(
      (sum, log) => sum + (Number(log.amount_earned) || 0),
      0
    );
    setEstimatedRevenue28Days(totalRevenue);

    // Calculate revenue by source
    const watchPageRevenue = recentEarnings
      .filter((log) => log.ad_network === 'watch_page' || log.ad_network === 'long_form')
      .reduce((sum, log) => sum + (Number(log.amount_earned) || 0), 0);

    const shortsRevenue = recentEarnings
      .filter((log) => log.ad_network === 'shorts' || log.ad_network === 'shorts_feed')
      .reduce((sum, log) => sum + (Number(log.amount_earned) || 0), 0);

    const membershipRevenue = recentEarnings
      .filter((log) => log.ad_network === 'membership' || log.ad_network === 'memberships')
      .reduce((sum, log) => sum + (Number(log.amount_earned) || 0), 0);

    const superThanksRevenue = recentEarnings
      .filter((log) => log.ad_network === 'super_thanks' || log.ad_network === 'super_chat')
      .reduce((sum, log) => sum + (Number(log.amount_earned) || 0), 0);

    // Estimate membership count based on revenue (assuming avg $3.38 per member)
    const estimatedMembershipCount = membershipRevenue > 0 ? Math.round(membershipRevenue / 3.38) : 0;

    setRevenueBySource({
      watchPageAds: watchPageRevenue,
      shortsAds: shortsRevenue,
      memberships: membershipRevenue,
      membershipCount: estimatedMembershipCount,
      superThanks: superThanksRevenue,
    });
  }, [earningsSeries]);
  return (
    <div className="p-4 md:p-6 space-y-6 text-gray-100 max-w-7xl mx-auto">
      {/* Monetization Status Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-[#1a231d] to-[#1f1f1f] p-6 rounded-2xl border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-white">
                You are a Pronax Partner
              </h1>
              <span className="bg-emerald-500 text-black text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                Active Partner
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-1">
              Congratulations! Your channel is actively earning money from ad views, memberships, and Super Thanks.
            </p>
          </div>
        </div>

        <div className="bg-[#141d17] p-4 rounded-xl border border-emerald-500/20 text-right w-full md:w-auto">
          <p className="text-xs text-gray-400">Estimated 28-day earnings</p>
          <p className="text-2xl font-black text-emerald-400 mt-0.5">
            ${estimatedRevenue28Days.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Payout Tracker */}
      <div className="bg-[#1f1f1f] p-5 rounded-2xl border border-[#2d2d2d] shadow-md space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-emerald-400" />
          Google AdSense Payout Status
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-[#262626] rounded-xl border border-[#333]">
            <p className="text-gray-400">Current Balance</p>
            <p className="text-xl font-bold text-white mt-1">
              ${walletData.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              {walletData.balance >= 100 ? 'Threshold met ($100.00 min)' : 'Below $100.00 threshold'}
            </span>
          </div>

          <div className="p-4 bg-[#262626] rounded-xl border border-[#333]">
            <p className="text-gray-400">Total Earned</p>
            <p className="text-xl font-bold text-white mt-1">
              ${walletData.total_earned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Lifetime earnings
            </span>
          </div>

          <div className="p-4 bg-[#262626] rounded-xl border border-[#333]">
            <p className="text-gray-400">Total Withdrawn</p>
            <p className="text-xl font-bold text-white mt-1">
              ${walletData.total_withdrawn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Total payouts received
            </span>
          </div>
        </div>
      </div>

      {/* Ways to Earn Grid */}
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
          Active Ways to Earn
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Watch Page Ads */}
          <div className="p-5 bg-[#1a1a1a] rounded-2xl border border-[#2d2d2d] space-y-3">
            <div className="flex items-center justify-between">
              <Video className="h-6 w-6 text-red-500" />
              <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                Active
              </span>
            </div>
            <h3 className="font-bold text-sm text-white">Watch Page Ads</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Earn from ads shown on long-form videos and Premium subscribers watching your content.
            </p>
            <p className="text-xs font-bold text-emerald-400">
              Est. Monthly: ${revenueBySource.watchPageAds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Shorts Feed Ads */}
          <div className="p-5 bg-[#1a1a1a] rounded-2xl border border-[#2d2d2d] space-y-3">
            <div className="flex items-center justify-between">
              <PlaySquare className="h-6 w-6 text-rose-500" />
              <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                Active
              </span>
            </div>
            <h3 className="font-bold text-sm text-white">Shorts Feed Ads</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Earn from ads viewed between videos in the Pronax Shorts feed.
            </p>
            <p className="text-xs font-bold text-emerald-400">
              Est. Monthly: ${revenueBySource.shortsAds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Memberships */}
          <div className="p-5 bg-[#1a1a1a] rounded-2xl border border-[#2d2d2d] space-y-3">
            <div className="flex items-center justify-between">
              <Users className="h-6 w-6 text-indigo-400" />
              <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                Active
              </span>
            </div>
            <h3 className="font-bold text-sm text-white">Channel Memberships</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Create fan tiers offering custom badges, exclusive emojis, and member-only videos.
            </p>
            <p className="text-xs font-bold text-emerald-400">
              Active Members: {revenueBySource.membershipCount} (${revenueBySource.memberships.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo)
            </p>
          </div>

          {/* Supers & Thanks */}
          <div className="p-5 bg-[#1a1a1a] rounded-2xl border border-[#2d2d2d] space-y-3">
            <div className="flex items-center justify-between">
              <HeartHandshake className="h-6 w-6 text-pink-400" />
              <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                Active
              </span>
            </div>
            <h3 className="font-bold text-sm text-white">Supers & Super Thanks</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Engage fans who buy highlighted messages in live chats and thank-you tips on videos.
            </p>
            <p className="text-xs font-bold text-emerald-400">
              Est. Monthly: ${revenueBySource.superThanks.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Shopping */}
          <div className="p-5 bg-[#1a1a1a] rounded-2xl border border-[#2d2d2d] space-y-3">
            <div className="flex items-center justify-between">
              <ShoppingBag className="h-6 w-6 text-amber-400" />
              <span className="bg-blue-500/10 text-blue-400 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                Setup Available
              </span>
            </div>
            <h3 className="font-bold text-sm text-white">Pronax Shopping</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Connect your official store (Shopify, Spring) to display merchandise on your videos.
            </p>
            <button 
              onClick={() => setIsStoreModalOpen(true)}
              className="text-xs font-bold text-amber-400 hover:underline cursor-pointer"
            >
              Connect store →
            </button>
          </div>
        </div>
      </div>

      {/* 3D Store Connection Modal */}
      {isStoreModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            perspective: '1000px',
          }}
          onClick={() => setIsStoreModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg"
            style={{
              transform: `perspective(1000px) rotateX(${modalTilt.x}deg) rotateY(${modalTilt.y}deg) scale(${isStoreModalOpen ? 1 : 0.8})`,
              transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
              opacity: isStoreModalOpen ? 1 : 0,
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;
              const rotateX = (e.clientY - centerY) / 20;
              const rotateY = (centerX - e.clientX) / 20;
              setModalTilt({ x: Math.max(-10, Math.min(10, rotateX)), y: Math.max(-10, Math.min(10, rotateY)) });
            }}
            onMouseLeave={() => setModalTilt({ x: 0, y: 0 })}
          >
            {/* Glassmorphism Modal */}
            <div
              className="bg-gradient-to-br from-[#1a1a1a] via-[#262626] to-[#1a1a1a] rounded-3xl p-8 border border-[#3d3d3d] shadow-2xl"
              style={{
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 100px rgba(59, 130, 246, 0.1)',
                background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(38, 38, 38, 0.95) 50%, rgba(26, 26, 26, 0.95) 100%)',
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsStoreModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-[#333] hover:bg-[#444] transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>

              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 flex items-center justify-center">
                    <Store className="h-6 w-6 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Connect Your Store</h2>
                </div>
                <p className="text-sm text-gray-400">
                  Choose a platform to connect your merchandise store and display products on your videos.
                </p>
              </div>

              {/* Platform Selection Cards */}
              {!selectedPlatform ? (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Shopify Card */}
                  <div
                    onClick={() => setSelectedPlatform('shopify')}
                    className="relative p-6 bg-[#1f1f1f] rounded-2xl border-2 border-[#333] hover:border-green-500 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    style={{
                      transform: 'translateZ(20px)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div className="absolute top-3 right-3">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
                      <Store className="h-6 w-6 text-green-400" />
                    </div>
                    <h3 className="font-bold text-white mb-1">Shopify</h3>
                    <p className="text-xs text-gray-400">Full e-commerce platform</p>
                  </div>

                  {/* Spring Card */}
                  <div
                    onClick={() => setSelectedPlatform('spring')}
                    className="relative p-6 bg-[#1f1f1f] rounded-2xl border-2 border-[#333] hover:border-purple-500 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    style={{
                      transform: 'translateZ(20px)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div className="absolute top-3 right-3">
                      <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3">
                      <ShoppingBag className="h-6 w-6 text-purple-400" />
                    </div>
                    <h3 className="font-bold text-white mb-1">Spring</h3>
                    <p className="text-xs text-gray-400">Print-on-demand platform</p>
                  </div>
                </div>
              ) : (
                /* Connection Form */
                <div className="space-y-4">
                  <div className="p-4 bg-[#1f1f1f] rounded-xl border border-[#333]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
                        {selectedPlatform === 'shopify' ? (
                          <Store className="h-5 w-5 text-green-400" />
                        ) : (
                          <ShoppingBag className="h-5 w-5 text-purple-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-white capitalize">{selectedPlatform}</h3>
                        <p className="text-xs text-gray-400">Selected platform</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Store URL
                    </label>
                    <input
                      type="url"
                      value={storeUrl}
                      onChange={(e) => setStoreUrl(e.target.value)}
                      placeholder={`https://your-store.${selectedPlatform === 'shopify' ? 'myshopify.com' : 'spring.com'}`}
                      className="w-full px-4 py-3 bg-[#1f1f1f] border border-[#333] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                    />
                  </div>

                  <button
                    onClick={() => {
                      console.log('Connecting store:', { platform: selectedPlatform, url: storeUrl });
                      setIsStoreModalOpen(false);
                      setSelectedPlatform(null);
                      setStoreUrl('');
                    }}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    Connect Store
                  </button>

                  <button
                    onClick={() => setSelectedPlatform(null)}
                    className="w-full py-3 bg-[#333] text-gray-300 font-medium rounded-xl hover:bg-[#444] transition-all"
                  >
                    Back to Platform Selection
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
