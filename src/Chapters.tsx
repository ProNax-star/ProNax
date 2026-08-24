/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useMemo } from 'react';
import { ListVideo } from 'lucide-react';

export interface Chapter { time: number; label: string; raw: string; }

export function parseChapters(description?: string | null): Chapter[] {
  if (!description) return [];
  const re = /(?:^|\n)\s*(?:\(?)(\d{1,2}):(\d{2})(?::(\d{2}))?\)?\s*[-–—:|]?\s*(.+?)(?=\n|$)/g;
  const out: Chapter[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(description))) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    const c = m[3] ? parseInt(m[3], 10) : null;
    const time = c !== null ? a * 3600 + b * 60 + c : a * 60 + b;
    const raw = c !== null ? `${a}:${b.toString().padStart(2, '0')}:${c.toString().padStart(2, '0')}` : `${a}:${b.toString().padStart(2, '0')}`;
    const label = (m[4] || '').trim().replace(/^[-–—:|]\s*/, '');
    if (label && label.length < 120) out.push({ time, label, raw });
  }
  // Dedupe/sort by time
  const seen = new Set<number>();
  return out.filter(c => (seen.has(c.time) ? false : (seen.add(c.time), true))).sort((x, y) => x.time - y.time);
}

export function Chapters({ description, onSeek }: { description?: string | null; onSeek?: (seconds: number) => void }) {
  const chapters = useMemo(() => parseChapters(description), [description]);
  if (chapters.length < 2) return null;

  return (
    <div className="glass-strong rounded-xl border border-primary/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <ListVideo className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-display font-semibold text-foreground">Chapters</h3>
        <span className="text-[10px] text-muted-foreground">{chapters.length}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
        {chapters.map((c, i) => (
          <button
            key={`${c.time}-${i}`}
            onClick={() => onSeek?.(c.time)}
            className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-left text-xs hover:bg-primary/10 hover:border-primary/40 border border-transparent transition group"
          >
            <span className="font-mono text-[11px] text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0 group-hover:bg-primary/20">
              {c.raw}
            </span>
            <span className="text-foreground/90 line-clamp-1 flex-1">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
