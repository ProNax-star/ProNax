/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Save, ShieldCheck, Zap, Link2, MessageSquareWarning, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase as _supabase } from '@/integrations/supabase/loose';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

type Settings = {
  id: number;
  report_threshold: number;
  auto_suspend_removed_count: number;
  detect_external_links: boolean;
  detect_profanity: boolean;
  auto_moderation_enabled: boolean;
  updated_at?: string;
};

const DEFAULTS: Settings = {
  id: 1,
  report_threshold: 2,
  auto_suspend_removed_count: 2,
  detect_external_links: true,
  detect_profanity: true,
  auto_moderation_enabled: true,
};

export function ModerationSettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('moderation_settings').select('*').eq('id', 1).maybeSingle();
      if (error) toast.error(error.message);
      setSettings(data ?? DEFAULTS);
    })();
  }, []);

  const patch = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setSettings((s) => (s ? { ...s, [k]: v } : s));
    setDirty(true);
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from('moderation_settings').upsert({
      id: 1,
      report_threshold: settings.report_threshold,
      auto_suspend_removed_count: settings.auto_suspend_removed_count,
      detect_external_links: settings.detect_external_links,
      detect_profanity: settings.detect_profanity,
      auto_moderation_enabled: settings.auto_moderation_enabled,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Moderation settings saved');
    setDirty(false);
  };

  if (!settings) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-2xl border border-primary/30 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-display font-bold uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Moderation configuration
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Adjust auto-moderation thresholds without redeploying. Takes effect immediately.</p>
          </div>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="gradient-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2 glow-primary disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save changes
          </button>
        </div>

        <ToggleRow
          icon={<PowerOff className="w-4 h-4" />}
          label="Auto-moderation master switch"
          hint="When off, all automatic suppression, bans, and content flagging are paused. Manual admin actions still work."
          value={settings.auto_moderation_enabled}
          onChange={(v) => patch('auto_moderation_enabled', v)}
          color="destructive"
        />

        <div className="h-px bg-border/30 my-4" />

        <SliderRow
          icon={<Zap className="w-4 h-4" />}
          label="Report threshold"
          hint="Number of user reports before a video is auto-suppressed and sent to the moderation queue."
          value={settings.report_threshold}
          min={1}
          max={20}
          onChange={(v) => patch('report_threshold', v)}
        />

        <SliderRow
          icon={<ShieldCheck className="w-4 h-4" />}
          label="Auto-suspend removed count"
          hint="After this many of a user's videos are removed by admins, the account is auto-banned pending review."
          value={settings.auto_suspend_removed_count}
          min={1}
          max={10}
          onChange={(v) => patch('auto_suspend_removed_count', v)}
        />

        <div className="h-px bg-border/30 my-4" />

        <ToggleRow
          icon={<MessageSquareWarning className="w-4 h-4" />}
          label="Profanity & toxicity scanner"
          hint="Auto-flag comments, titles, and descriptions using AI context-aware moderation and toxicity models."
          value={settings.detect_profanity}
          onChange={(v) => patch('detect_profanity', v)}
        />

        <ToggleRow
          icon={<Link2 className="w-4 h-4" />}
          label="External-link & spam detection"
          hint="Auto-flag comments and video descriptions containing external URLs or promotional spam."
          value={settings.detect_external_links}
          onChange={(v) => patch('detect_external_links', v)}
        />

        {settings.updated_at && (
          <p className="text-[10px] text-muted-foreground mt-4">Last saved: {new Date(settings.updated_at).toLocaleString()}</p>
        )}
      </div>

      {/* AI Context-Aware Moderation & Sentiment Tester */}
      <AIModerationTestCard />
    </div>
  );
}

