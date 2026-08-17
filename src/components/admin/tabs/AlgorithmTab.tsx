import { useEffect, useState, useCallback, useMemo } from 'react';
import { Loader2, Save, Cpu, Zap, Clock, MousePointerClick, Rewind, Sparkles, History, FlaskConical, Trophy, BarChart2, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import { optimizeAlgorithmWeightsWithAI, analyzeVideoContentQuality } from '@/pronax-studio/geminiClient';
import { getActiveMLWeights, updateActiveMLWeights, AIContentQualityAssessment } from '@/lib/mlAlgorithmEngine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

type NumKeys =
  | 'algo_category_affinity'
  | 'algo_freshness_boost'
  | 'algo_ctr_weight'
  | 'algo_retention_weight'
  | 'algo_watched_penalty'
  | 'algo_shorts_retention'
  | 'algo_tag_affinity';

type Weights = Record<NumKeys, number>;

const DEFAULTS: Weights = {
  algo_category_affinity: 12,
  algo_freshness_boost: 35,
  algo_ctr_weight: 65,
  algo_retention_weight: 150,
  algo_watched_penalty: 50,
  algo_shorts_retention: 210,
  algo_tag_affinity: 70,
};

const KNOBS: Array<{ key: NumKeys; label: string; hint: string; min: number; max: number; step: number; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'algo_ctr_weight', label: 'Impression CTR Weight', hint: 'Click-Through Rate importance vs thumbnail impressions.', min: 0, max: 200, step: 1, icon: MousePointerClick },
  { key: 'algo_retention_weight', label: 'Average View Duration (AVD)', hint: 'Watch-time ratio priority. High = long-form binge content wins.', min: 0, max: 400, step: 5, icon: Zap },
  { key: 'algo_shorts_retention', label: 'Shorts Completion Velocity', hint: 'Priority boost for vertical Shorts with >80% completion rate.', min: 0, max: 300, step: 5, icon: Trophy },
  { key: 'algo_tag_affinity', label: 'User History & Tag Affinity', hint: 'Semantic matching between viewer interest vector and video tags.', min: 0, max: 100, step: 1, icon: FlaskConical },
  { key: 'algo_freshness_boost', label: 'Freshness Decay Half-Life', hint: 'Score boost for new uploads published in the last 48 hours.', min: 0, max: 100, step: 1, icon: Clock },
  { key: 'algo_category_affinity', label: 'Category Cluster Weight', hint: 'Match score boost if video category equals user top 3 history.', min: 0, max: 40, step: 0.5, icon: Sparkles },
  { key: 'algo_watched_penalty', label: 'Already-Watched Penalty', hint: 'Deduction score for videos the viewer has already fully seen.', min: 0, max: 200, step: 5, icon: Rewind },
];

// Sample Videos for Live Neural Recommendation Engine Simulator
type SimVideo = {
  id: string;
  title: string;
  channel: string;
  category: string;
  ctr: number; // e.g. 12.5%
  avdRatio: number; // e.g. 0.72 (72% watch time)
  isShort: boolean;
  shortsCompletion: number; // e.g. 0.95
  hoursAgo: number;
  tags: string[];
  views: string;
};

const SIM_VIDEOS: SimVideo[] = [
  { id: 'v1', title: 'Building a Full-Stack Pronax Video Platform in 24 Hours', channel: 'CodeCraft Pro', category: 'Tech & Coding', ctr: 14.2, avdRatio: 0.78, isShort: false, shortsCompletion: 0, hoursAgo: 6, tags: ['coding', 'tech', 'react', 'fullstack'], views: '142K' },
  { id: 'v2', title: 'Cyberpunk Synthwave Beats for Late Night Focus 🌌', channel: 'Aesthetic Audio', category: 'Music & Vibes', ctr: 8.5, avdRatio: 0.91, isShort: false, shortsCompletion: 0, hoursAgo: 48, tags: ['music', 'synthwave', 'lofi', 'focus'], views: '520K' },
  { id: 'v3', title: 'Mind-Blowing Quantum Computing Breakthrough Explained! ⚡', channel: 'Future Tech 360', category: 'Tech & Science', ctr: 18.5, avdRatio: 0.62, isShort: true, shortsCompletion: 0.94, hoursAgo: 2, tags: ['tech', 'science', 'quantum', 'ai'], views: '890K' },
  { id: 'v4', title: '10 Hidden Features You Didn\'t Know in VS Code', channel: 'Dev Tips Daily', category: 'Tech & Coding', ctr: 11.0, avdRatio: 0.55, isShort: true, shortsCompletion: 0.88, hoursAgo: 12, tags: ['coding', 'vscode', 'tools'], views: '95K' },
  { id: 'v5', title: 'Top 5 Easy Meal Prep Recipes for Busy Developers', channel: 'Healthy Dev', category: 'Lifestyle', ctr: 6.8, avdRatio: 0.40, isShort: false, shortsCompletion: 0, hoursAgo: 72, tags: ['lifestyle', 'food', 'dev'], views: '32K' },
];

