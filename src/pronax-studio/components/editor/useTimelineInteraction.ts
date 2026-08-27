/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useCallback, useMemo, useRef } from "react";
import { Clip, EditorDoc } from "./types";
import { clamp, uid } from "./constants";

export type DragState =
  | null
  | { mode: "move"; id: string; grabOffset: number; originTrack: string }
  | { mode: "trim-in" | "trim-out" | "slip"; id: string; startX: number; orig: Clip };

export const useTimelineInteraction = (
  doc: EditorDoc,
  duration: number,
  pxPerSec: number,
  snapping: boolean,
  playhead: number,
  timelineRef: React.RefObject<HTMLDivElement>,
  commit: (updater: (d: EditorDoc) => EditorDoc) => void,
  live: (updater: (d: EditorDoc) => EditorDoc) => void,
  setSelectedClipId: (id: string | null) => void
) => {
  const dragRef = useRef<DragState>(null);

  const snapPoints = useMemo(() => {
    const pts = [0, playhead];
    doc.clips.forEach((c) => {
      pts.push(c.start, c.start + c.duration);
    });
    for (let s = 0; s <= duration; s += 5) pts.push(s);
    return pts;
  }, [doc.clips, playhead, duration]);

  const applySnap = useCallback(
    (value: number) => {
      if (!snapping) return { value, guide: null as number | null };
      const tol = 8 / pxPerSec;
      let best: number | null = null;
      let bestD = tol;
      for (const p of snapPoints) {
        const d = Math.abs(p - value);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      return best === null ? { value, guide: null } : { value: best, guide: best };
    },
    [snapping, pxPerSec, snapPoints]
  );

  const timeFromClientX = useCallback(
    (clientX: number) => {
      const el = timelineRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return clamp((clientX - rect.left + el.scrollLeft) / pxPerSec, 0, duration);
    },
    [timelineRef, pxPerSec, duration]
  );

  const patchClip = useCallback(
    (id: string, patch: Partial<Clip>, history = true) => {
      const fn = (d: EditorDoc) => ({
        ...d,
        clips: d.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      });
      history ? commit(fn) : live(fn);
    },
    [commit, live]
  );

  const razorAt = useCallback(
    (time: number, clipId?: string) => {
      commit((d) => {
        const target = d.clips.find(
          (c) =>
            (clipId ? c.id === clipId : true) &&
            time > c.start + 0.05 &&
            time < c.start + c.duration - 0.05
        );
        if (!target) return d;
        const offset = time - target.start;
        const left: Clip = { ...target, id: uid("clip"), duration: offset };
        const right: Clip = {
          ...target,
          id: uid("clip"),
          start: time,
          duration: target.duration - offset,
          srcIn: target.srcIn + offset,
          transitionIn: "none",
          keyframes: target.keyframes
            .filter((k) => k.time >= offset)
            .map((k) => ({ ...k, id: uid("kf"), time: k.time - offset })),
        };
        left.keyframes = target.keyframes.filter((k) => k.time < offset).map((k) => ({ ...k, id: uid("kf") }));
        return { ...d, clips: [...d.clips.filter((c) => c.id !== target.id), left, right] };
      });
    },
    [commit]
  );

  const deleteSelected = useCallback(() => {
    const selectedClipId = dragRef.current && 'id' in dragRef.current ? dragRef.current.id : null;
    if (!selectedClipId) return;
    commit((d) => ({ ...d, clips: d.clips.filter((c) => c.id !== selectedClipId) }));
    setSelectedClipId(null);
  }, [commit, setSelectedClipId]);

  return {
    dragRef,
    snapPoints,
    applySnap,
    timeFromClientX,
    patchClip,
    razorAt,
    deleteSelected,
  };
};
