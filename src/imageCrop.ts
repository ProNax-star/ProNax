/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Branding image helpers — size/type/dimension validation and canvas cropping
 * with enforced aspect ratios.
 */

export const BANNER_SPEC = {
  aspect: 16 / 9,
  /** Recommended source size. */
  recommended: { width: 2048, height: 1152 },
  /** Rendered output size. */
  output: { width: 2048, height: 1152 },
  minWidth: 1280,
  minHeight: 720,
  maxSizeMB: 8,
} as const;

export const AVATAR_SPEC = {
  aspect: 1,
  recommended: { width: 800, height: 800 },
  output: { width: 800, height: 800 },
  minWidth: 98,
  minHeight: 98,
  maxSizeMB: 4,
} as const;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface LoadedImage {
  file: File;
  objectUrl: string;
  width: number;
  height: number;
}

export type ValidationResult = { ok: true; image: LoadedImage } | { ok: false; error: string };

export async function loadAndValidateImage(
  file: File,
  spec: typeof BANNER_SPEC | typeof AVATAR_SPEC,
): Promise<ValidationResult> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, error: 'Use a JPG, PNG or WebP image.' };
  }
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > spec.maxSizeMB) {
    return { ok: false, error: `Image is ${sizeMB.toFixed(1)}MB — the limit is ${spec.maxSizeMB}MB.` };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const { width, height } = await readDimensions(objectUrl);
    if (width < spec.minWidth || height < spec.minHeight) {
      URL.revokeObjectURL(objectUrl);
      return {
        ok: false,
        error: `Image is ${width}×${height}. Minimum is ${spec.minWidth}×${spec.minHeight} (recommended ${spec.recommended.width}×${spec.recommended.height}).`,
      };
    }
    return { ok: true, image: { file, objectUrl, width, height } };
  } catch {
    URL.revokeObjectURL(objectUrl);
    return { ok: false, error: 'That file could not be read as an image.' };
  }
}

function readDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('decode failed'));
    img.src = src;
  });
}

export interface CropRect {
  /** Source-pixel crop box. */
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Largest centred crop of `aspect` that fits inside the source image. */
export function defaultCrop(sourceWidth: number, sourceHeight: number, aspect: number): CropRect {
  let width = sourceWidth;
  let height = width / aspect;
  if (height > sourceHeight) {
    height = sourceHeight;
    width = height * aspect;
  }
  return {
    x: (sourceWidth - width) / 2,
    y: (sourceHeight - height) / 2,
    width,
    height,
  };
}

export async function cropImageToBlob(
  src: string,
  crop: CropRect,
  output: { width: number; height: number },
  mimeType = 'image/jpeg',
  quality = 0.92,
): Promise<Blob> {
  const img = await loadImageElement(src);
  const canvas = document.createElement('canvas');
  canvas.width = output.width;
  canvas.height = output.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, output.width, output.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the cropped image.'))),
      mimeType,
      quality,
    );
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode failed'));
    img.src = src;
  });
}

/**
 * Crop-safe areas for a 16:9 banner, expressed as a fraction of the full
 * banner width/height, matching how the header renders on each breakpoint.
 */
export const BANNER_SAFE_AREAS = [
  { id: 'mobile', label: 'Mobile', widthPct: 0.42, heightPct: 1 },
  { id: 'tablet', label: 'Tablet', widthPct: 0.72, heightPct: 1 },
  { id: 'desktop', label: 'Desktop', widthPct: 1, heightPct: 1 },
] as const;
