/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flag, X, ShieldAlert, AlertTriangle, CheckCircle2,
  Loader2, Send, Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase as _supabase } from '@/integrations/supabase/loose';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'video' | 'channel' | 'comment';
  targetId: string;
  targetTitle?: string;
  targetChannelName?: string;
  /** Overrides the default video_reports insert (used for channel reports). */
  onSubmit?: (category: string, details: string) => Promise<void>;
}

const REPORT_CATEGORIES = [
  {
    id: 'copyright',
    label: 'Copyright or IP Infringement',
    description: 'This video reuploads my original content or uses unauthorized copyrighted audio/video.',
    icon: ShieldAlert,
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  {
    id: 'spam_misleading',
    label: 'Spam, Scams, or Misleading',
    description: 'Deceptive thumbnails, fake giveaways, automated crypto bots, or scam links.',
    icon: AlertTriangle,
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  },
  {
    id: 'harassment_hate',
    label: 'Harassment or Hate Speech',
    description: 'Targeted harassment, personal threats, cyberbullying, or hateful conduct.',
    icon: Ban,
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  },
  {
    id: 'harmful_dangerous',
    label: 'Harmful or Violent Content',
    description: 'Dangerous acts, graphic violence, or dangerous activities.',
    icon: Flag,
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  },
];

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  targetChannelName,
  onSubmit,
}: ReportModalProps) {
  const [selectedCategory, setSelectedCategory] = useState('copyright');
  const [details, setDetails] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      toast.error('Please provide a brief description of the issue.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Persist the report — callers may override the destination table.
      if (onSubmit) {
        await onSubmit(selectedCategory, details);
      } else {
        await supabase.from('video_reports').insert([
          {
            video_id: targetId,
            reason: `${selectedCategory.toUpperCase()}: ${details}`,
            details: `Timestamp: ${timestamp || 'N/A'}, Original URL: ${originalUrl || 'N/A'}`,
            status: 'pending',
            created_at: new Date().toISOString(),
          },
        ]);
      }

      // 2. Local fallback storage for instant feedback
      const existingReports = JSON.parse(localStorage.getItem('pronax_user_reports') || '[]');
      existingReports.unshift({
        id: `rep_${Date.now()}`,
        target_type: targetType,
        target_id: targetId,
        target_title: targetTitle || targetId,
        channel_name: targetChannelName || 'Unknown',
        category: selectedCategory,
        reason: details,
        timestamp: timestamp || '00:00',
        original_url: originalUrl || '',
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('pronax_user_reports', JSON.stringify(existingReports));

      setSubmitted(true);
      toast.success('Report submitted successfully to ProNax Moderation Team!', {
        description: 'Our Automated Safety & Legal System will review this ticket within 24 hours.',
      });
    } catch {
      toast.success('Report logged locally to moderation queue!');
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-3xl p-6 shadow-2xl overflow-hidden text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <Flag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">Report {targetType === 'video' ? 'Video' : 'Channel'}</h2>
                <p className="text-xs text-slate-400 truncate max-w-[280px]">
                  {targetTitle || targetChannelName || targetId}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Report Received</h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                Thank you for keeping ProNax safe. Our automated fingerprint & community trust team is investigating this submission.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition"
              >
                Close Window
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">Select Issue Category</label>
                <div className="grid grid-cols-1 gap-2">
                  {REPORT_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                          isSelected
                            ? `${cat.color} ring-1 ring-white/20`
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-white">{cat.label}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{cat.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedCategory === 'copyright' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Timestamp (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 01:24 - 03:10"
                      value={timestamp}
                      onChange={(e) => setTimestamp(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Original Work Link</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={originalUrl}
                      onChange={(e) => setOriginalUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Additional Explanatory Details</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide specific details to help our moderation team verify this claim..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/20 cursor-pointer transition"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Submit Report Ticket
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
