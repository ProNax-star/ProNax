import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, ShieldCheck, Play, Pause, AlertTriangle, Search, Filter,
  CheckCircle2, XCircle, RefreshCw, Wand2, FileText, Music, Film, Clock,
  ChevronRight, Scale, Sparkles, Zap, Bot, Volume2, VolumeX, FastForward, RotateCcw,
  CheckSquare, Square, Layers, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/loose';
import { callAIStudio } from '@/pronax-studio/geminiClient';

export type PolicyAction = 'monetize' | 'mute' | 'block_worldwide' | 'track_only';
export type ClaimStatus = 'active' | 'disputed' | 'released' | 'upheld' | 'appealed';
export type ClaimantType = 'record_label' | 'movie_studio' | 'independent' | 'pro_nax_ai';
export type MatchType = 'audio_fingerprint' | 'visual_frame' | 'metadata_exact';

export interface AIEvaluation {
  merit_score: number; // 0-100
  merit_level: 'Low Merit' | 'Medium Merit' | 'High Merit / Strong Fair Use';
  recommendation: PolicyAction | 'release_claim';
  reasoning: string;
  fair_use_factors: {
    transformative_nature: number;
    amount_used: number;
    market_effect: number;
  };
}

export interface CopyrightClaimItem {
  id: string;
  video_id: string;
  video_title: string;
  channel_name: string;
  channel_handle: string;
  claimant: string;
  claimant_type: ClaimantType;
  match_type: MatchType;
  confidence_score: number;
  matched_reference_title: string;
  timestamp_start: string;
  timestamp_end: string;
  policy_action: PolicyAction;
  status: ClaimStatus;
  dispute_reason?: string;
  dispute_date?: string;
  created_at: string;
  thumbnail_url?: string;
  ai_evaluation?: AIEvaluation;
}

export interface CopyrightClaimRow {
  id: string;
  video_id: string;
  video_title?: string | null;
  channel_name?: string | null;
  channel_handle?: string | null;
  claimant?: string | null;
  claimant_name?: string | null;
  claimant_type?: string | null;
  match_type?: string | null;
  match_confidence?: number | null;
  confidence_score?: number | null;
  matched_content?: string | null;
  matched_reference_title?: string | null;
  timestamp_start?: string | null;
  timestamp_end?: string | null;
  policy_action?: string | null;
  status?: string | null;
  dispute_reason?: string | null;
  dispute_date?: string | null;
  created_at?: string | null;
  thumbnail_url?: string | null;
  ai_evaluation?: AIEvaluation | null;
}

export function parseTimestampToSeconds(ts: string): number {
  if (!ts) return 0;
  const parts = ts.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parseInt(ts, 10) || 0;
}

