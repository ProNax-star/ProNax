/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */

export interface VideoBlurOverlay {
  id: string;
  type: "face" | "logo" | "plate" | "custom";
  shape: "rect" | "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
  startTime: number;
  endTime: number;
}

export interface VideoEndScreenElement {
  id: string;
  type: "subscribe" | "video" | "playlist" | "link";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  startTime: number;
  endTime: number;
}

export interface Video {
  id: string;
  title: string;
  url?: string | undefined;
  videoUrl?: string | undefined;
  thumbnail?: string | undefined;
  duration?: string | undefined;
  restrictions?: string[] | string | undefined;
  trimmedStartSec?: number | undefined;
  trimmedEndSec?: number | undefined;
  blurOverlays?: VideoBlurOverlay[] | undefined;
  endScreenElements?: VideoEndScreenElement[] | undefined;
}

export type TrackKind = "video" | "audio" | "text" | "adjustment";
export type ToolMode = "select" | "razor" | "slip";
export type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "soft-light";
export type TransitionKind =
  | "none"
  | "fade"
  | "cross-dissolve"
  | "slide-left"
  | "slide-right"
  | "zoom-in"
  | "zoom-out"
  | "glitch"
  | "wipe";

export interface MediaAsset {
  id: string;
  name: string;
  kind: "video" | "audio" | "image";
  url: string;
  thumb?: string | undefined;
  duration: number;
  size: number;
  metadata?: {
    width?: number;
    height?: number;
    fps?: number;
    codec?: string;
    sampleRate?: number;
    channels?: number;
  };
  waveform?: number[];
}

export interface Filters {
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
  blur: number;
  sepia: number;
  invert: number;
  temperature: number;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface Keyframe {
  id: string;
  time: number;
  prop: "x" | "y" | "scale" | "opacity" | "rotation" | "blur";
  value: number;
}

export interface TextStyle {
  content: string;
  preset: "lower-third" | "glitch" | "kinetic" | "neon" | "plain";
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  color: string;
  stroke: number;
  strokeColor: string;
  shadow: number;
  boxed: boolean;
  align: "left" | "center" | "right";
}

export interface Clip {
  id: string;
  trackId: string;
  name: string;
  assetId?: string | undefined;
  start: number;
  duration: number;
  srcIn: number;
  srcDuration: number;
  transitionIn: TransitionKind;
  filters: Filters;
  transform: Transform;
  blend: BlendMode;
  chroma: { enabled: boolean; similarity: number; color: string };
  keyframes: Keyframe[];
  volume: number;
  fadeIn: number;
  fadeOut: number;
  text?: TextStyle | undefined;
  color: string;
}

export interface Track {
  id: string;
  kind: TrackKind;
  name: string;
  muted: boolean;
  solo: boolean;
  locked: boolean;
  hidden: boolean;
  volume: number;
  pan: number;
}

export interface EditorDoc {
  tracks: Track[];
  clips: Clip[];
  blurOverlays: VideoBlurOverlay[];
  endScreenElements: VideoEndScreenElement[];
}
