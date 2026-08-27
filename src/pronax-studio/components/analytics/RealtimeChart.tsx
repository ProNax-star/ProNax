/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React from "react";
import { Activity } from "lucide-react";

interface RealtimeChartProps {
  minuteData: { min: string; views: number }[];
  last60Minutes: number;
  last48Hours: number;
  loading: boolean;
  error: string | null;
}

export const RealtimeChart: React.FC<RealtimeChartProps> = ({
  minuteData,
  last60Minutes,
  last48Hours,
  loading,
  error,
}) => {
  const maxViews = Math.max(...minuteData.map(d => d.views), 1);

  return (
    <div className="space-y-4">
      {/* Realtime stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1e1e24] rounded-lg p-4 border border-[#2e2e38]">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-blue-400" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Last 60 min</span>
          </div>
          <p className="text-2xl font-bold text-white">{last60Minutes.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 mt-1">views</p>
        </div>
        <div className="bg-[#1e1e24] rounded-lg p-4 border border-[#2e2e38]">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-green-400" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Last 48 hours</span>
          </div>
          <p className="text-2xl font-bold text-white">{last48Hours.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 mt-1">views</p>
        </div>
      </div>

      {/* Minute-by-minute chart */}
      <div className="bg-[#1e1e24] rounded-lg p-4 border border-[#2e2e38]">
        <h3 className="text-xs font-semibold text-white mb-4">Views per minute (last 60 min)</h3>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-gray-500 text-xs">
            Loading...
          </div>
        ) : error ? (
          <div className="h-32 flex items-center justify-center text-red-400 text-xs">
            {error}
          </div>
        ) : (
          <div className="h-32 flex items-end gap-0.5">
            {minuteData.map((d, i) => (
              <div
                key={i}
                className="flex-1 bg-blue-500/60 hover:bg-blue-500 transition rounded-t"
                style={{
                  height: `${(d.views / maxViews) * 100}%`,
                  minHeight: '2px'
                }}
                title={`${d.min}: ${d.views} views`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RealtimeChart;
