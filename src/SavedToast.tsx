/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { toast } from 'sonner';

/** Bottom snackbar with a small thumbnail + "See list" action, matching the mobile save flow. */
export function showSavedToast(opts: {
  label: string;
  thumbUrl?: string | null;
  playlistId?: string | null;
}) {
  const { label, thumbUrl, playlistId } = opts;
  toast.custom(
    (t) => (
      <div className="flex w-[min(92vw,420px)] items-center gap-3 rounded-xl border border-border/40 bg-card px-3 py-2 shadow-xl">
        <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
          {thumbUrl ? <img src={thumbUrl} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{label}</span>
        {playlistId ? (
          <a
            href={`/playlist/${playlistId}`}
            onClick={() => toast.dismiss(t)}
            className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted/70"
          >
            See list
          </a>
        ) : null}
      </div>
    ),
    { duration: 5000 },
  );
}
