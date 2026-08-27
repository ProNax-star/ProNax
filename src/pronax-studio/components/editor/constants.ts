/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */

import { TrackKind, Filters, Transform } from './types';

export const TRACK_COLORS: Record<TrackKind, string> = {
  video: "#3b82f6",
  audio: "#10b981",
  text: "#eab308",
  adjustment: "#a855f7",
};

export const DEFAULT_FILTERS: Filters = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
  blur: 0,
  sepia: 0,
  invert: 0,
  temperature: 0,
};

export const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, scale: 100, rotation: 0, opacity: 100 };

export const TEXT_PRESETS: { key: any; label: string; hint: string }[] = [
  { key: "lower-third", label: "Lower Third", hint: "Broadcast name bar" },
  { key: "glitch", label: "Glitch Text", hint: "RGB split shake" },
  { key: "kinetic", label: "Kinetic Typography", hint: "Word-by-word pop" },
  { key: "neon", label: "Neon Text", hint: "Glowing outline" },
  { key: "plain", label: "Plain Title", hint: "Clean centered" },
];

export const TRANSITIONS: { key: any; label: string }[] = [
  { key: "fade", label: "Fade" },
  { key: "cross-dissolve", label: "Cross Dissolve" },
  { key: "slide-left", label: "Slide Left" },
  { key: "slide-right", label: "Slide Right" },
  { key: "zoom-in", label: "Zoom In" },
  { key: "zoom-out", label: "Zoom Out" },
  { key: "glitch", label: "Glitch" },
  { key: "wipe", label: "Wipe" },
];

export const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const formatTime = (sec: number) => {
  if (isNaN(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export const formatTC = (sec: number, fps = 30) => {
  const safe = Math.max(0, sec || 0);
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  const f = Math.floor((safe % 1) * fps);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${f
    .toString()
    .padStart(2, "0")}`;
};

export const parseDurationSec = (dur?: string): number => {
  if (!dur) return 300;
  const parts = dur.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return 300;
  if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  return parts[0] ?? 300;
};

export const filterCss = (f: Filters) => {
  const warm = f.temperature > 0 ? f.temperature / 100 : 0;
  return [
    `brightness(${f.brightness}%)`,
    `contrast(${f.contrast}%)`,
    `saturate(${f.saturate + warm * 15}%)`,
    `hue-rotate(${f.hue + f.temperature * 0.15}deg)`,
    `blur(${f.blur}px)`,
    `sepia(${Math.max(0, f.sepia + (f.temperature > 0 ? f.temperature * 0.3 : 0))}%)`,
    `invert(${f.invert}%)`,
  ].join(" ");
};

export const pseudoWave = (seed: number, i: number) =>
  0.35 +
  0.32 * Math.abs(Math.sin(i * 0.35 + seed)) +
  0.28 * Math.abs(Math.sin(i * 0.11 + seed * 1.7));
