/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React from "react";
import { pseudoWave } from './constants';

interface WaveformProps {
  seed: number;
  width: number;
  color: string;
  waveformData?: number[];
}

export const Waveform: React.FC<WaveformProps> = ({
  seed,
  width,
  color,
  waveformData,
}) => {
  const bars = Math.max(4, Math.floor(width / 3));
  
  const data = waveformData || Array.from({ length: bars }, (_, i) => pseudoWave(seed, i));
  
  return (
    <div className="absolute inset-0 flex items-center gap-[1px] px-1 opacity-70 px-2 pointer-events-none">
      {data.map((amplitude, i) => (
        <div
          key={i}
          style={{ 
            height: `${Math.max(5, amplitude * 100)}%`, 
            background: color,
            minHeight: '2px'
          }}
          className="flex-1 rounded-[1px] transition-all duration-75"
        />
      ))}
    </div>
  );
};
