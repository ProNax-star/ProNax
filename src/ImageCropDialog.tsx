/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Move, X, ZoomIn } from 'lucide-react';
import {
  AVATAR_SPEC,
  BANNER_SAFE_AREAS,
  BANNER_SPEC,
  cropImageToBlob,
  type CropRect,
  type LoadedImage,
} from '@/lib/imageCrop';

interface Props {
  kind: 'avatar' | 'banner';
  image: LoadedImage;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
}

const VIEW_WIDTH = 520;

export function ImageCropDialog({ kind, image, busy, onCancel, onConfirm }: Props) {
  const spec = kind === 'avatar' ? AVATAR_SPEC : BANNER_SPEC;
  const viewHeight = Math.round(VIEW_WIDTH / spec.aspect);

  // Zoom of 1 = the image exactly covers the crop frame.
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0.5, y: 0.5 }); // focal point, 0..1
  const [working, setWorking] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  // Base cover scale: source pixels per view pixel at zoom 1.
  const baseScale = useMemo(() => {
    const scaleX = VIEW_WIDTH / image.width;
    const scaleY = viewHeight / image.height;
    return Math.max(scaleX, scaleY);
  }, [image.width, image.height, viewHeight]);

  const crop: CropRect = useMemo(() => {
    const scale = baseScale * zoom;
    const cropW = Math.min(image.width, VIEW_WIDTH / scale);
    const cropH = Math.min(image.height, viewHeight / scale);
    const maxX = Math.max(0, image.width - cropW);
    const maxY = Math.max(0, image.height - cropH);
    return {
      x: Math.min(maxX, Math.max(0, offset.x * image.width - cropW / 2)),
      y: Math.min(maxY, Math.max(0, offset.y * image.height - cropH / 2)),
      width: cropW,
      height: cropH,
    };
  }, [baseScale, zoom, offset, image.width, image.height, viewHeight]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const scale = baseScale * zoom;
    const dx = (e.clientX - d.startX) / (image.width * scale);
    const dy = (e.clientY - d.startY) / (image.height * scale);
    setOffset({
      x: Math.min(1, Math.max(0, d.ox - dx)),
      y: Math.min(1, Math.max(0, d.oy - dy)),
    });
  };

  const onPointerUp = () => { dragRef.current = null; };

  const confirm = useCallback(async () => {
    setWorking(true);
    try {
      const blob = await cropImageToBlob(image.objectUrl, crop, spec.output, 'image/jpeg', 0.92);
      await onConfirm(blob);
    } finally {
      setWorking(false);
    }
  }, [crop, image.objectUrl, onConfirm, spec.output]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const bgSize = `${image.width * baseScale * zoom}px ${image.height * baseScale * zoom}px`;
  const bgPos = `${offset.x * 100}% ${offset.y * 100}%`;
  const disabled = working || busy;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-2xl glass-strong rounded-2xl border border-primary/30 p-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-display font-bold text-aurora">
              {kind === 'avatar' ? 'Crop profile picture' : 'Crop channel banner'}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {kind === 'avatar'
                ? `Square crop · min ${AVATAR_SPEC.minWidth}×${AVATAR_SPEC.minHeight} · exported ${AVATAR_SPEC.output.width}×${AVATAR_SPEC.output.height}`
                : `16:9 crop · recommended ${BANNER_SPEC.recommended.width}×${BANNER_SPEC.recommended.height} · exported ${BANNER_SPEC.output.width}×${BANNER_SPEC.output.height}`}
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className={`relative mx-auto overflow-hidden border border-border/60 bg-muted/30 touch-none cursor-grab active:cursor-grabbing ${
            kind === 'avatar' ? 'rounded-full' : 'rounded-xl'
          }`}
          style={{ width: '100%', maxWidth: VIEW_WIDTH, aspectRatio: `${spec.aspect}` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${image.objectUrl})`,
              backgroundSize: bgSize,
              backgroundPosition: bgPos,
              backgroundRepeat: 'no-repeat',
            }}
          />
          {kind === 'banner' && (
            <div className="pointer-events-none absolute inset-0">
              {BANNER_SAFE_AREAS.map((area) => (
                <div
                  key={area.id}
                  className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 border border-dashed border-primary/50"
                  style={{ width: `${area.widthPct * 100}%` }}
                />
              ))}
            </div>
          )}
          <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-white/80 bg-black/50 rounded px-1.5 py-0.5">
            <Move className="w-3 h-3" /> Drag to reposition
          </div>
        </div>

        {kind === 'banner' && (
          <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            {BANNER_SAFE_AREAS.map((a) => (
              <span key={a.id}>{a.label} safe area</span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary"
            aria-label="Zoom"
          />
          <span className="text-[11px] text-muted-foreground w-10 text-right">{zoom.toFixed(2)}×</span>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm border border-border/60 text-muted-foreground hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={disabled}
            className="px-4 py-2 rounded-lg text-sm gradient-primary text-primary-foreground font-semibold disabled:opacity-60 inline-flex items-center gap-2"
          >
            {disabled && <Loader2 className="w-4 h-4 animate-spin" />}
            Save {kind === 'avatar' ? 'picture' : 'banner'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default ImageCropDialog;
