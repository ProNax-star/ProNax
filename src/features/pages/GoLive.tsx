import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Copy, RefreshCw, Radio, Send, Camera, CameraOff, ExternalLink, Loader2,
  CheckCircle2, Circle, Eye, KeyRound, Server, Sparkles, Wifi, Check, DollarSign,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/loose';
import { useAuthSession } from '@/hooks/useAuthSession';
import { Link } from 'react-router-dom';
import { ShareDialog } from '@/components/ShareDialog';
import { config } from '@/config/app.config';

const CATS = ['Gaming','Music','Tech','Education','Sports','Cooking','Travel','News','Comedy','Just Chatting'];
const RTMP_URL = config.streaming.rtmpUrl || 'rtmps://global-live.mux.com:443/app';

type StreamRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  mux_stream_id: string | null;
  mux_stream_key: string | null;
  mux_playback_id: string | null;
  is_live: boolean;
};

function CopyField({ label, value, secret = false, icon }: { label: string; value: string; secret?: boolean; icon: React.ReactNode }) {
  const [show, setShow] = useState(!secret);
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
    toast({ title: `${label} copied` });
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">{icon}{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type={show ? 'text' : 'password'}
            value={value}
            readOnly
            className="font-mono text-xs bg-background/40 border-border/40 pr-2"
          />
        </div>
        {secret && (
          <Button variant="outline" size="sm" onClick={() => setShow((s) => !s)} className="shrink-0">
            {show ? 'Hide' : 'Show'}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handle} className="shrink-0">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export default function GoLive() {
  const { user } = useAuthSession();
  const [stream, setStream] = useState<StreamRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('Gaming');

  const [camOn, setCamOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase.from('streams').select('*').eq('user_id', user.id).maybeSingle();
      if (data) {
        setStream(data as StreamRow);
        setTitle(data.title ?? '');
        setDesc(data.description ?? '');
        setCat(data.category ?? 'Gaming');
      }
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!stream?.id) return;
    const ch = supabase.channel(`stream-${stream.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'streams', filter: `id=eq.${stream.id}` },
        (p) => setStream((s) => s ? { ...s, ...(p.new as StreamRow) } : s))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [stream?.id]);

  const generateCreds = async () => {
    if (!user) return toast({ title: 'Sign in required', variant: 'destructive' });
    if (!title.trim()) return toast({ title: 'Add a stream title first', variant: 'destructive' });
    setCreating(true);
    const { data, error } = await supabase.functions.invoke('mux-create-stream', {
      body: { title: title.trim(), description: desc, category: cat },
    });
    setCreating(false);
    if (error) {
      return toast({ title: 'Failed to create stream', description: error.message ?? 'Try again', variant: 'destructive' });
    }
    if (data?.error === 'MUX_LIVE_UNAVAILABLE') {
      return toast({
        title: 'Mux live streaming not enabled',
        description: 'Your Mux account is on the free plan. Upgrade at dashboard.mux.com to enable live streams.',
        variant: 'destructive',
      });
    }
    if (!data?.stream) {
      return toast({ title: 'Failed to create stream', description: data?.detail ?? 'Try again', variant: 'destructive' });
    }
    setStream(data.stream as StreamRow);
    toast({ title: '🎬 Stream credentials ready', description: 'Paste them into OBS and start streaming.' });
  };

  const toggleCam = async () => {
    if (camOn) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setCamOn(false); return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      setCamOn(true);
    } catch {
      toast({ title: 'Camera blocked', description: 'Allow camera access in your browser.', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  const hasCreds = !!stream?.mux_stream_key;
  const steps = [
    { done: !!title.trim(), label: 'Add a stream title' },
    { done: hasCreds, label: 'Generate stream credentials' },
    { done: hasCreds, label: 'Paste into OBS / Streamlabs' },
    { done: !!stream?.is_live, label: 'Start streaming from OBS' },
  ];
  const completedSteps = steps.filter((s) => s.done).length;

  return (
    <main className="container max-w-7xl px-3 sm:px-4 py-4 sm:py-6">
      {/* Hero status banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/40 glass-strong p-5 sm:p-6 mb-5">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-destructive/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-destructive to-rose-700 flex items-center justify-center shadow-lg shadow-destructive/30">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-bold leading-none flex items-center gap-2">
                  Go Live Studio
                  {stream?.is_live && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-destructive text-white text-[10px] font-bold tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> ON AIR
                    </span>
                  )}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">Powered by Mux · Stream from OBS, Streamlabs, or any RTMP encoder</p>
              </div>
            </div>
          </div>
          {stream?.mux_playback_id && (
            <Button asChild variant="outline" className="rounded-full">
              <Link to={`/live/${stream.mux_playback_id}`} target="_blank">
                <ExternalLink className="w-4 h-4 mr-2" />Open watch page
              </Link>
            </Button>
          )}
        </div>

        {/* Status pills */}
        <div className="relative mt-5 grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatusPill icon={<Wifi className="w-4 h-4" />} label="Stream health" value={stream?.is_live ? 'Excellent' : 'Idle'} tone={stream?.is_live ? 'good' : 'muted'} />
          <StatusPill icon={<Eye className="w-4 h-4" />} label="Viewers" value={stream?.is_live ? 'Live' : '—'} tone="muted" />
          <StatusPill icon={<DollarSign className="w-4 h-4" />} label="Ads" value="Enabled" tone="good" />
          <StatusPill icon={<Sparkles className="w-4 h-4" />} label="Setup" value={`${completedSteps}/${steps.length}`} tone={completedSteps === steps.length ? 'good' : 'warn'} />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4 min-w-0">
          {/* Preview */}
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-border/40 bg-black shadow-[0_20px_80px_-20px_rgba(0,0,0,0.8)]">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover bg-black" />
            {!camOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3 bg-gradient-to-br from-zinc-900 via-black to-zinc-950">
                <div className="w-16 h-16 rounded-2xl glass-strong flex items-center justify-center">
                  <Camera className="w-7 h-7" />
                </div>
                <p className="text-sm">Local preview (for framing only — Mux receives from OBS)</p>
                <Button size="sm" variant="outline" onClick={toggleCam}><Camera className="w-3.5 h-3.5 mr-2" />Enable camera preview</Button>
              </div>
            )}
            {camOn && (
              <>
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur text-white text-[10px] font-bold tracking-widest">
                  PREVIEW
                </div>
                <button onClick={toggleCam} className="absolute bottom-3 right-3 glass px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5">
                  <CameraOff className="w-3 h-3" />Stop preview
                </button>
              </>
            )}
          </div>

          {/* Stream details */}
          <section className="glass-strong rounded-2xl p-5 border border-border/40 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Stream details</h2>
              <span className="text-[10px] text-muted-foreground">Auto-synced with Mux</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-xs">Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Friday Night Valorant Ranked" className="bg-background/40" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Description</Label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's the stream about?" rows={2} className="bg-background/40 resize-none" />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Category</Label>
                <Select value={cat} onValueChange={setCat}>
                  <SelectTrigger className="bg-background/40"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Credentials */}
          <section className="glass-strong rounded-2xl p-5 border border-border/40 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Encoder credentials</h2>
              <Button size="sm" onClick={generateCreds} disabled={creating} className="bg-gradient-to-r from-destructive to-rose-600 hover:opacity-90 text-white shadow-lg shadow-destructive/30">
                {creating ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Creating…</>
                  : <><RefreshCw className="w-3.5 h-3.5 mr-2" />{stream ? 'Regenerate' : 'Generate credentials'}</>}
              </Button>
            </div>

            {!stream && (
              <div className="rounded-xl border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
                <KeyRound className="w-8 h-8 mx-auto mb-2 opacity-60" />
                No credentials yet. Click <b className="text-foreground">Generate credentials</b> to provision a new RTMP key from Mux.
              </div>
            )}

            {stream && (
              <div className="space-y-4">
                <CopyField label="RTMPS server URL" value={RTMP_URL} icon={<Server className="w-3 h-3" />} />
                <CopyField label="Stream key (private)" value={stream.mux_stream_key ?? ''} secret icon={<KeyRound className="w-3 h-3" />} />
                <CopyField label="Playback ID" value={stream.mux_playback_id ?? ''} icon={<Eye className="w-3 h-3" />} />

                <div className="rounded-xl bg-background/30 border border-border/30 p-4 text-xs text-muted-foreground space-y-1.5">
                  <p className="font-semibold text-foreground text-sm mb-2">📺 OBS Studio quick setup</p>
                  <p><span className="text-foreground/80">1.</span> Settings → Stream → Service: <code className="px-1.5 py-0.5 rounded bg-muted/40 text-foreground">Custom</code></p>
                  <p><span className="text-foreground/80">2.</span> Server: paste the RTMPS URL above</p>
                  <p><span className="text-foreground/80">3.</span> Stream Key: paste the stream key above</p>
                  <p><span className="text-foreground/80">4.</span> Click <b className="text-foreground">Start Streaming</b>. Watch page goes LIVE automatically with ad breaks enabled 💰</p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar — checklist + monetization */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <section className="glass-strong rounded-2xl p-5 border border-border/40">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />Setup checklist
            </h3>
            <ul className="space-y-2.5">
              {steps.map((s, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  {s.done
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className={s.done ? 'text-foreground/90 line-through decoration-muted-foreground/50' : 'text-foreground/80'}>{s.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-violet-400 transition-all" style={{ width: `${(completedSteps / steps.length) * 100}%` }} />
            </div>
          </section>

          <section className="glass-strong rounded-2xl p-5 border border-border/40">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />Live monetization
            </h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>Pre-roll ad</span><span className="text-emerald-400 font-semibold">Enabled</span></div>
              <div className="flex justify-between"><span>Mid-roll cadence</span><span className="text-foreground">Every 10 min</span></div>
              <div className="flex justify-between"><span>Revenue split</span><span className="text-foreground">55% creator</span></div>
              <div className="flex justify-between"><span>Networks</span><span className="text-foreground">Auto-routed</span></div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
              Real ads run on the watch page through your live ad network. Earnings credit to your wallet automatically (anti-fraud capped).
            </p>
          </section>

          <section className="glass-strong rounded-2xl p-5 border border-border/40">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Send className="w-4 h-4 text-primary" />Share your stream</h3>
            {stream?.mux_playback_id ? (
              <div className="space-y-2">
                <Button className="w-full" onClick={() => setShareOpen(true)}>
                  <Send className="w-3.5 h-3.5 mr-2" />Share watch link
                </Button>
                <Button variant="outline" className="w-full" onClick={() => {
                  const url = `${window.location.origin}/live/${stream.mux_playback_id}`;
                  navigator.clipboard.writeText(url);
                  toast({ title: 'Watch link copied' });
                }}>
                  <Copy className="w-3.5 h-3.5 mr-2" />Copy link only
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Generate credentials to get your shareable watch link.</p>
            )}
          </section>
        </aside>
      </div>
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={stream?.mux_playback_id ? `${window.location.origin}/live/${stream.mux_playback_id}` : ''}
        title={`${title || 'Catch me LIVE'} — on Pro Nax`}
      />
    </main>
  );
}

function StatusPill({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'good' | 'warn' | 'muted' }) {
  const tones = {
    good: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
    warn: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
    muted: 'text-muted-foreground border-border/40 bg-background/30',
  } as const;
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest opacity-80">{icon}{label}</div>
      <div className="text-sm font-semibold mt-0.5 text-foreground">{value}</div>
    </div>
  );
}
