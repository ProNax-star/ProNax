/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useParams, Link } from '@/lib/router-compat';

export default function LiveWatch() {
  const { playbackId } = useParams();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-display font-bold text-primary mb-2">Live Stream</h1>
      <p className="text-muted-foreground mb-4">Playback ID: {playbackId}</p>
      <Link to="/" className="text-primary underline">← Back home</Link>
    </div>
  );
}
