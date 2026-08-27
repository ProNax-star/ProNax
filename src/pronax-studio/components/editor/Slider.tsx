/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React from "react";
import { Diamond } from "lucide-react";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  accent?: string;
  onChange: (v: number) => void;
  onKey?: () => void;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  accent = "#3b82f6",
  onChange,
  onKey,
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-gray-300 font-medium">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-mono text-white tabular-nums bg-[#1e1e24] px-2 py-0.5 rounded border border-[#2e2e38]">
          {Math.round(value * 100) / 100}
          {suffix}
        </span>
        {onKey && (
          <button
            onClick={onKey}
            title="Add keyframe"
            className="p-1 rounded text-gray-500 hover:text-amber-300 hover:bg-[#2a2a35] transition-all"
          >
            <Diamond className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ accentColor: accent }}
      className="w-full h-1.5 bg-[#2a2a35] rounded cursor-pointer"
    />
  </div>
);
