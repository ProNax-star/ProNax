/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React from "react";
import { Clip, Track, TrackKind } from "./types";
import { TRACK_COLORS, formatTime, uid } from "./constants";
import { Waveform } from "./Waveform";

interface TimelineProps {
  tracks: Track[];
  clips: Clip[];
  duration: number;
  pxPerSec: number;
  playhead: number;
  selectedClipId: string | null;
  onClipSelect: (id: string) => void;
  onClipMove?: (id: string, newStart: number, newTrackId: string) => void;
  onClipTrim?: (id: string, edge: "start" | "end", newTime: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  tracks,
  clips,
  duration,
  pxPerSec,
  playhead,
  selectedClipId,
  onClipSelect,
  onClipMove,
  onClipTrim,
}) => {
  const width = duration * pxPerSec;

  return (
    <div className="relative bg-[#1a1a20] border-t border-[#2e2e38] overflow-x-auto">
      {/* Time ruler */}
      <div className="sticky top-0 z-10 bg-[#1e1e24] border-b border-[#2e2e38] h-6 flex items-end">
        {Array.from({ length: Math.ceil(duration) }, (_, i) => (
          <div
            key={i}
            className="absolute bottom-0 border-l border-[#3e3e48] text-[9px] text-gray-500 pl-1"
            style={{ left: i * pxPerSec }}
          >
            {formatTime(i)}
          </div>
        ))}
      </div>

      {/* Tracks */}
      <div className="relative" style={{ width, minHeight: tracks.length * 40 }}>
        {tracks.map((track) => (
          <div
            key={track.id}
            className="absolute border-b border-[#2e2e38] flex items-center"
            style={{
              top: tracks.indexOf(track) * 40,
              width,
              height: 40,
              background: track.kind === "video" ? "#1a1a20" : track.kind === "audio" ? "#1a1a20" : "#1a1a20",
            }}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-24 bg-[#1e1e24] border-r border-[#2e2e38] flex items-center px-2 text-[10px] font-medium text-gray-400"
              style={{ background: TRACK_COLORS[track.kind] + "20" }}
            >
              {track.name}
            </div>

            {/* Clips */}
            {clips
              .filter((c) => c.trackId === track.id)
              .map((clip) => (
                <div
                  key={clip.id}
                  onClick={() => onClipSelect(clip.id)}
                  className={`absolute top-1 bottom-1 rounded cursor-pointer border-2 transition-all ${
                    selectedClipId === clip.id ? "border-red-500 z-10" : "border-transparent hover:border-gray-500"
                  }`}
                  style={{
                    left: clip.start * pxPerSec + 96,
                    width: clip.duration * pxPerSec,
                    background: clip.color || TRACK_COLORS[track.kind],
                  }}
                >
                  <div className="px-2 py-1 text-[10px] font-medium text-white truncate">
                    {clip.name}
                  </div>
                  
                  {/* Waveform for audio tracks */}
                  {track.kind === "audio" && (
                    <Waveform 
                      seed={clip.id.length} 
                      width={clip.duration * pxPerSec} 
                      color={clip.color || TRACK_COLORS.audio}
                    />
                  )}
                </div>
              ))}
          </div>
        ))}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
          style={{ left: playhead * pxPerSec + 96 }}
        >
          <div className="absolute -top-1 -left-1.5 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-500" />
        </div>
      </div>
    </div>
  );
};
