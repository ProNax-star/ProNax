import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Copy, Check, Users, Video, Wallet, Sparkles,
  Mail, Award, CheckCircle2, Ban, RefreshCw, Key
} from 'lucide-react';
import { toast } from 'sonner';
import { generateUniqueUserId } from '@/lib/videoFingerprint';

export interface UserProfile3DProps {
  user: {
    id: string;
    email: string;
    display_name: string;
    handle: string;
    avatar_url?: string;
    role?: 'admin' | 'creator' | 'user';
    upload_limit_mb?: number;
    status?: 'active' | 'suspended' | 'flagged';
    is_banned?: boolean;
    is_verified?: boolean;
    subscribers_count?: number;
    videos_count?: number;
    created_at?: string;
    wallet_balance?: number;
    unique_user_id?: string;
  };
  onActionClick?: (action: 'ban' | 'unban' | 'limit' | 'role' | 'verify') => void;
  className?: string;
}

export function UserProfileCard3D({ user, onActionClick, className = '' }: UserProfile3DProps) {
  const [copiedId, setCopiedId] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });

  const uniqueId = user.unique_user_id || generateUniqueUserId(user.email || user.handle || user.id);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = -((y - centerY) / centerY) * 12; // tilt max 12 deg
    const rotY = ((x - centerX) / centerX) * 12;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const copyUserId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(uniqueId);
    setCopiedId(true);
    toast.success('Unique User ID copied to clipboard!', {
      description: uniqueId,
    });
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div style={{ perspective: 1000 }} className={`w-full ${className}`}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        animate={{
          rotateX,
          rotateY,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative rounded-3xl p-6 bg-slate-900/90 border border-cyan-500/30 backdrop-blur-xl shadow-2xl overflow-hidden group transition-all duration-200"
        style={{
          boxShadow: '0 20px 50px -10px rgba(6, 182, 212, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Holographic Glare Overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
          style={{
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(6, 182, 212, 0.25) 0%, rgba(168, 85, 247, 0.15) 45%, transparent 80%)`,
          }}
        />

        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500" />

        <div className="relative z-20 space-y-4">
          {/* Header Row: Badge & Role */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] font-bold flex items-center gap-1 shadow-sm">
                <Key className="w-3 h-3 text-cyan-400" />
                {uniqueId}
              </span>
              <button
                onClick={copyUserId}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                title="Copy User ID"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {user.role === 'admin' && (
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Admin
                </span>
              )}
              {user.role === 'creator' && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                  <Award className="w-3 h-3" /> Creator
                </span>
              )}
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  user.is_banned
                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                    : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                }`}
              >
                {user.is_banned ? 'Banned' : 'Active'}
              </span>
            </div>
          </div>

          {/* User Info & Avatar */}
          <div className="flex items-center gap-4 pt-1">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-0.5 shadow-xl shadow-cyan-500/20">
                <img
                  src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.handle || user.display_name)}`}
                  alt={user.display_name}
                  className="w-full h-full rounded-[14px] object-cover bg-slate-950"
                />
              </div>
              {user.is_verified && (
                <div className="absolute -bottom-1 -right-1 p-1 bg-cyan-500 text-slate-950 rounded-full ring-2 ring-slate-900 shadow-md" title="Verified Creator">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 truncate">
                {user.display_name}
                {user.is_verified && <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />}
              </h3>
              <p className="text-xs text-cyan-300 font-mono">{user.handle}</p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                <Mail className="w-3 h-3 shrink-0 text-slate-500" /> {user.email}
              </p>
            </div>
          </div>

          {/* 3D Stat Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium flex items-center justify-center gap-1">
                <Users className="w-3 h-3 text-cyan-400" /> Subs
              </p>
              <p className="text-sm font-bold font-mono text-white mt-0.5">
                {(user.subscribers_count ?? 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium flex items-center justify-center gap-1">
                <Video className="w-3 h-3 text-blue-400" /> Videos
              </p>
              <p className="text-sm font-bold font-mono text-white mt-0.5">
                {user.videos_count ?? 0}
              </p>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium flex items-center justify-center gap-1">
                <Wallet className="w-3 h-3 text-emerald-400" /> Balance
              </p>
              <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                ${(user.wallet_balance ?? 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Copyright Cleanliness Bar */}
          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Copyright Trust Score
            </span>
            <span className="font-mono font-bold text-emerald-400">99.8% Clean</span>
          </div>

          {/* Quick Admin Actions if callback provided */}
          {onActionClick && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onActionClick(user.is_banned ? 'unban' : 'ban')}
                className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  user.is_banned
                    ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30'
                }`}
              >
                {user.is_banned ? <RefreshCw className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                {user.is_banned ? 'Unban Account' : 'Ban Account'}
              </button>

              <button
                onClick={() => onActionClick('verify')}
                className="py-1.5 px-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {user.is_verified ? 'Unverify' : 'Verify'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