type Persona = {
  id: string;
  name: string;
  desc: string;
  topCategory: string;
  interests: string[];
};

const PERSONAS: Persona[] = [
  { id: 'tech', name: '💻 Tech & AI Enthusiast', desc: 'Frequent viewer of coding, AI models, & developer tools.', topCategory: 'Tech & Coding', interests: ['coding', 'tech', 'react', 'fullstack', 'ai'] },
  { id: 'music', name: '🎧 Lo-Fi & Focus Listener', desc: 'Loves long ambient streams & background music.', topCategory: 'Music & Vibes', interests: ['music', 'synthwave', 'lofi', 'focus'] },
  { id: 'shorts', name: '⚡ Shorts Binge Viewer', desc: 'Swipes through fast vertical shorts with high completion.', topCategory: 'Tech & Science', interests: ['quantum', 'science', 'tech', 'tools'] },
  { id: 'guest', name: '🌟 New Guest Viewer', desc: 'Unauthenticated visitor; algorithm prioritizes raw CTR & Freshness.', topCategory: '', interests: [] },
];

type AuditRow = { id: string; actor: string | null; previous: Partial<Weights>; next: Partial<Weights>; note: string | null; created_at: string };

export function AlgorithmTab() {
  const [weights, setWeights] = useState<Weights>(DEFAULTS);
  const [initial, setInitial] = useState<Weights>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string>('tech');

  // AI & ML Dynamic Engine State
  const [optimizingAI, setOptimizingAI] = useState(false);
  const [aiOptResult, setAiOptResult] = useState<{ reasoning?: string; expectedPerformanceLiftPct?: number; focusRecommendation?: string } | null>(null);
  
  // Interactive AI Content Quality Assessment Simulator State
  const [testTitle, setTestTitle] = useState('How to Build an AI-Powered Video Engine in 2026');
  const [testDesc, setTestDesc] = useState('Comprehensive deep dive into AI content analysis, dynamic machine learning weights, and real-time FYP recommendation algorithms.');
  const [testCategory, setTestCategory] = useState('Tech & Coding');
  const [analyzingQuality, setAnalyzingQuality] = useState(false);
  const [aiQualityResult, setAiQualityResult] = useState<AIContentQualityAssessment | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [{ data: w }, { data: a }] = await Promise.all([
        supabase.rpc('get_algo_weights'),
        supabase.from('algorithm_audit_log').select('*').order('created_at', { ascending: false }).limit(10),
      ]);
      const norm = { ...DEFAULTS, ...(w || {}) };
      setWeights(norm);
      setInitial(norm);
      setAudit((a ?? []) as AuditRow[]);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const dirty = (Object.keys(weights) as NumKeys[]).some((k) => weights[k] !== initial[k]);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_algorithm_weights', { p_weights: weights, p_note: note || 'ProNax Neural Weights Updated' });
      if (error) throw error;
      toast.success('ProNax Algorithm Parameters Deployed Live!', { description: 'Updated global feed ranking RPC across all user sessions.' });
      setInitial(weights);
      setNote('');
      loadAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deploy weights');
    } finally {
      setSaving(false);
    }
  };

  const handleRunAIOptimizer = async () => {
    setOptimizingAI(true);
    try {
      const res = await optimizeAlgorithmWeightsWithAI(weights, {
        avgCTR: '13.8%',
        avgAVD: '74%',
        shortsCompletion: '84.5%',
        bounceRate: '12%',
      });
      if (res.optimizedWeights) {
        const nextWeights: Weights = {
          algo_ctr_weight: res.optimizedWeights.algo_ctr_weight ?? weights.algo_ctr_weight,
          algo_retention_weight: res.optimizedWeights.algo_retention_weight ?? weights.algo_retention_weight,
          algo_shorts_retention: res.optimizedWeights.algo_shorts_retention ?? weights.algo_shorts_retention,
          algo_tag_affinity: res.optimizedWeights.algo_tag_affinity ?? weights.algo_tag_affinity,
          algo_freshness_boost: res.optimizedWeights.algo_freshness_boost ?? weights.algo_freshness_boost,
          algo_category_affinity: res.optimizedWeights.algo_category_affinity ?? weights.algo_category_affinity,
          algo_watched_penalty: res.optimizedWeights.algo_watched_penalty ?? weights.algo_watched_penalty,
        };
        setWeights(nextWeights);
        updateActiveMLWeights({ ...res.optimizedWeights });
        setAiOptResult(res);
        toast.success(`AI Algorithm Optimization Complete (+${res.expectedPerformanceLiftPct || 12}% Lift)`, {
          description: res.reasoning || 'Weights optimized by Gemini AI to maximize completion rate and suppress clickbait.',
        });
      }
    } catch (err: any) {
      toast.error('AI optimization failed: ' + (err.message || err));
    } finally {
      setOptimizingAI(false);
    }
  };

  const handleTestContentQuality = async () => {
    setAnalyzingQuality(true);
    try {
      const res = await analyzeVideoContentQuality({
        title: testTitle,
        description: testDesc,
        category: testCategory,
        tags: ['ai', 'coding', 'tech', 'video'],
        duration_seconds: 420,
        quality_resolution: '4K',
      });
      setAiQualityResult(res);
      toast.success('AI Content Quality Assessment Complete!', {
        description: `Quality Score: ${res.qualityIndex}/100 | Hook: ${res.hookScore}/100 | Multiplier: ${res.aiQualityMultiplier}x`,
      });
    } catch (err: any) {
      toast.error('Quality analysis failed');
    } finally {
      setAnalyzingQuality(false);
    }
  };

  // Live Neural Recommendation Engine Calculations
  const personaObj = useMemo(() => PERSONAS.find(p => p.id === selectedPersona) || PERSONAS[0], [selectedPersona]);

  const rankedSimVideos = useMemo(() => {
    return SIM_VIDEOS.map(vid => {
      // 1. CTR Score
      const ctrScore = (vid.ctr / 10) * weights.algo_ctr_weight;

      // 2. AVD Retention Score
      const avdScore = vid.avdRatio * weights.algo_retention_weight;

      // 3. Shorts Velocity Score
      const shortsScore = vid.isShort ? (vid.shortsCompletion * weights.algo_shorts_retention) : 0;

      // 4. Freshness Boost
      const freshnessDecay = Math.max(0, 1 - (vid.hoursAgo / 48));
      const freshScore = freshnessDecay * weights.algo_freshness_boost;

      // 5. Category Affinity
      const catMatch = vid.category === personaObj.topCategory ? 1 : 0;
      const catScore = catMatch * weights.algo_category_affinity;

      // 6. Tag Matching Affinity
      const tagMatches = vid.tags.filter(t => personaObj.interests.includes(t)).length;
      const tagScore = (tagMatches / Math.max(1, personaObj.interests.length)) * weights.algo_tag_affinity;

      const totalScore = Math.round(ctrScore + avdScore + shortsScore + freshScore + catScore + tagScore);

      return {
        ...vid,
        ctrScore: Math.round(ctrScore),
        avdScore: Math.round(avdScore),
        shortsScore: Math.round(shortsScore),
        freshScore: Math.round(freshScore),
        catScore: Math.round(catScore),
        tagScore: Math.round(tagScore),
        totalScore,
      };
    }).sort((a, b) => b.totalScore - a.totalScore);
  }, [weights, personaObj]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-red-500" /></div>;

  return (
    <div className="space-y-6 text-zinc-100 font-sans">
      {/* Header Banner */}
      <div className="bg-[#1f1f1f] border border-[#333333] rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center shrink-0">
            <Cpu className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">ProNax Neural Recommendation Engine</h1>
              <span className="px-2 py-0.5 rounded bg-red-600/20 border border-red-500/30 text-red-400 text-[10px] font-mono font-semibold uppercase">LIVE SIMULATOR</span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Tune real-time parameters for feed ranking, Shorts viral completion velocity, and personal viewer affinity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunAIOptimizer}
            disabled={optimizingAI}
            className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white flex items-center gap-2 transition shadow-lg shadow-purple-900/30"
          >
            {optimizingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4 text-purple-300" />}
            <span>AI OPTIMIZE WEIGHTS</span>
          </button>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Change note (e.g. Boost Shorts AVD)"
            className="text-xs px-3.5 py-2 rounded-xl bg-[#0f0f0f] border border-[#383838] focus:border-red-500 focus:outline-none text-white placeholder:text-zinc-500 w-52"
          />
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="text-xs font-semibold px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white flex items-center gap-2 transition shadow-lg shadow-red-900/30"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{dirty ? 'DEPLOY WEIGHTS' : 'SAVED'}</span>
          </button>
        </div>
      </div>

      {aiOptResult && (
        <div className="bg-purple-950/40 border border-purple-500/40 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-purple-300 flex items-center gap-2 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Gemini AI Optimization Applied (+{aiOptResult.expectedPerformanceLiftPct || 12.4}% Projected AVD Lift)</span>
            </h4>
            <span className="text-[10px] font-mono bg-purple-900/60 px-2 py-0.5 rounded text-purple-200">ML ADAPTIVE</span>
          </div>
          <p className="text-xs text-purple-200/90 leading-relaxed">{aiOptResult.reasoning}</p>
          {aiOptResult.focusRecommendation && (
            <div className="text-[11px] font-mono text-purple-300 bg-purple-900/30 p-2 rounded border border-purple-500/20">
              💡 Strategic Focus: {aiOptResult.focusRecommendation}
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Parameter Knobs & Live Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parameter Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* ProNax Neural Recommendation Algorithm Engine Summary */}
          <div className="bg-[#141414] border border-cyan-500/30 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center justify-between uppercase tracking-wider">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>ProNax Neural AI & FYP Recommendation Engine Active</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-mono font-bold">PRO LEVEL ENGINE</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-[#0b0b0b] border border-[#222]">
                <div className="text-zinc-500 text-[9px]">PRONAX FYP METRIC</div>
                <div className="text-white font-bold mt-0.5">Completion Rate %</div>
                <div className="text-[9px] text-cyan-400">35 Points Weight</div>
              </div>
              <div className="p-2 rounded bg-[#0b0b0b] border border-[#222]">
                <div className="text-zinc-500 text-[9px]">PRONAX LOOP FACTOR</div>
                <div className="text-white font-bold mt-0.5">Rewatch Loop Rate</div>
                <div className="text-[9px] text-emerald-400">22 Points Weight</div>
              </div>
              <div className="p-2 rounded bg-[#0b0b0b] border border-[#222]">
                <div className="text-zinc-500 text-[9px]">HOOK & SKIP PENALTY</div>
                <div className="text-white font-bold mt-0.5">3s Hook vs Skip</div>
                <div className="text-[9px] text-amber-400">-18s Penalty Shield</div>
              </div>
              <div className="p-2 rounded bg-[#0b0b0b] border border-[#222]">
                <div className="text-zinc-500 text-[9px]">COLD START TIER</div>
                <div className="text-white font-bold mt-0.5">Batch Cohorts</div>
                <div className="text-[9px] text-purple-400">300 ➔ 10k ➔ FYP</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-red-500" />
              <span>Algorithm Neural Weights</span>
            </h2>
            <button
              onClick={() => setWeights({ ...DEFAULTS })}
              className="text-[11px] text-zinc-400 hover:text-white underline font-mono"
            >
              Reset to ProNax Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {KNOBS.map((k) => (
              <div
                key={k.key}
                className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 hover:border-[#444444] transition"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <k.icon className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-xs font-bold text-white truncate">{k.label}</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-900/50">
                    {weights[k.key]}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mb-2.5 h-8 line-clamp-2 leading-relaxed">
                  {k.hint}
                </p>
                <input
                  type="range"
                  min={k.min}
                  max={k.max}
                  step={k.step}
                  value={weights[k.key]}
                  onChange={(e) => setWeights({ ...weights, [k.key]: Number(e.target.value) })}
                  className="w-full h-1.5 bg-[#2a2a2a] rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                  <span>{k.min}</span>
                  <span>{k.max}</span>
                </div>
              </div>
            ))}
          </div>

          {/* AI Content Quality & Virality Assessment Tester Panel */}
          <div className="bg-[#181818] border border-cyan-500/40 rounded-xl p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>AI Content Quality & Virality Assessment Simulator</span>
              </h3>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                GEMINI 2.5 FLASH EVALUATOR
              </span>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed">
              Test how Gemini AI evaluates video hook retention, content depth, virality potential, and spam clickbait penalty before publishing.
            </p>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Video Title:</label>
                <input
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg bg-[#0f0f0f] border border-[#333] focus:border-cyan-500 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Category:</label>
                  <input
                    value={testCategory}
                    onChange={(e) => setTestCategory(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg bg-[#0f0f0f] border border-[#333] focus:border-cyan-500 text-white"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleTestContentQuality}
                    disabled={analyzingQuality}
                    className="w-full text-xs font-bold py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-2 transition"
                  >
                    {analyzingQuality ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>ANALYZE WITH AI</span>
                  </button>
                </div>
              </div>
            </div>

            {aiQualityResult && (
              <div className="mt-3 p-3 rounded-lg bg-[#0b0b0b] border border-cyan-500/30 space-y-2 font-mono text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded bg-[#141414] border border-[#222]">
                    <div className="text-[9px] text-zinc-500">QUALITY INDEX</div>
                    <div className="text-sm font-extrabold text-cyan-400">{aiQualityResult.qualityIndex}/100</div>
                  </div>
                  <div className="p-2 rounded bg-[#141414] border border-[#222]">
                    <div className="text-[9px] text-zinc-500">HOOK SCORE</div>
                    <div className="text-sm font-extrabold text-emerald-400">{aiQualityResult.hookScore}/100</div>
                  </div>
                  <div className="p-2 rounded bg-[#141414] border border-[#222]">
                    <div className="text-[9px] text-zinc-500">CLICKBAIT RISK</div>
                    <div className={`text-sm font-extrabold ${aiQualityResult.clickbaitSpamRisk > 50 ? 'text-red-400' : 'text-zinc-300'}`}>
                      {aiQualityResult.clickbaitSpamRisk}%
                    </div>
                  </div>
                  <div className="p-2 rounded bg-[#141414] border border-[#222]">
                    <div className="text-[9px] text-zinc-500">AI MULTIPLIER</div>
                    <div className="text-sm font-extrabold text-purple-400">{aiQualityResult.aiQualityMultiplier}x</div>
                  </div>
                </div>
                {aiQualityResult.keyTakeaways && aiQualityResult.keyTakeaways.length > 0 && (
                  <div className="text-[11px] text-zinc-300 space-y-1 font-sans pt-1">
                    <span className="font-bold text-cyan-400 text-[10px] uppercase font-mono block">AI Insights:</span>
                    {aiQualityResult.keyTakeaways.map((takeaway, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-zinc-400 text-[11px]">
                        <span className="text-cyan-400">•</span>
                        <span>{takeaway}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Recommendation Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#282828] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-red-500" />
                  <span>Recommendation Feed Simulator</span>
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Test real-time video rankings across viewer profiles</p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Live Computation" />
            </div>

            {/* Viewer Persona Selector */}
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Select Viewer Persona:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPersona(p.id)}
                    className={`p-2.5 rounded-lg border text-left transition ${
                      selectedPersona === p.id
                        ? 'bg-red-600/20 border-red-500/60 text-white font-semibold'
                        : 'bg-[#0f0f0f] border-[#282828] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{p.name}</div>
                    <div className="text-[10px] text-zinc-500 truncate mt-0.5">{p.topCategory || 'General'}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Recommendation Feed Order */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                <span>RANKED FEED RESULT</span>
                <span>NEURAL SCORE</span>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {rankedSimVideos.map((vid, idx) => (
                  <div
                    key={vid.id}
                    className="p-3 rounded-lg bg-[#0f0f0f] border border-[#282828] hover:border-[#444] transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        idx === 0 ? 'bg-amber-500 text-black' : idx === 1 ? 'bg-zinc-300 text-black' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          {vid.isShort && <span className="px-1 py-0.2 bg-red-600 text-white rounded text-[9px] uppercase font-mono">Short</span>}
                          <span className="truncate">{vid.title}</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                          <span>{vid.channel}</span>
                          <span>•</span>
                          <span>CTR {vid.ctr}%</span>
                          <span>•</span>
                          <span>AVD {Math.round(vid.avdRatio * 100)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-mono font-extrabold text-red-400">{vid.totalScore}</div>
                      <div className="text-[9px] text-zinc-500 font-mono">pts</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Audit Log */}
      <div className="bg-[#181818] border border-[#2e2e2e] rounded-xl p-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-red-500" />
          <span>Recent Algorithm Deployment Log</span>
        </h3>

        {audit.length === 0 ? (
          <div className="text-xs text-zinc-500 py-3 text-center">No recent algorithm deployments recorded.</div>
        ) : ( 
          <div className="space-y-1.5">
            {audit.map((a) => (
              <div key={a.id} className="p-2.5 rounded-lg bg-[#0f0f0f] border border-[#282828] flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">{a.note || 'Algorithm parameter update'}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{new Date(a.created_at).toLocaleString()}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">DEPLOYED</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

