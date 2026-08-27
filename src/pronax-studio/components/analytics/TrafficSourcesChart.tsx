/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface TrafficSourcesChartProps {
  data: { source: string; views: number; percentage: number }[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#6b7280"];

export const TrafficSourcesChart: React.FC<TrafficSourcesChartProps> = ({ data }) => {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#2e2e38" />
          <XAxis
            type="number"
            stroke="#666"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
          />
          <YAxis
            type="category"
            dataKey="source"
            stroke="#666"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1a20",
              border: "1px solid #2e2e38",
              borderRadius: "8px",
              color: "#fff",
            }}
            labelStyle={{ color: "#999" }}
            formatter={(value: number) => value.toLocaleString()}
          />
          <Bar dataKey="views" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrafficSourcesChart;
