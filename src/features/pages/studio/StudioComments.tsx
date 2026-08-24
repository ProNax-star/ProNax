/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/loose';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useStudio } from './StudioLayout';

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  video_id: string;
  user_id: string;
  video_title?: string;
  author_name?: string;
};

export default function StudioComments() {
  const { user } = useAuthSession();
  const { videos } = useStudio();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'held'>('all');

  useEffect(() => {
    if (!user || videos.length === 0) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const ids = videos.map((v) => v.id);
      const { data } = await supabase
        .from('video_comments')
        .select('id, body:text, created_at, video_id, user_id')
        .in('video_id', ids)
        .order('created_at', { ascending: false })
        .limit(50);

      const rows = (data ?? []) as unknown as CommentRow[];
      const videoMap = new Map(videos.map((v) => [v.id, v.title]));
      setComments(rows.map((r) => ({ ...r, video_title: videoMap.get(r.video_id) ?? 'Video' })));
      setLoading(false);
    })();
  }, [user, videos]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-normal text-[#0f0f0f]">Community</h1>
        <p className="text-sm text-[#606060] mt-1">See and respond to comments on your videos</p>
      </div>

      <div className="flex gap-1 border-b border-[#e5e5e5]">
        {(['all', 'published', 'held'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize transition ${
              filter === f
                ? 'border-[#0f0f0f] text-[#0f0f0f]'
                : 'border-transparent text-[#606060] hover:text-[#0f0f0f]'
            }`}
          >
            {f === 'all' ? 'Comments' : f}
          </button>
        ))}
      </div>

      <div className="studio-card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-[#f2f2f2] rounded animate-pulse" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-[#909090] mb-3" />
            <p className="text-sm text-[#606060]">No comments yet on your videos</p>
          </div>
        ) : (
          <div className="divide-y divide-[#e5e5e5]">
            {comments.map((c) => (
              <div key={c.id} className="p-4 hover:bg-[#fafafa] transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#0f0f0f]">{c.body}</p>
                    <p className="text-xs text-[#606060] mt-1">
                      on <span className="font-medium">{c.video_title}</span>
                      {' · '}
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to={`/watch/${c.video_id}#comments`}
                    className="shrink-0 inline-flex items-center gap-1 text-xs text-cyan-500 hover:underline"
                  >
                    Reply <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
