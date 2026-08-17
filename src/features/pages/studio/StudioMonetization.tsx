import { Link } from 'react-router-dom';
import { DollarSign, Wallet, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { useStudio } from './StudioLayout';
import { EarningsAnalytics } from '@/components/EarningsAnalytics';
import { useEarningsSeries } from '@/hooks/useEarningsSeries';
import { useAuthSession } from '@/hooks/useAuthSession';

export default function StudioMonetization() {
  const { user } = useAuthSession();
  const { wallet, totalViews, followersCount } = useStudio();
  const { logs: earningsSeries } = useEarningsSeries(user?.id);

  const monetizationEligible = totalViews >= 1000 && followersCount >= 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-[#0f0f0f]">Earn on Pro Nax</h1>
        <p className="text-sm text-[#606060] mt-1">Track your revenue and monetization status</p>
      </div>

      {/* Status banner */}
      <div className={`studio-card p-4 flex items-start gap-3 ${monetizationEligible ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
        {monetizationEligible ? (
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        )}
        <div>
          <p className="text-sm font-medium text-[#0f0f0f]">
            {monetizationEligible ? 'You\'re eligible for monetization' : 'Monetization requirements'}
          </p>
          <p className="text-xs text-[#606060] mt-1">
            {monetizationEligible
              ? 'Your channel meets the requirements. Keep creating great content!'
              : `Need 1,000 views (${totalViews.toLocaleString()}/1,000) and 100 subscribers (${followersCount}/100).`}
          </p>
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="studio-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-[#606060]" />
            <span className="text-xs text-[#606060]">Estimated revenue</span>
          </div>
          <p className="text-2xl font-medium text-[#0f0f0f]">${wallet.balance.toFixed(2)}</p>
        </div>
        <div className="studio-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#606060]" />
            <span className="text-xs text-[#606060]">Lifetime earnings</span>
          </div>
          <p className="text-2xl font-medium text-[#0f0f0f]">${wallet.total_earned.toFixed(2)}</p>
        </div>
        <div className="studio-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-[#606060]" />
            <span className="text-xs text-[#606060]">Withdrawn</span>
          </div>
          <p className="text-2xl font-medium text-[#0f0f0f]">${wallet.total_withdrawn.toFixed(2)}</p>
          <Link to="/wallet" className="text-xs text-[#065fd4] mt-2 inline-block hover:underline">
            Go to wallet →
          </Link>
        </div>
      </div>

      <div className="studio-card p-4 [&_.glass]:bg-white [&_.glass]:border-[#e5e5e5]">
        <EarningsAnalytics logs={earningsSeries} />
      </div>
    </div>
  );
}
