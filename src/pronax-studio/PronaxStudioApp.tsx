/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
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
  initialChannelStats,
  initialAudioTracks,
  initialSubtitleTracks,
} from "./mockData";
import { useLiveStudio } from "./useLiveStudio";

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Live data from the backend (videos, comments, channel stats)
  const live = useLiveStudio();
  const channelStats: ChannelStats = live.channelStats ?? initialChannelStats;
  const videos = live.videos;
  const comments = live.comments;
  const realUsers = live.realUsers;

  // Local-only libraries (no backend tables yet)
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>(initialAudioTracks);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>(initialSubtitleTracks);

  // Search & Navigation Filters
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedVideoForAnalytics, setSelectedVideoForAnalytics] =
    useState<Video | null>(null);

  // Modals & Drawers States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const studioFileInputRef = useRef<HTMLInputElement>(null);

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
    void live.refresh();
  };

  const handleSaveVideo = (updatedVideo: Video) => {
    void live.saveVideo(updatedVideo);
  };

  const handleDeleteVideo = (videoId: string) => {
    void live.deleteVideo(videoId);
  };

  const handleAddCommentReply = (commentId: string, replyText: string) => {
    void live.addCommentReply(commentId, replyText);
  };

  const handleToggleHeartComment = (commentId: string) => {
    live.toggleHeartComment(commentId);
  };

  const handleDeleteComment = (commentId: string) => {
    void live.deleteComment(commentId);
  };

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

            {!live.authLoading && !live.isAuthed && (
              <div className="m-4 rounded-lg border border-yellow-600/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
                You are signed out — sign in to load your real channel data.{" "}
                <a href="/auth" className="underline font-medium">Sign in</a>
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
                onUpdateChannelStats={(updated) => void live.updateChannel(updated)}

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
