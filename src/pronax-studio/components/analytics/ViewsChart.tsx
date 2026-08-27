/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ViewsChartProps {
  data: { date: string; views: number; watchTime: number; subscribers: number; revenue: number }[];
  selectedMetric: "views" | "watchTime" | "subscribers" | "revenue";
  metricLabel: string;
  metricColor: string;
}

export const ViewsChart: React.FC<ViewsChartProps> = ({
  data,
  selectedMetric,
  metricLabel,
  metricColor,
}) => {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`color-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={metricColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={metricColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2e2e38" />
          <XAxis
            dataKey="date"
            stroke="#666"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#666"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              if (selectedMetric === "revenue") return `$${value}`;
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
              return value;
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a20",
              border: "1px solid #2e2e38",
              borderRadius: "8px",
              color: "#fff",
            }}
            labelStyle={{ color: "#999" }}
            formatter={(value: number) => {
              if (selectedMetric === "revenue") return `$${value.toFixed(2)}`;
              return value.toLocaleString();
            }}
          />
          <Area
            type="monotone"
            dataKey={selectedMetric}
            stroke={metricColor}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#color-${selectedMetric})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ViewsChart;
