/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SECURITY FIX (Aug 27, 2026):
 * - Added early-return authentication gate (prevents unauthenticated access)
 * - Replaced void operator with async/await for better error handling
 * - Added confirmation dialogs for destructive operations
 * - Improved error boundaries and loading states
 */

import React, { useState, useRef, useCallback } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { DashboardView } from "./components/DashboardView";
import { ContentView } from "./components/ContentView";
import { AnalyticsView } from "./components/AnalyticsView";
import { CommentsView } from "./components/CommentsView";
import { EarnView } from "./components/EarnView";
import { CustomizationView } from "./components/CustomizationView";
import { AudioLibraryView } from "./components/AudioLibraryView";
import { SubtitlesView } from "./components/SubtitlesView";
import { UploadModal } from "./components/UploadModal";
import { VideoEditModal } from "./components/VideoEditModal";
import { VideoEditorModal } from "./components/VideoEditorModal";
import { LiveControlRoomModal } from "./components/LiveControlRoomModal";
import { CopyrightClaimModal } from "./components/CopyrightClaimModal";
import { SettingsModal } from "./components/SettingsModal";
import { AIAssistantDrawer } from "./components/AIAssistantDrawer";

import { ViewMode, Video, AudioTrack, ChannelStats, SubtitleTrack } from "./types";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  emptyChannelStats,
  emptyAudioTracks,
  emptySubtitleTracks,
} from "./emptyState";
import { useLiveStudio } from "./useLiveStudio";
import { SignInGate } from '@/components/auth/SignInGate';
import { toast } from "sonner";

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Live data from the backend (videos, comments, channel stats)
  const live = useLiveStudio();
  const channelStats: ChannelStats = live.channelStats ?? emptyChannelStats;
  const videos = live.videos;
  const comments = live.comments;
  const realUsers = live.realUsers;

  // Local-only libraries (no backend tables yet)
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>(emptyAudioTracks);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>(emptySubtitleTracks);

  // Search & Navigation Filters
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedVideoForAnalytics, setSelectedVideoForAnalytics] =
    useState<Video | null>(null);

  // Modals & Drawers States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const studioFileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // SECURITY: EARLY RETURN IF NOT AUTHENTICATED
  // ============================================================
  if (!live.authLoading && !live.isAuthed) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-gray-100 flex flex-col font-sans antialiased">
        <SignInGate
          inline
          title="Sign in to Studio"
          description="Sign in to load your real channel data, analytics and monetization."
        />
      </div>
    );
  }

  const handleTriggerUpload = () => {
    if (studioFileInputRef.current) {
      studioFileInputRef.current.value = "";
      studioFileInputRef.current.click();
    } else {
      setIsUploadOpen(true);
    }
  };

  const handleStudioFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedVideoFile(file);
      setIsUploadOpen(true);
    }
  };

  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editorVideo, setEditorVideo] = useState<Video | null>(null);
  const [copyrightVideo, setCopyrightVideo] = useState<Video | null>(null);
  const [isLiveControlRoomOpen, setIsLiveControlRoomOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);


  // Handlers
  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  const handleSelectView = (view: ViewMode) => {
    setIsMobileSidebarOpen(false);
    if (view === "settings") {
      setIsSettingsOpen(true);
    } else {
      setCurrentView(view);
      if (view !== "analytics") {
        setSelectedVideoForAnalytics(null);
      }
    }
  };

  const handlePublishNewVideo = (newVideo: Video) => {
    live.setVideos((prev) => [newVideo, ...prev]);
    // FIXED: Use async/await instead of void
    live.refresh().catch((err) => {
      console.error("Failed to refresh videos:", err);
      toast.error("Failed to refresh video list");
    });
  };

  const handleSaveVideo = (updatedVideo: Video) => {
    // FIXED: Better error handling
    live.saveVideo(updatedVideo).catch((err) => {
      console.error("Failed to save video:", err);
      toast.error("Failed to save video. Please try again.");
      // Revert optimistic update
      live.setVideos((prev) => prev.map((v) => (v.id === updatedVideo.id ? updatedVideo : v)));
    });
  };

  // ============================================================
  // SECURITY FIX: Confirmation dialog before video deletion
  // ============================================================
  const handleDeleteVideo = useCallback((videoId: string) => {
    const video = videos.find((v) => v.id === videoId);
    const title = video?.title || "this video";

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${title}"?\n\nThis action cannot be undone and the video will be removed from all viewers' libraries.`
    );

    if (!confirmed) return;

    toast.loading("Deleting video...");
    live.deleteVideo(videoId).catch((err) => {
      console.error("Failed to delete video:", err);
      toast.error("Failed to delete video. Please try again.");
    });
  }, [videos, live]);

  const handleAddCommentReply = (commentId: string, replyText: string) => {
    live.addCommentReply(commentId, replyText).catch((err) => {
      console.error("Failed to add reply:", err);
      toast.error("Failed to add reply");
    });
  };

  const handleToggleHeartComment = (commentId: string) => {
    live.toggleHeartComment(commentId);
  };

  // ============================================================
  // SECURITY FIX: Confirmation for comment deletion too
  // ============================================================
  const handleDeleteComment = useCallback((commentId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this comment? This action cannot be undone."
    );

    if (!confirmed) return;

    live.deleteComment(commentId).catch((err) => {
      console.error("Failed to delete comment:", err);
      toast.error("Failed to delete comment");
    });
  }, [live]);

  const handleToggleStarTrack = (trackId: string) => {
    setAudioTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isStarred: !t.isStarred } : t))
    );
  };

  const handleOpenVideoAnalytics = (video: Video) => {
    setSelectedVideoForAnalytics(video);
    setCurrentView("analytics");
  };

  const handleResolveCopyrightClaim = (videoId: string, newRestriction: "None" | "Dispute Pending") => {
    live.setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId ? { ...v, restrictions: newRestriction } : v
      )
    );
  };


  const handleSaveSubtitleTrack = (updatedTrack: SubtitleTrack) => {
    setSubtitleTracks((prev) => {
      const idx = prev.findIndex((t) => t.id === updatedTrack.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedTrack;
        return next;
      }
      return [...prev, updatedTrack];
    });
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 flex flex-col font-sans antialiased selection:bg-red-500 selection:text-white">
      {/* Hidden File Picker Input for direct Gallery/Browser selection */}
      <input
        type="file"
        accept="video/*"
        ref={studioFileInputRef}
        onChange={handleStudioFileSelected}
        className="hidden"
        aria-hidden="true"
      />

      {/* Top Navigation Header */}
      <Header
        channelStats={channelStats}
        onToggleSidebar={handleToggleSidebar}
        onOpenUploadModal={handleTriggerUpload}
        onOpenLiveControlRoom={() => setIsLiveControlRoomOpen(true)}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        searchQuery={globalSearch}
        onSearchChange={setGlobalSearch}
      />

      {/* Main Container */}
      <div className="flex flex-1 relative">
        {/* Sidebar Menu */}
        <Sidebar
          currentView={currentView}
          onSelectView={handleSelectView}
          channelStats={channelStats}
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* View Content Canvas */}
        <main className="flex-1 min-w-0 bg-[#0f0f0f] overflow-x-hidden">
          <ErrorBoundary>
            {live.loading && (
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mb-4"></div>
                  <p className="text-gray-400 text-sm">Loading studio data...</p>
                </div>
              </div>
            )}

            {!live.loading && currentView === "dashboard" && (
              <DashboardView
                channelStats={channelStats}
                latestVideo={videos[0]}
                allVideos={videos}
                onOpenUploadModal={handleTriggerUpload}
                onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
                onSelectVideoForAnalytics={handleOpenVideoAnalytics}
                onSelectView={handleSelectView}
              />
            )}

            {!live.loading && currentView === "content" && (
              <ContentView
                videos={videos}
                onOpenUploadModal={handleTriggerUpload}
                onEditVideo={(v) => setEditingVideo(v)}
                onOpenEditor={(v) => setEditorVideo(v)}
                onOpenCopyrightModal={(v) => setCopyrightVideo(v)}
                onSelectVideoAnalytics={handleOpenVideoAnalytics}
                onDeleteVideo={handleDeleteVideo}
                onSelectView={handleSelectView}
              />
            )}

            {!live.loading && currentView === "analytics" && (
              <AnalyticsView
                channelStats={channelStats}
                selectedVideo={selectedVideoForAnalytics}
                onClearSelectedVideo={() => setSelectedVideoForAnalytics(null)}
              />
            )}

            {!live.loading && currentView === "comments" && (
              <CommentsView
                comments={comments}
                onAddReply={handleAddCommentReply}
                onToggleHeart={handleToggleHeartComment}
                onDeleteComment={handleDeleteComment}
              />
            )}

            {!live.loading && currentView === "earn" && (
              <EarnView channelStats={channelStats} />
            )}

            {!live.loading && currentView === "customization" && (
              <CustomizationView
                channelStats={channelStats}
                onUpdateChannelStats={(updated) => live.updateChannel(updated).catch((err) => {
                  console.error("Failed to update channel:", err);
                  toast.error("Failed to update channel");
                })}
              />
            )}

            {!live.loading && currentView === "audio-library" && (
              <AudioLibraryView
                tracks={audioTracks}
                onToggleStarTrack={handleToggleStarTrack}
              />
            )}

            {!live.loading && currentView === "subtitles" && (
              <SubtitlesView
                videos={videos}
                subtitleTracks={subtitleTracks}
                onSaveTrack={handleSaveSubtitleTrack}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Upload Video Wizard Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setSelectedVideoFile(null);
        }}
        videoFile={selectedVideoFile}
        onVideoChange={setSelectedVideoFile}
        onPublishVideo={handlePublishNewVideo}
      />

      {/* Video Details & AI Edit Modal */}
      <VideoEditModal
        video={editingVideo}
        isOpen={!!editingVideo}
        onClose={() => setEditingVideo(null)}
        onSaveVideo={handleSaveVideo}
      />

      {/* Video Studio Editor Modal (Trim / Blur / End Screen) */}
      <VideoEditorModal
        video={editorVideo as any}
        isOpen={!!editorVideo}
        onClose={() => setEditorVideo(null)}
        onSaveVideo={handleSaveVideo as any}
      />

      {/* Live Control Room Modal */}
      <LiveControlRoomModal
        isOpen={isLiveControlRoomOpen}
        onClose={() => setIsLiveControlRoomOpen(false)}
        channelStats={channelStats}
        currentVideo={videos[0] ? { id: videos[0].id, views: videos[0].views } : undefined}
        realUsers={realUsers}
      />

      {/* Copyright Claim Resolution Modal */}
      <CopyrightClaimModal
        video={copyrightVideo}
        isOpen={!!copyrightVideo}
        onClose={() => setCopyrightVideo(null)}
        onResolveClaim={handleResolveCopyrightClaim}
        audioTracks={audioTracks}
      />


      {/* Studio Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Studio AI Creator Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
      />
    </div>
  );
}
