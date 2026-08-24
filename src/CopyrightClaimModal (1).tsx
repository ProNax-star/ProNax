/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React, { useState } from "react";
import {
  X,
  ShieldAlert,
  VolumeX,
  Music,
  Scissors,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { AudioTrack, Video } from "../types";

interface CopyrightClaimModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  onResolveClaim: (videoId: string, newRestriction: "None" | "Dispute Pending") => void;
  /** Real audio-library tracks available as a replacement. */
  audioTracks?: AudioTrack[];
}

export const CopyrightClaimModal: React.FC<CopyrightClaimModalProps> = ({
  video,
  isOpen,
  onClose,
  onResolveClaim,
  audioTracks = [],
}) => {
  // No claim details on the row means we show blanks, never invented values.
  const claim = video?.copyrightClaimDetails || {
    id: "",
    videoId: video?.id ?? "",
    claimedTrack: "—",
    claimOwner: "—",
    claimType: "—",
    timestampRange: "—",
    channelImpact: "—",
    monetizationImpact: "—",
    status: "Active claim" as const,
  };

  const [disputeReason, setDisputeReason] = useState("license");
  const [disputeNotes, setDisputeNotes] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [showAudioLibraryPicker, setShowAudioLibraryPicker] = useState(false);
  const [selectedReplacementTrack, setSelectedReplacementTrack] = useState<string | null>(null);
  const [resolvingAction, setResolvingAction] = useState<string | null>(null);


  const handleAction = (actionName: string) => {
    setResolvingAction(actionName);
    setTimeout(() => {
      onResolveClaim(video?.id ?? '', "None");
      setResolvingAction(null);
      onClose();
    }, 1200);
  };

  const handleSubmitDispute = (e: React.FormEvent) => {
    e.preventDefault();
    setResolvingAction("Submitting dispute...");
    setTimeout(() => {
      onResolveClaim(video?.id ?? '', "Dispute Pending");
      setResolvingAction(null);
      onClose();
    }, 1200);
  };

  if (!isOpen || !video) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-[#333] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col text-gray-100 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2d2d2d] bg-[#222]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold text-white">
              Copyright Claim Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#333] text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Video summary card */}
          <div className="flex items-center gap-4 p-3 bg-[#121212] border border-[#2d2d2d] rounded-xl">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="h-14 w-24 object-cover rounded-lg"
              referrerPolicy="no-referrer"
            />
            <div className="overflow-hidden">
              <h3 className="text-xs font-bold text-white truncate">
                {video.title}
              </h3>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                Video ID: {video.id} | Duration: {video.duration}
              </p>
            </div>
          </div>

          {/* Impact Status Summary Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#141f17] border border-emerald-500/30 rounded-2xl space-y-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Channel Impact
              </span>
              <p className="text-xs font-semibold text-white">Not Affected</p>
              <p className="text-[11px] text-gray-300">
                The Content ID claim on your video doesn't affect your channel status.
              </p>
            </div>

            <div className="p-4 bg-[#231e14] border border-amber-500/30 rounded-2xl space-y-1">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Monetization Impact
              </span>
              <p className="text-xs font-semibold text-white">Ineligible / Revenue Shared</p>
              <p className="text-[11px] text-gray-300">
                Ad revenue from this video is claimed by the copyright owner.
              </p>
            </div>
          </div>

          {/* Claimed Content Details Box */}
          <div className="p-4 bg-[#202020] border border-[#333] rounded-2xl space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider">
              Claimed Content & Timestamps
            </h4>

            <div className="flex items-center justify-between p-3 bg-[#141414] rounded-xl border border-[#2d2d2d]">
              <div>
                <p className="font-bold text-white">{claim.claimedTrack}</p>
                <p className="text-gray-400 text-[11px]">
                  Claimant: <span className="text-gray-200">{claim.claimOwner}</span>
                </p>
              </div>

              <div className="text-right">
                <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {claim.timestampRange}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Resolution Options */}
          {showAudioLibraryPicker ? (
            /* Audio Replacement Drawer */
            <div className="space-y-4 p-4 bg-[#121216] border border-[#2d2d3d] rounded-2xl animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-[#252535] pb-3">
                <div>
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <Music className="h-4 w-4 text-emerald-400" />
                    Automated Royalty-Free Audio Replacement
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Select a track. System will auto-clip it to fit claimed timestamp range <span className="font-mono text-amber-400 font-bold">{claim.timestampRange}</span>.
                  </p>
                </div>
                <button
                  onClick={() => setShowAudioLibraryPicker(false)}
                  className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg bg-[#202028]"
                >
                  Cancel
                </button>
              </div>

              {/* Track Picker Grid */}
              <div className="space-y-2">
                {audioTracks.length === 0 && (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    Your audio library is empty — add tracks to swap the claimed audio.
                  </p>
                )}
                {audioTracks.map((tr) => (
                  <div
                    key={tr.title}
                    onClick={() => setSelectedReplacementTrack(tr.title)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                      selectedReplacementTrack === tr.title
                        ? "bg-emerald-500/15 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                        : "bg-[#1a1a22] border-[#2a2a38] text-gray-300 hover:bg-[#222230]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${selectedReplacementTrack === tr.title ? "bg-emerald-500 text-black" : "bg-[#282836] text-gray-400"}`}>
                        <Music className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs">{tr.title}</p>
                        <p className="text-[10px] text-gray-400">
                          {tr.genre} • {tr.artist} ({tr.duration})
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      selectedReplacementTrack === tr.title
                        ? "bg-emerald-500 text-black font-extrabold"
                        : "bg-[#282838] text-gray-400"
                    }`}>
                      {selectedReplacementTrack === tr.title ? "Selected" : "Select"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Confirmation Banner & Action */}
              {selectedReplacementTrack && (
                <div className="p-3 bg-[#18241c] border border-emerald-500/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Auto-Trim Ready: {selectedReplacementTrack}
                    </span>
                    <span className="text-[10px] font-mono text-gray-300 bg-black/60 px-2 py-0.5 rounded">
                      Range: {claim.timestampRange}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      handleAction(
                        `Auto-clipping "${selectedReplacementTrack}" to timestamp ${claim.timestampRange} & clearing copyright claim...`
                      )
                    }
                    disabled={!!resolvingAction}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs transition-all shadow-lg active:scale-95"
                  >
                    ⚡ APPLY & RESOLVE COPYRIGHT CLAIM
                  </button>
                </div>
              )}

              {resolvingAction && (
                <div className="p-3 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 rounded-xl text-center text-xs font-bold animate-pulse">
                  {resolvingAction}
                </div>
              )}
            </div>
          ) : !showDisputeForm ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Select Resolution Action
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Mute Song */}
                <button
                  onClick={() => handleAction("Muting audio segment...")}
                  disabled={!!resolvingAction}
                  className="p-3 bg-[#222] hover:bg-[#2b2b2b] border border-[#383838] hover:border-red-500/50 rounded-2xl text-left transition-all space-y-1"
                >
                  <div className="flex items-center gap-2 font-bold text-white">
                    <VolumeX className="h-4 w-4 text-red-400" />
                    <span>Mute Song</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Mute only the claimed audio during timestamp {claim.timestampRange}.
                  </p>
                </button>

                {/* Replace Song (Opens Automated Audio Replacement Drawer) */}
                <button
                  onClick={() => setShowAudioLibraryPicker(true)}
                  disabled={!!resolvingAction}
                  className="p-3 bg-[#222] hover:bg-[#2b2b2b] border border-[#383838] hover:border-emerald-500/50 rounded-2xl text-left transition-all space-y-1 group"
                >
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Music className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>Replace Song (Auto-Trim)</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Swap claimed audio with royalty-free Pronax Audio Library music auto-trimmed to {claim.timestampRange}.
                  </p>
                </button>

                {/* Trim Segment */}
                <button
                  onClick={() => handleAction("Trimming out video segment...")}
                  disabled={!!resolvingAction}
                  className="p-3 bg-[#222] hover:bg-[#2b2b2b] border border-[#383838] hover:border-blue-500/50 rounded-2xl text-left transition-all space-y-1"
                >
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Scissors className="h-4 w-4 text-blue-400" />
                    <span>Trim Out Segment</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Automatically cut out segment {claim.timestampRange} from video.
                  </p>
                </button>

                {/* Dispute Claim */}
                <button
                  onClick={() => setShowDisputeForm(true)}
                  disabled={!!resolvingAction}
                  className="p-3 bg-[#222] hover:bg-[#2b2b2b] border border-[#383838] hover:border-purple-500/50 rounded-2xl text-left transition-all space-y-1"
                >
                  <div className="flex items-center gap-2 font-bold text-white">
                    <FileText className="h-4 w-4 text-purple-400" />
                    <span>Submit Dispute</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    If you own rights, licensed track, or qualify under Fair Use.
                  </p>
                </button>
              </div>

              {resolvingAction && (
                <div className="p-3 bg-red-600/20 border border-red-500/40 text-red-400 rounded-xl text-center text-xs font-bold animate-pulse">
                  {resolvingAction}
                </div>
              )}
            </div>
          ) : (
            /* Dispute Form */
            <form onSubmit={handleSubmitDispute} className="space-y-4 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider">
                Submit Copyright Dispute
              </h4>

              <div className="space-y-2">
                <label className="block text-gray-300 font-semibold">
                  Reason for dispute:
                </label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full rounded-xl bg-[#121212] border border-[#333] p-2.5 text-white font-semibold focus:outline-none focus:border-red-500"
                >
                  <option value="license">I have a valid license or written permission</option>
                  <option value="original">I own all copyright to this original content</option>
                  <option value="fairuse">Fair Use (Critique, commentary, news, education)</option>
                  <option value="publicdomain">Public Domain content</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Explanation / Rationale:
                </label>
                <textarea
                  rows={3}
                  value={disputeNotes}
                  onChange={(e) => setDisputeNotes(e.target.value)}
                  placeholder="Provide proof, license number, or explanation..."
                  className="w-full rounded-xl bg-[#121212] border border-[#333] p-2.5 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisputeForm(false)}
                  className="px-4 py-2 bg-[#282828] text-gray-300 font-bold rounded-xl"
                >
                  BACK
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-md"
                >
                  SUBMIT FORMAL DISPUTE
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