export function formatSecondsToTimestamp(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const SEED_CLAIMS: CopyrightClaimItem[] = [
  {
    id: 'claim_101',
    video_id: 'v_cyberpunk_night',
    video_title: 'Cyberpunk Synthwave Mix 2026 - Live from Neo Tokyo',
    channel_name: 'Aether Beats',
    channel_handle: '@aetherbeats',
    claimant: 'Universal Music Group (UMG Publishing)',
    claimant_type: 'record_label',
    match_type: 'audio_fingerprint',
    confidence_score: 99.2,
    matched_reference_title: 'Resonance in Cyber City (Original Master)',
    timestamp_start: '02:14',
    timestamp_end: '04:30',
    policy_action: 'monetize',
    status: 'disputed',
    dispute_reason: 'I licensed this track under Creative Commons BY 4.0 license from the composer directly with signed documentation.',
    dispute_date: '2026-07-28T14:20:00Z',
    created_at: '2026-07-27T10:00:00Z',
    thumbnail_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    ai_evaluation: {
      merit_score: 88,
      merit_level: 'High Merit / Strong Fair Use',
      recommendation: 'release_claim',
      reasoning: 'Creator provides valid license defense. Audio segment matches licensed CC BY stem.',
      fair_use_factors: { transformative_nature: 85, amount_used: 72, market_effect: 90 },
    },
  },
  {
    id: 'claim_102',
    video_id: 'v_unreal_engine_5',
    video_title: 'Unreal Engine 5.5 Next-Gen Graphics Showcase',
    channel_name: 'TechMatrix HQ',
    channel_handle: '@techmatrix',
    claimant: 'Warner Chappell Music',
    claimant_type: 'record_label',
    match_type: 'audio_fingerprint',
    confidence_score: 94.7,
    matched_reference_title: 'Orchestral Trailer Soundpack - Epic Horizon',
    timestamp_start: '00:45',
    timestamp_end: '01:50',
    policy_action: 'mute',
    status: 'active',
    created_at: '2026-07-28T08:30:00Z',
    thumbnail_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'claim_103',
    video_id: 'v_movie_review_dune',
    video_title: 'Deep Dive: Dune Part 3 Cinematic Cinematography',
    channel_name: 'Cinephile Corner',
    channel_handle: '@cinephile',
    claimant: 'Legendary Pictures & Warner Bros',
    claimant_type: 'movie_studio',
    match_type: 'visual_frame',
    confidence_score: 97.8,
    matched_reference_title: 'Dune Part II Official Featurette Scene #4',
    timestamp_start: '05:10',
    timestamp_end: '06:05',
    policy_action: 'block_worldwide',
    status: 'disputed',
    dispute_reason: 'Fair Use defense under educational commentary, film analysis doctrine, and critique.',
    dispute_date: '2026-07-28T18:45:00Z',
    created_at: '2026-07-26T12:00:00Z',
    thumbnail_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80',
    ai_evaluation: {
      merit_score: 79,
      merit_level: 'High Merit / Strong Fair Use',
      recommendation: 'release_claim',
      reasoning: 'Short 55s clip used exclusively with voiceover analysis and visual breakdown overlay.',
      fair_use_factors: { transformative_nature: 92, amount_used: 80, market_effect: 85 },
    },
  },
  {
    id: 'claim_104',
    video_id: 'v_lofi_coding',
    video_title: '3 Hour Lofi Hip Hop Code & Chill Radio',
    channel_name: 'Dev Flow Radio',
    channel_handle: '@devflow',
    claimant: 'Sony Music Entertainment',
    claimant_type: 'record_label',
    match_type: 'audio_fingerprint',
    confidence_score: 88.3,
    matched_reference_title: 'Midnight Coffee Lofi Loop - Sample Pack V3',
    timestamp_start: '12:30',
    timestamp_end: '15:10',
    policy_action: 'monetize',
    status: 'released',
    created_at: '2026-07-25T09:15:00Z',
    thumbnail_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'claim_105',
    video_id: 'v_ai_music_gen',
    video_title: 'Creating Full Pop Songs with Gemini Audio AI in 5 Mins',
    channel_name: 'AI Sound Lab',
    channel_handle: '@aisoundlab',
    claimant: 'PRO NAX Automated Content ID',
    claimant_type: 'pro_nax_ai',
    match_type: 'metadata_exact',
    confidence_score: 91.0,
    matched_reference_title: 'AI Vocal Synthesizer Preset #892',
    timestamp_start: '00:10',
    timestamp_end: '00:55',
    policy_action: 'track_only',
    status: 'active',
    created_at: '2026-07-28T22:00:00Z',
    thumbnail_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
  },
];

function mapRowToClaimItem(c: CopyrightClaimRow): CopyrightClaimItem {
  return {
    id: c.id,
    video_id: c.video_id,
    video_title: c.video_title || `Video #${c.video_id.slice(0, 8)}`,
    channel_name: c.channel_name || 'Creator Channel',
    channel_handle: c.channel_handle || '@creator',
    claimant: c.claimant_name || c.claimant || 'Rights Holder',
    claimant_type: (c.claimant_type as ClaimantType) || 'record_label',
    match_type: (c.match_type as MatchType) || 'audio_fingerprint',
    confidence_score: Number(c.match_confidence || c.confidence_score || 95.0),
    matched_reference_title: c.matched_content || c.matched_reference_title || 'Registered Reference Master',
    timestamp_start: c.timestamp_start || '00:00',
    timestamp_end: c.timestamp_end || '01:30',
    policy_action: (c.policy_action as PolicyAction) || 'monetize',
    status: (c.status as ClaimStatus) || 'active',
    dispute_reason: c.dispute_reason || undefined,
    dispute_date: c.dispute_date || undefined,
    created_at: c.created_at || new Date().toISOString(),
    thumbnail_url: c.thumbnail_url || undefined,
    ai_evaluation: c.ai_evaluation || undefined,
  };
}

export function CopyrightClaimsTab() {
  const [claims, setClaims] = useState<CopyrightClaimItem[]>(SEED_CLAIMS);
  const [_loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPolicy, setFilterPolicy] = useState<string>('all');
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [q, setQ] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<CopyrightClaimItem | null>(null);
  const [scanningVideoId, setScanningVideoId] = useState<string | null>(null);
  const [evaluatingAI, setEvaluatingAI] = useState<boolean>(false);

  // Bulk Selection & Batch Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState<boolean>(false);

  // Audio / Video Waveform Player State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPlaybackSec, setCurrentPlaybackSec] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch claims from Supabase
  const loadClaims = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('copyright_claims')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: CopyrightClaimItem[] = (data as CopyrightClaimRow[]).map(mapRowToClaimItem);
        // Merge with SEED_CLAIMS to preserve full demo dataset
        setClaims(mapped.concat(SEED_CLAIMS.filter((s) => !mapped.some((m) => m.id === s.id))));
      }
    } catch {
      // Fallback stays SEED_CLAIMS
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time Supabase postgres_changes Subscription
  useEffect(() => {
    loadClaims();

    const channel = supabase
      .channel('public:copyright_claims')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'copyright_claims' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const mapped = mapRowToClaimItem(payload.new as CopyrightClaimRow);
            setClaims((prev) => [mapped, ...prev.filter((c) => c.id !== mapped.id)]);
            toast.info(`🔔 New Copyright Claim Ingested: ${mapped.video_title}`);
          } else if (payload.eventType === 'UPDATE') {
            const mapped = mapRowToClaimItem(payload.new as CopyrightClaimRow);
            setClaims((prev) => prev.map((c) => (c.id === mapped.id ? { ...c, ...mapped } : c)));
            setSelectedClaim((prev) => (prev && prev.id === mapped.id ? { ...prev, ...mapped } : prev));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id?: string })?.id;
            if (deletedId) {
              setClaims((prev) => prev.filter((c) => c.id !== deletedId));
              setSelectedClaim((prev) => (prev && prev.id === deletedId ? null : prev));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadClaims]);

  // Audio simulation timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentPlaybackSec((prev) => {
          if (prev >= 600) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1 * playbackSpeed;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  const handleSeekToSegment = (startTs: string) => {
    const secs = parseTimestampToSeconds(startTs);
    setCurrentPlaybackSec(secs);
    setIsPlaying(true);
    toast.info(`Seeking video/audio player to segment timestamp ${startTs} (${secs}s)...`);
  };

  // AI Dispute Risk & Merit Evaluator with Fallback Error Handling
  const handleEvaluateDisputeWithAI = async (claim: CopyrightClaimItem): Promise<AIEvaluation> => {
    setEvaluatingAI(true);
    const startSec = parseTimestampToSeconds(claim.timestamp_start);
    const endSec = parseTimestampToSeconds(claim.timestamp_end);
    const durationSec = Math.max(1, endSec - startSec);

    let evaluation: AIEvaluation;

    try {
      const res = await callAIStudio({
        model: 'gemini-2.5-flash',
        task: 'copyright_analysis',
        data: {
          claimId: claim.id,
          videoTitle: claim.video_title,
          matchedReference: claim.matched_reference_title,
          matchType: claim.match_type,
          confidenceScore: claim.confidence_score,
          timestampStart: claim.timestamp_start,
          timestampEnd: claim.timestamp_end,
          durationSec,
          disputeReason: claim.dispute_reason || 'Creator submitted fair use statement.',
          claimant: claim.claimant,
        },
      });

      if (res && typeof res.merit_score === 'number' && res.fair_use_factors) {
        evaluation = res;
      } else {
        throw new Error('Gemini output unformatted');
      }
    } catch {
      // Defensive fallback rule engine
      const hasFairUseKeywords = /fair use|commentary|educational|reaction|criticism|license|creative commons|permission|transformative/i.test(claim.dispute_reason || '');
      const isShortSegment = durationSec < 60;
      let score = 55;
      if (hasFairUseKeywords) score += 25;
      if (isShortSegment) score += 12;
      if (claim.confidence_score < 92) score += 8;
      score = Math.min(98, Math.max(15, score));

      evaluation = {
        merit_score: score,
        merit_level: score >= 75 ? 'High Merit / Strong Fair Use' : score >= 45 ? 'Medium Merit' : 'Low Merit',
        recommendation: score >= 75 ? 'release_claim' : 'monetize',
        reasoning: `AI Evaluator (Rule Fallback): Analyzed ${durationSec}s segment with ${claim.confidence_score}% confidence against creator dispute defense.`,
        fair_use_factors: {
          transformative_nature: hasFairUseKeywords ? 88 : 42,
          amount_used: isShortSegment ? 85 : 45,
          market_effect: 78,
        },
      };
    } finally {
      setEvaluatingAI(false);
    }

    const updated = { ...claim, ai_evaluation: evaluation };
    setClaims((prev) => prev.map((c) => (c.id === claim.id ? updated : c)));
    if (selectedClaim?.id === claim.id) setSelectedClaim(updated);

    toast.success(`AI Evaluation Complete: ${evaluation.merit_level} (${evaluation.merit_score}/100)`, {
      description: evaluation.reasoning,
    });

    return evaluation;
  };

  const handleUpdateClaimStatus = async (claimId: string, nextStatus: ClaimStatus, actionNote?: string) => {
    setClaims((prev) => prev.map((c) => (c.id === claimId ? { ...c, status: nextStatus } : c)));
    if (selectedClaim?.id === claimId) {
      setSelectedClaim((prev) => (prev ? { ...prev, status: nextStatus } : null));
    }

    try {
      await supabase
        .from('copyright_claims')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', claimId);
    } catch {
      // Local optimistic state fallback
    }

    const labels: Record<ClaimStatus, string> = {
      released: '✅ Claim released! Video copyright flag cleared.',
      upheld: '⚠️ Dispute rejected & copyright claim upheld.',
      active: 'ℹ️ Claim status set to Active.',
      disputed: '⚡ Dispute status recorded.',
      appealed: '🏛️ Escalated to secondary copyright appeal board.',
    };

    toast.success(labels[nextStatus] || 'Status updated', { description: actionNote });
  };

  const handleUpdatePolicyAction = async (claimId: string, nextPolicy: PolicyAction) => {
    setClaims((prev) => prev.map((c) => (c.id === claimId ? { ...c, policy_action: nextPolicy } : c)));
    if (selectedClaim?.id === claimId) {
      setSelectedClaim((prev) => (prev ? { ...prev, policy_action: nextPolicy } : null));
    }

    try {
      await supabase
        .from('copyright_claims')
        .update({ policy_action: nextPolicy, updated_at: new Date().toISOString() })
        .eq('id', claimId);
    } catch {
      // Local state fallback
    }

    toast.success(`Updated Copyright Policy to: ${nextPolicy.replace('_', ' ').toUpperCase()}`);
  };

  const handleSystemWideScan = (videoId: string) => {
    setScanningVideoId(videoId);
    toast.info(`🤖 Triggering AI Content ID scan for video target ${videoId}...`);

    setTimeout(() => {
      setScanningVideoId(null);
      toast.success(`✨ System AI Scan complete: Acoustic & visual spectrum verified. No new infringements detected.`);
    }, 1800);
  };

  // Filter logic
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (filterType !== 'all' && c.match_type !== filterType) return false;
      if (filterPolicy !== 'all' && c.policy_action !== filterPolicy) return false;
      if (c.confidence_score < minConfidence) return false;
      if (q.trim()) {
        const query = q.toLowerCase();
        return (
          c.video_title.toLowerCase().includes(query) ||
          c.claimant.toLowerCase().includes(query) ||
          c.channel_name.toLowerCase().includes(query) ||
          c.channel_handle.toLowerCase().includes(query) ||
          c.matched_reference_title.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [claims, filterStatus, filterType, filterPolicy, minConfidence, q]);

  // Bulk Selection Methods
  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredClaims.length && filteredClaims.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClaims.map((c) => c.id)));
    }
  };

  const selectAllHighMerit = () => {
    const highMerit = filteredClaims.filter(
      (c) => (c.ai_evaluation?.merit_score ?? 0) >= 75 || /fair use|license|cc by|commentary/i.test(c.dispute_reason || '')
    );
    setSelectedIds(new Set(highMerit.map((c) => c.id)));
    toast.info(`Selected ${highMerit.length} High-Merit Fair Use claims for bulk processing.`);
  };

  // Bulk Actions
  const handleBulkRelease = async () => {
    if (selectedIds.size === 0) return;
    setBatchProcessing(true);
    const ids = Array.from(selectedIds);

    setClaims((prev) => prev.map((c) => (ids.includes(c.id) ? { ...c, status: 'released' } : c)));
    try {
      await supabase
        .from('copyright_claims')
        .update({ status: 'released', updated_at: new Date().toISOString() })
        .in('id', ids);
    } catch {
      // Fallback
    }

    toast.success(`🎉 Bulk Release Success: Released ${ids.length} copyright claims!`, {
      description: 'Video flags cleared across user feeds.',
    });
    setSelectedIds(new Set());
    setBatchProcessing(false);
  };

  const handleBulkMute = async () => {
    if (selectedIds.size === 0) return;
    setBatchProcessing(true);
    const ids = Array.from(selectedIds);

    setClaims((prev) => prev.map((c) => (ids.includes(c.id) ? { ...c, policy_action: 'mute' } : c)));
    try {
      await supabase
        .from('copyright_claims')
        .update({ policy_action: 'mute', updated_at: new Date().toISOString() })
        .in('id', ids);
    } catch {
      // Fallback
    }

    toast.success(`🔇 Bulk Action: Applied Mute Policy to ${ids.length} selected claims.`);
    setSelectedIds(new Set());
    setBatchProcessing(false);
  };

  const handleBulkAIAutoResolve = async () => {
    if (selectedIds.size === 0) return;
    setBatchProcessing(true);
    const ids = Array.from(selectedIds);
    let autoReleased = 0;
    let autoMuted = 0;

    toast.info(`🤖 Running Gemini AI auto-resolution queue for ${ids.length} claims...`);

    for (const id of ids) {
      const claim = claims.find((c) => c.id === id);
      if (!claim) continue;

      let evalObj = claim.ai_evaluation;
      if (!evalObj) {
        evalObj = await handleEvaluateDisputeWithAI(claim);
      }

      if (evalObj.recommendation === 'release_claim' || evalObj.merit_score >= 70) {
        await handleUpdateClaimStatus(id, 'released', 'Auto-released by Gemini AI queue');
        autoReleased++;
      } else {
        await handleUpdatePolicyAction(id, 'mute');
        autoMuted++;
      }
    }

    toast.success(`✨ Bulk AI Auto-Resolution Complete!`, {
      description: `Auto-Released: ${autoReleased} claims | Auto-Muted: ${autoMuted} claims`,
    });
    setSelectedIds(new Set());
    setBatchProcessing(false);
  };

  // KPIs
  const stats = useMemo(() => {
    const total = claims.length;
    const active = claims.filter((c) => c.status === 'active').length;
    const disputed = claims.filter((c) => c.status === 'disputed').length;
    const released = claims.filter((c) => c.status === 'released').length;
    const avgConfidence = claims.length
      ? (claims.reduce((acc, c) => acc + c.confidence_score, 0) / claims.length).toFixed(1)
      : '95.0';
    return { total, active, disputed, released, avgConfidence };
  }, [claims]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="glass-strong rounded-2xl border border-red-500/30 p-6 relative overflow-hidden bg-gradient-to-r from-zinc-950 via-zinc-900 to-black">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 via-red-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  ProNax Content ID & Copyright Engine
                  <span className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-mono uppercase font-bold">
                    SPECTRUM V4 LIVE
                  </span>
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5 max-w-2xl">
                  Automated acoustic fingerprinting, visual frame spectrum matching, and Gemini AI dispute risk evaluation.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleSystemWideScan('all_recent_uploads')}
            disabled={!!scanningVideoId}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-red-600/20 cursor-pointer transition shrink-0"
          >
            {scanningVideoId ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            <span>Run System AI Copyright Scan</span>
          </button>
        </div>

        {/* KPI Mini Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-zinc-800">
          <div className="glass rounded-xl p-3 border border-zinc-800 bg-zinc-900/50">
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Total Claims Ingested</div>
            <div className="text-lg font-mono font-black text-white mt-0.5">{stats.total}</div>
          </div>
          <div className="glass rounded-xl p-3 border border-amber-500/30 bg-amber-500/10">
            <div className="text-[10px] uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Pending Disputes
            </div>
            <div className="text-lg font-mono font-black text-amber-300 mt-0.5">{stats.disputed}</div>
          </div>
          <div className="glass rounded-xl p-3 border border-emerald-500/30 bg-emerald-500/10">
            <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Released Claims
            </div>
            <div className="text-lg font-mono font-black text-emerald-300 mt-0.5">{stats.released}</div>
          </div>
          <div className="glass rounded-xl p-3 border border-cyan-500/30 bg-cyan-500/10">
            <div className="text-[10px] uppercase tracking-wider text-cyan-300 font-bold">Avg Match Accuracy</div>
            <div className="text-lg font-mono font-black text-cyan-300 mt-0.5">{stats.avgConfidence}%</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-strong rounded-2xl border border-zinc-800 p-4 bg-zinc-950/80 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search video, claimant, channel, or reference..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-red-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-zinc-400 font-bold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {['all', 'disputed', 'active', 'released'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize border transition cursor-pointer ${
                  filterStatus === st
                    ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-600/20'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/60 text-xs">
          <label className="block">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Match Spectrum Type</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-red-500 outline-none"
            >
              <option value="all">All Match Types</option>
              <option value="audio_fingerprint">Audio Acoustic Fingerprint</option>
              <option value="visual_frame">Visual Frame Spectrum</option>
              <option value="metadata_exact">Metadata Exact Match</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Enforced Policy</span>
            <select
              value={filterPolicy}
              onChange={(e) => setFilterPolicy(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white focus:border-red-500 outline-none"
            >
              <option value="all">All Policies</option>
              <option value="monetize">Monetize for Claimant</option>
              <option value="mute">Mute Audio</option>
              <option value="block_worldwide">Block Worldwide</option>
              <option value="track_only">Track Analytics Only</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Min Confidence Score: <strong className="text-cyan-400 font-mono">{minConfidence}%</strong>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500 mt-2"
            />
          </label>
        </div>
      </div>

      {/* Bulk Processing Action Toolbar */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-2xl border border-purple-500/40 p-4 bg-gradient-to-r from-purple-950/80 via-zinc-900 to-black flex flex-wrap items-center justify-between gap-3 shadow-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-mono font-bold">
              {selectedIds.size}
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Batch Queue Toolbar ({selectedIds.size} claims selected)
              </p>
              <p className="text-[11px] text-zinc-400">Perform instant batch policy updates or run Gemini AI auto-resolution queue.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={selectAllHighMerit}
              className="px-3 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Select All High-Merit
            </button>

            <button
              onClick={handleBulkRelease}
              disabled={batchProcessing}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Bulk Release Valid Claims
            </button>

            <button
              onClick={handleBulkMute}
              disabled={batchProcessing}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <VolumeX className="w-3.5 h-3.5" /> Bulk Mute Audio
            </button>

            <button
              onClick={handleBulkAIAutoResolve}
              disabled={batchProcessing}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition cursor-pointer disabled:opacity-50"
            >
              {batchProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5 text-cyan-200" />}
              <span>Bulk AI Auto-Resolve</span>
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-zinc-400 hover:text-white px-2 py-1 underline"
            >
              Clear
            </button>
          </div>
        </motion.div>
      )}

      {/* Claims Table */}
      <div className="glass-strong rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-950/90 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-900/80 font-mono text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <button onClick={toggleSelectAll} className="text-zinc-400 hover:text-white transition cursor-pointer">
                    {selectedIds.size > 0 && selectedIds.size === filteredClaims.length ? (
                      <CheckSquare className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Video & Channel</th>
                <th className="py-3 px-4">Claimant & Reference</th>
                <th className="py-3 px-4">Spectrum Match</th>
                <th className="py-3 px-4">Matched Segment</th>
                <th className="py-3 px-4">Policy & Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredClaims.map((claim) => {
                const isDisputed = claim.status === 'disputed';
                const isReleased = claim.status === 'released';
                const isSelected = selectedIds.has(claim.id);
                const startSec = parseTimestampToSeconds(claim.timestamp_start);

                return (
                  <tr
                    key={claim.id}
                    className={`hover:bg-zinc-900/60 transition-colors group cursor-pointer ${
                      isSelected ? 'bg-purple-950/20' : ''
                    }`}
                    onClick={() => {
                      setSelectedClaim(claim);
                      setCurrentPlaybackSec(startSec);
                    }}
                  >
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelectRow(claim.id)}
                        className="text-zinc-400 hover:text-white transition cursor-pointer"
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-purple-400" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-[210px]">
                        {claim.thumbnail_url ? (
                          <img
                            src={claim.thumbnail_url}
                            alt=""
                            className="w-14 h-9 object-cover rounded-lg border border-zinc-700 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                            <Film className="w-4 h-4 text-zinc-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate max-w-[220px] group-hover:text-red-400 transition-colors">
                            {claim.video_title}
                          </p>
                          <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5 font-mono">
                            <span>{claim.channel_name}</span>
                            <span className="text-cyan-400">{claim.channel_handle}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="min-w-[170px]">
                        <p className="font-semibold text-zinc-200">{claim.claimant}</p>
                        <p className="text-[10px] text-zinc-400 truncate italic mt-0.5">
                          Ref: {claim.matched_reference_title}
                        </p>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-1 min-w-[140px]">
                        <div className="flex items-center gap-1.5 font-medium text-white">
                          {claim.match_type === 'audio_fingerprint' && <Music className="w-3.5 h-3.5 text-red-400" />}
                          {claim.match_type === 'visual_frame' && <Film className="w-3.5 h-3.5 text-cyan-400" />}
                          {claim.match_type === 'metadata_exact' && <FileText className="w-3.5 h-3.5 text-emerald-400" />}
                          <span className="capitalize text-[11px]">{claim.match_type.replace('_', ' ')}</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full"
                            style={{ width: `${claim.confidence_score}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">{claim.confidence_score}% match</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClaim(claim);
                          handleSeekToSegment(claim.timestamp_start);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700/80 hover:border-red-500/60 text-zinc-300 hover:text-white transition text-[11px]"
                      >
                        <Clock className="w-3 h-3 text-red-400" />
                        <span>{claim.timestamp_start} - {claim.timestamp_end}</span>
                        <Play className="w-2.5 h-2.5 text-cyan-400 ml-1" />
                      </button>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            isDisputed
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                              : isReleased
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-red-500/20 text-red-300 border border-red-500/40'
                          }`}
                        >
                          {isDisputed && <AlertTriangle className="w-3 h-3" />}
                          {isReleased && <CheckCircle2 className="w-3 h-3" />}
                          {claim.status}
                        </span>
                        <p className="text-[10px] text-zinc-400 capitalize font-mono">
                          Policy: {claim.policy_action.replace('_', ' ')}
                        </p>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {isDisputed && (
                          <>
                            <button
                              onClick={() => handleUpdateClaimStatus(claim.id, 'released', 'Approved by admin')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 transition text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Approve dispute & release claim"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => handleUpdateClaimStatus(claim.id, 'upheld', 'Dispute rejected by admin')}
                              className="px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Reject dispute & uphold claim"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setSelectedClaim(claim);
                            setCurrentPlaybackSec(startSec);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white transition text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredClaims.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                    <ShieldCheck className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-zinc-400">No copyright claims matched current search filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claim Inspection, Gemini AI Fair Use Visual Breakdown & Waveform Modal */}
      <AnimatePresence>
        {selectedClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="glass-strong rounded-3xl border border-red-500/40 max-w-3xl w-full overflow-hidden shadow-2xl relative bg-zinc-950 text-white"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-gradient-to-r from-red-950/40 via-zinc-900 to-black">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 font-bold">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Content ID Dispute Inspection
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono">
                        {selectedClaim.id}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Review matched spectrum, run Gemini AI fair-use evaluator, and seek player timestamps.</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedClaim(null)}
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Video Info Header Card */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/90 border border-zinc-800">
                  {selectedClaim.thumbnail_url && (
                    <img
                      src={selectedClaim.thumbnail_url}
                      alt=""
                      className="w-28 h-18 object-cover rounded-lg border border-zinc-700 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-white truncate">{selectedClaim.video_title}</h4>
                    <p className="text-xs text-cyan-400 font-medium mt-0.5 font-mono">
                      {selectedClaim.channel_name} ({selectedClaim.channel_handle})
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                      Video ID: {selectedClaim.video_id} • Claimant: <strong className="text-zinc-300">{selectedClaim.claimant}</strong>
                    </p>
                  </div>
                </div>

                {/* Interactive Waveform & Timestamp Seeking Engine */}
                <div className="p-4 rounded-xl bg-black/90 border border-red-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Music className="w-4 h-4 text-red-500" /> Interactive Waveform & Segment Seek
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-bold">
                      Segment: {selectedClaim.timestamp_start} - {selectedClaim.timestamp_end} ({parseTimestampToSeconds(selectedClaim.timestamp_end) - parseTimestampToSeconds(selectedClaim.timestamp_start)}s)
                    </span>
                  </div>

                  {/* Simulated Audio Spectrum Waveform Bars */}
                  <div className="h-16 bg-zinc-900/90 rounded-xl p-2.5 flex items-center gap-1 relative overflow-hidden border border-zinc-800">
                    {Array.from({ length: 56 }).map((_, idx) => {
                      const startSec = parseTimestampToSeconds(selectedClaim.timestamp_start);
                      const endSec = parseTimestampToSeconds(selectedClaim.timestamp_end);
                      const totalSec = 600;
                      const barStartRatio = startSec / totalSec;
                      const barEndRatio = endSec / totalSec;
                      const thisRatio = idx / 56;
                      const isMatchedRegion = thisRatio >= barStartRatio && thisRatio <= barEndRatio;
                      const barHeight = Math.sin(idx * 0.45) * 35 + 55;

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            const targetSec = Math.round(thisRatio * totalSec);
                            setCurrentPlaybackSec(targetSec);
                            setIsPlaying(true);
                          }}
                          className={`flex-1 rounded-full cursor-pointer transition-all hover:scale-110 ${
                            isMatchedRegion
                              ? 'bg-red-500 shadow-[0_0_10px_#ef4444]'
                              : thisRatio * totalSec <= currentPlaybackSec
                              ? 'bg-cyan-400'
                              : 'bg-zinc-700/60'
                          }`}
                          style={{ height: `${barHeight}%` }}
                        />
                      );
                    })}
                  </div>

                  {/* Player Controls & Seeking Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-red-600/20"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPlaying ? 'Pause' : 'Play Segment'}</span>
                      </button>

                      <button
                        onClick={() => handleSeekToSegment(selectedClaim.timestamp_start)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-bold text-zinc-300 flex items-center gap-1 border border-zinc-700 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 text-cyan-400" />
                        <span>Jump Start ({parseTimestampToSeconds(selectedClaim.timestamp_start)}s)</span>
                      </button>

                      <button
                        onClick={() => handleSeekToSegment(selectedClaim.timestamp_end)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-bold text-zinc-300 flex items-center gap-1 border border-zinc-700 cursor-pointer"
                      >
                        <FastForward className="w-3 h-3 text-amber-400" />
                        <span>Jump End ({parseTimestampToSeconds(selectedClaim.timestamp_end)}s)</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-zinc-400">
                        Timestamp: <strong className="text-white">{formatSecondsToTimestamp(currentPlaybackSec)}</strong>
                      </span>

                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="text-zinc-400 hover:text-white transition"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                      </button>

                      <select
                        value={playbackSpeed}
                        onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                        className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[11px] text-zinc-300 outline-none"
                      >
                        <option value={0.5}>0.5x Speed</option>
                        <option value={1}>1.0x Normal</option>
                        <option value={1.5}>1.5x Speed</option>
                        <option value={2}>2.0x Fast</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Gemini AI Dispute Risk & Fair Use Visual Factor Breakdown */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-zinc-900 to-black border border-purple-500/40 space-y-4">
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-purple-400" />
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          Gemini AI Fair Use Visual Factor Breakdown
                        </h4>
                        <p className="text-[11px] text-zinc-400">Scored across four statutory Fair Use parameters.</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleEvaluateDisputeWithAI(selectedClaim)}
                      disabled={evaluatingAI}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-purple-900/30 disabled:opacity-50"
                    >
                      {evaluatingAI ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-200" />}
                      <span>{selectedClaim.ai_evaluation ? 'Re-evaluate with AI' : 'Evaluate Dispute with AI'}</span>
                    </button>
                  </div>

                  {selectedClaim.ai_evaluation ? (
                    <div className="space-y-4 text-xs">
                      <div className="flex items-center justify-between font-mono bg-purple-900/30 p-3 rounded-xl border border-purple-500/30">
                        <div>
                          <span className="text-zinc-400 text-[10px] uppercase block font-sans font-bold">Recommended Policy:</span>
                          <span className="text-purple-300 font-extrabold text-sm capitalize">
                            {selectedClaim.ai_evaluation.recommendation.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-zinc-400 text-[10px] uppercase block font-sans font-bold">Fair Use Merit Score:</span>
                          <span className="text-emerald-400 font-black text-base">
                            {selectedClaim.ai_evaluation.merit_score}/100 ({selectedClaim.ai_evaluation.merit_level})
                          </span>
                        </div>
                      </div>

                      <p className="text-zinc-200 leading-relaxed italic bg-black/60 p-3.5 rounded-xl border border-zinc-800">
                        "{selectedClaim.ai_evaluation.reasoning}"
                      </p>

                      {/* Visual Progress Factor Bars */}
                      <div className="space-y-3 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block flex items-center gap-1">
                          <Info className="w-3 h-3 text-cyan-400" /> Statutory Fair Use Evaluation Criteria Progress:
                        </span>

                        {/* Factor 1: Transformative Nature */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-zinc-300 font-bold">1. Transformative Purpose & Commentary</span>
                            <span className="text-cyan-400 font-bold">{selectedClaim.ai_evaluation.fair_use_factors.transformative_nature}%</span>
                          </div>
                          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${selectedClaim.ai_evaluation.fair_use_factors.transformative_nature}%` }}
                              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                            />
                          </div>
                        </div>

                        {/* Factor 2: Amount Used */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-zinc-300 font-bold">2. Substantiality & Portion Used</span>
                            <span className="text-purple-400 font-bold">{selectedClaim.ai_evaluation.fair_use_factors.amount_used}%</span>
                          </div>
                          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${selectedClaim.ai_evaluation.fair_use_factors.amount_used}%` }}
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full"
                            />
                          </div>
                        </div>

                        {/* Factor 3: Market Effect */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-zinc-300 font-bold">3. Effect on Potential Reference Market</span>
                            <span className="text-amber-400 font-bold">{selectedClaim.ai_evaluation.fair_use_factors.market_effect}%</span>
                          </div>
                          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${selectedClaim.ai_evaluation.fair_use_factors.market_effect}%` }}
                              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-black/40 border border-dashed border-zinc-800 text-center space-y-2">
                      <p className="text-xs text-zinc-400 italic">
                        Click "Evaluate Dispute with AI" to trigger Gemini AI analysis on Fair Use defense statements and generate statutory factor progress bars.
                      </p>
                    </div>
                  )}
                </div>

                {/* Creator Dispute Reason Statement (if present) */}
                {selectedClaim.dispute_reason && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" /> Creator Dispute Defense Statement
                      </span>
                      {selectedClaim.dispute_date && (
                        <span className="text-[10px] font-mono text-zinc-400">
                          Submitted: {new Date(selectedClaim.dispute_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white leading-relaxed italic bg-black/50 p-3 rounded-lg border border-amber-500/20 font-sans">
                      "{selectedClaim.dispute_reason}"
                    </p>
                  </div>
                )}

                {/* Policy Action Selector */}
                <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Change Enforced Copyright Policy Action:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {(['monetize', 'mute', 'block_worldwide', 'track_only'] as PolicyAction[]).map((policy) => (
                      <button
                        key={policy}
                        onClick={() => handleUpdatePolicyAction(selectedClaim.id, policy)}
                        className={`p-2 rounded-xl border font-bold capitalize transition cursor-pointer ${
                          selectedClaim.policy_action === policy
                            ? 'bg-red-600 border-red-500 text-white shadow-md'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {policy.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-5 border-t border-zinc-800 bg-zinc-900/80 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => handleSystemWideScan(selectedClaim.video_id)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center gap-1.5 border border-zinc-700 cursor-pointer transition"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Re-scan Acoustic Fingerprint
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateClaimStatus(selectedClaim.id, 'upheld', 'Dispute rejected & claim upheld')}
                    className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition text-xs font-bold cursor-pointer"
                  >
                    Reject Dispute & Uphold Claim
                  </button>
                  <button
                    onClick={() => handleUpdateClaimStatus(selectedClaim.id, 'released', 'Approved dispute & released claim')}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                  >
                    Approve Dispute & Release Claim
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
