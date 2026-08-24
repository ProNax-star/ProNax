/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Client-side video preparation utilities used by /upload:
 *  - captureThumbnail: grab a single frame at an offset as JPEG
 *  - generateSpriteSheet: 10-frame storyboard for ProNax hover scrubbing
 *  - compressVideo: opt-in re-encode via MediaRecorder to trim bitrate/dims
 *
 * These run in the browser (Web/Canvas/MediaRecorder). True HLS/multi-bitrate
 * ABR requires server-side ffmpeg, which the app's Worker runtime cannot host;
 * the compressed variant produced here is uploaded alongside the original and
 * the player picks it on slow connections.
 */

export interface SpriteSheet {
  blob: Blob;
  frames: number;
  cols: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
}

async function loadVideoElement(file: File): Promise<{ el: HTMLVideoElement; revoke: () => void }> {
  const url = URL.createObjectURL(file);
  const el = document.createElement('video');
  el.preload = 'auto';
  el.muted = true;
  el.playsInline = true;
  el.crossOrigin = 'anonymous';
  el.src = url;
  await new Promise<void>((resolve, reject) => {
    el.onloadedmetadata = () => resolve();
    el.onerror = () => reject(new Error('Failed to decode video for preview generation'));
  });
  return { el, revoke: () => { try { URL.revokeObjectURL(url); } catch { /* noop */ } } };
}

function seekTo(el: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => { el.removeEventListener('seeked', onSeeked); resolve(); };
    el.addEventListener('seeked', onSeeked);
    // Clamp to a value slightly inside the duration to avoid seek-past-end hangs.
    const dur = isFinite(el.duration) ? el.duration : 0;
    el.currentTime = Math.min(Math.max(0, t), Math.max(0, dur - 0.05));
  });
}

/** Capture one frame at `atSeconds` as a JPEG Blob. */
export async function captureThumbnail(
  file: File,
  atSeconds = 1,
  maxWidth = 1280,
  quality = 0.86,
): Promise<Blob> {
  const { el, revoke } = await loadVideoElement(file);
  try {
    const dur = isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    await seekTo(el, dur > 0 ? Math.min(atSeconds, dur * 0.25) : 0);
    const scale = Math.min(1, maxWidth / (el.videoWidth || maxWidth));
    const w = Math.round((el.videoWidth || 640) * scale);
    const h = Math.round((el.videoHeight || 360) * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(el, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('Thumbnail encoding failed');
    return blob;
  } finally { revoke(); }
}

/**
 * Produce a storyboard sprite (frames laid out in a grid) for hover scrubbing.
 * Default is 10 frames evenly sampled across the video, packed 5x2 at 240px wide.
 */
export async function generateSpriteSheet(
  file: File,
  frameCount = 10,
  frameWidth = 240,
  quality = 0.82,
): Promise<SpriteSheet> {
  const { el, revoke } = await loadVideoElement(file);
  try {
    const dur = isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    if (dur <= 0) throw new Error('Video has no duration');
    const aspect = (el.videoWidth || 16) / (el.videoHeight || 9);
    const frameHeight = Math.round(frameWidth / (aspect || 16 / 9));
    const cols = Math.min(frameCount, 5);
    const rows = Math.ceil(frameCount / cols);
    const canvas = document.createElement('canvas');
    canvas.width = cols * frameWidth;
    canvas.height = rows * frameHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    // Fill black so a sparse last row looks intentional.
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Sample evenly, skipping the very first/last 5% (usually black/credits).
    const start = dur * 0.05;
    const end = dur * 0.95;
    for (let i = 0; i < frameCount; i++) {
      const t = start + ((end - start) * i) / Math.max(1, frameCount - 1);
      await seekTo(el, t);
      const col = i % cols;
      const row = Math.floor(i / cols);
      ctx.drawImage(el, col * frameWidth, row * frameHeight, frameWidth, frameHeight);
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('Sprite encoding failed');
    return { blob, frames: frameCount, cols, rows, frameWidth, frameHeight };
  } finally { revoke(); }
}

export interface CompressResult {
  file: File;
  width: number;
  height: number;
  bitrate: number;
  mimeType: string;
}

/**
 * Re-encode the source through canvas + MediaRecorder at a lower resolution
 * and bitrate. Returns null when the browser can't record any usable format.
 * Optimized for bandwidth, not for archival quality — use as a smaller variant.
 */
export async function compressVideo(
  file: File,
  opts: { maxHeight?: number; videoBitsPerSecond?: number; onProgress?: (p: number) => void } = {},
): Promise<CompressResult | null> {
  const { maxHeight = 720, videoBitsPerSecond = 2_000_000, onProgress } = opts;
  if (typeof MediaRecorder === 'undefined') return null;

  const mimeCandidates = [
    'video/mp4;codecs=h264',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  const mimeType = mimeCandidates.find((m) => (MediaRecorder as any).isTypeSupported?.(m));
  if (!mimeType) return null;

  // If source is already WebM, skip compression to avoid MIME type issues
  if (file.type.startsWith('video/webm')) return null;

  const { el, revoke } = await loadVideoElement(file);
  try {
    if (!(el as any).captureStream) return null;
    const dur = isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
    if (dur <= 0) return null;

    const srcH = el.videoHeight || 0;
    const srcW = el.videoWidth || 0;
    if (!srcH || srcH <= maxHeight) return null; // nothing meaningful to shrink

    const scale = maxHeight / srcH;
    const outW = Math.round(srcW * scale / 2) * 2; // even dims for encoders
    const outH = Math.round(srcH * scale / 2) * 2;

    const canvas = document.createElement('canvas');
    canvas.width = outW; canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Some Chromiums require the source to be actively playing to captureStream.
    el.currentTime = 0;
    await el.play().catch(() => {});

    const videoStream = (canvas as any).captureStream(30) as MediaStream;
    // Try to include the original audio track if the browser supports capturing it.
    try {
      const audioSrc = (el as any).captureStream?.() as MediaStream | undefined;
      audioSrc?.getAudioTracks().forEach((t) => videoStream.addTrack(t));
    } catch { /* noop */ }

    const recorder = new MediaRecorder(videoStream, { mimeType, videoBitsPerSecond });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

    let raf = 0;
    const draw = () => {
      ctx.drawImage(el, 0, 0, outW, outH);
      if (dur > 0) onProgress?.(Math.min(1, el.currentTime / dur));
      raf = requestAnimationFrame(draw);
    };
    draw();

    const finished = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    recorder.start(1000);
    await new Promise<void>((resolve) => {
      el.onended = () => resolve();
      // Safety timeout: 3x the video duration
      setTimeout(() => resolve(), Math.max(30_000, dur * 3_000));
    });
    cancelAnimationFrame(raf);
    if (recorder.state !== 'inactive') recorder.stop();
    const blob = await finished;

    const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const outFile = new File([blob], `${baseName}-${maxHeight}p.${ext}`, { type: mimeType });
    return { file: outFile, width: outW, height: outH, bitrate: videoBitsPerSecond, mimeType };
  } finally { revoke(); }
}

export async function analyzeVideoWithAI(options: {
  videoFile?: File;
  title?: string;
  duration_seconds?: number;
  generateOptimalThumbnails?: boolean;
  detectKeyMoments?: boolean;
  aestheticScoring?: boolean;
  faceDetection?: boolean;
}) {
  const { analyzeVideoWithAI: aiCall } = await import('@/pronax-studio/geminiClient');
  return aiCall(options);
}