function AIModerationTestCard() {
  const [sampleText, setSampleText] = useState('');
  const [testing, setTesting] = useState(false);
  const [res, setRes] = useState<any>(null);

  const runTest = async () => {
    setTesting(true);
    try {
      const { analyzeContentWithAI } = await import('@/lib/moderation');
      const result = await analyzeContentWithAI({
        text: sampleText,
        sentimentAnalysis: true,
        toxicityDetection: true,
        spamDetection: true,
      });
      setRes(result);
      toast.success('AI Moderation scan completed!');
    } catch (err: any) {
      toast.error('Scan failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="glass-strong rounded-2xl border border-purple-500/30 p-5 space-y-3">
      <div className="flex items-center justify-between border-b border-border/20 pb-2">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" /> AI Context-Aware Moderation & Toxicity Analyzer
        </h3>
        <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
          GEMINI SENTIMENT & TOXICITY
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Test context-aware toxicity detection, sentiment analysis, spam identification, and copyright risk evaluation on sample text or comments.
      </p>

      <div className="space-y-2">
        <textarea
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          rows={2}
          className="w-full text-xs p-3 rounded-xl bg-background border border-border focus:border-purple-500 text-foreground resize-none"
        />
        <button
          onClick={runTest}
          disabled={testing}
          className="text-xs font-bold px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 transition"
        >
          {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          <span>RUN CONTEXT-AWARE AI MODERATION SCAN</span>
        </button>
      </div>

      {res && (
        <div className="p-3.5 rounded-xl bg-background/80 border border-purple-500/30 font-mono text-xs space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded bg-muted/40 border border-border/30">
              <div className="text-[9px] text-muted-foreground">STATUS</div>
              <div className={`text-xs font-bold ${res.isApproved ? 'text-emerald-400' : 'text-red-400'}`}>
                {res.isApproved ? 'APPROVED' : 'FLAGGED / BLOCKED'}
              </div>
            </div>
            <div className="p-2 rounded bg-muted/40 border border-border/30">
              <div className="text-[9px] text-muted-foreground">TOXICITY</div>
              <div className="text-xs font-bold text-amber-400">{Math.round((res.toxicityScore || 0) * 100)}%</div>
            </div>
            <div className="p-2 rounded bg-muted/40 border border-border/30">
              <div className="text-[9px] text-muted-foreground">SPAM SCORE</div>
              <div className="text-xs font-bold text-purple-400">{Math.round((res.spamScore || 0) * 100)}%</div>
            </div>
            <div className="p-2 rounded bg-muted/40 border border-border/30">
              <div className="text-[9px] text-muted-foreground">SENTIMENT</div>
              <div className="text-xs font-bold text-cyan-400 uppercase">{res.sentiment || 'NEUTRAL'}</div>
            </div>
          </div>
          <div className="text-[11px] text-zinc-300 font-sans">
            <span className="font-bold text-purple-400 font-mono text-[10px] uppercase block">Reasoning & Action:</span>
            <span>{res.reasoning || 'Clean text verified'}</span> (Suggested Action: <span className="font-mono text-purple-300">{res.suggestedAction}</span>)
          </div>
        </div>
      )}
    </div>
  );
}


function ToggleRow({ icon, label, hint, value, onChange, color = 'primary' }: {
  icon: React.ReactNode; label: string; hint: string; value: boolean;
  onChange: (v: boolean) => void; color?: 'primary' | 'destructive';
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg glass border border-border/40 flex items-center justify-center text-${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
      </div>
      <motion.button
        onClick={() => onChange(!value)}
        whileTap={{ scale: 0.94 }}
        className={`shrink-0 relative w-11 h-6 rounded-full transition border ${
          value
            ? color === 'destructive'
              ? 'bg-destructive/80 border-destructive'
              : 'bg-primary/80 border-primary'
            : 'bg-muted border-border/40'
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
      </motion.button>
    </div>
  );
}

function SliderRow({ icon, label, hint, value, min, max, onChange }: {
  icon: React.ReactNode; label: string; hint: string; value: number;
  min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="py-2">
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-8 h-8 rounded-lg glass border border-border/40 flex items-center justify-center text-primary">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold flex items-center justify-between gap-2">
            <span>{label}</span>
            <span className="text-primary tabular-nums text-base font-display">{value}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-2 accent-[hsl(var(--primary))]"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}
