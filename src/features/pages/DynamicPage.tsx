import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { DynamicWidgetItem } from '@/components/DynamicWidget';
import type { DynamicWidget } from '@/hooks/useDynamicWidgets';
import { supabase as _supabase } from '@/integrations/supabase/loose';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

type DynamicRoute = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  layout: DynamicWidget[];
  published: boolean;
};

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [row, setRow] = useState<DynamicRoute | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) return;
    document.title = `${slug} · PRO NAX`;
    let alive = true;
    (async () => {
      const { data } = await supabase.from('dynamic_routes').select('*').eq('slug', slug).eq('published', true).maybeSingle();
      if (!alive) return;
      setRow((data as DynamicRoute) ?? null);
      if (data?.title) document.title = `${data.title} · PRO NAX`;
    })();
    return () => { alive = false; };
  }, [slug]);

  if (row === undefined) {
    return <div className="flex-1 flex items-center justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (row === null) {
    return <div className="flex-1 p-10 text-center text-slate-400">Page not found.</div>;
  }
  const layout = Array.isArray(row.layout) ? row.layout : [];
  return (
    <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full space-y-5">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-white">{row.title}</h1>
        {row.description && <p className="text-sm text-slate-400 mt-1">{row.description}</p>}
      </header>
      <div className="space-y-4">
        {layout.map((w, i) => (
          <DynamicWidgetItem
            key={w.id ?? i}
            w={{
              id: String(w.id ?? i),
              slot: `page:${slug}`,
              kind: w.kind,
              title: w.title ?? null,
              config: w.config ?? {},
              position: i,
              enabled: true,
            }}
          />
        ))}
        {!layout.length && <div className="text-slate-500 text-sm">This page has no widgets yet.</div>}
      </div>
    </div>
  );
}
