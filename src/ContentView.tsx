/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React, { useState } from "react";
import {
  Search,
  Upload,
  Pencil,
  BarChart2,
  MessageSquare,
  Trash2,
  Globe,
  Lock,
  Link as LinkIcon,
  DollarSign,
  CheckSquare,
  Square,
  Scissors,
  ShieldAlert,
  Captions,
} from "lucide-react";
import { Video, ContentTab } from "../types";

interface ContentViewProps {
  videos: Video[];
  onOpenUploadModal: () => void;
  onEditVideo: (video: Video) => void;
  onOpenEditor?: (video: Video) => void;
  onOpenCopyrightModal?: (video: Video) => void;
  onSelectVideoAnalytics: (video: Video) => void;
  onDeleteVideo: (videoId: string) => void;
  onSelectView: (view: any) => void;
}

export const ContentView: React.FC<ContentViewProps> = ({
  videos,
  onOpenUploadModal,
  onEditVideo,
  onOpenEditor,
  onOpenCopyrightModal,
  onSelectVideoAnalytics,
  onDeleteVideo,
  onSelectView,
}) => {
  const [activeTab, setActiveTab] = useState<ContentTab>("videos");
  const [filterText, setFilterText] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);

  // Filter videos based on tab and search
  const filteredVideos = videos.filter((v) => {
    if (activeTab === "shorts" && !v.isShort) return false;
    if (activeTab === "videos" && v.isShort) return false;

    if (
      filterText &&
      !(v.title ?? '').toLowerCase().includes(filterText.toLowerCase()) &&
      !(v.tags ?? []).some((t) => (t ?? '').toLowerCase().includes(filterText.toLowerCase()))
    ) {
      return false;
    }

    if (visibilityFilter !== "all" && v.visibility !== visibilityFilter) {
      return false;
    }

    return true;
  });

  const toggleSelectAll = () => {
    if (selectedVideoIds.length === filteredVideos.length) {
      setSelectedVideoIds([]);
    } else {
      setSelectedVideoIds(filteredVideos.map((v) => v.id));
    }
  };

  const toggleSelectVideo = (id: string) => {
    if (selectedVideoIds.includes(id)) {
      setSelectedVideoIds(selectedVideoIds.filter((vId) => vId !== id));
    } else {
      setSelectedVideoIds([...selectedVideoIds, id]);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 text-gray-100 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Channel content
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage your uploaded videos, Shorts, live streams, and playlists.
          </p>
        </div>

        <button
          onClick={onOpenUploadModal}
          className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95"
          id="content-upload-video-btn"
        >
          <Upload className="h-4 w-4" />
          <span>UPLOAD VIDEOS</span>
        </button>
      </div>

      {/* Navigation Tabs (Videos, Shorts, Live, Playlists) */}
      <div className="flex items-center border-b border-[#2d2d2d] gap-6 text-sm font-semibold text-gray-400 select-none overflow-x-auto">
        {(["videos", "shorts", "live", "playlists"] as ContentTab[]).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 capitalize transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "text-red-500 border-b-2 border-red-500 font-bold"
                  : "hover:text-gray-200"
              }`}
              id={`content-tab-${tab}`}
            >
              {tab}
            </button>
          )
        )}
      </div>

      {/* Filters and Batch Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1f1f1f] p-3 rounded-2xl border border-[#2d2d2d]">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter by title or tag..."
              className="w-full rounded-xl bg-[#141414] border border-[#333] py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
              id="content-filter-input"
            />
          </div>

          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="rounded-xl bg-[#141414] border border-[#333] py-2 px-3 text-xs text-gray-300 focus:border-red-500 focus:outline-none"
          >
            <option value="all">All Visibilities</option>
            <option value="Public">Public</option>
            <option value="Unlisted">Unlisted</option>
            <option value="Private">Private</option>
          </select>
        </div>

        {selectedVideoIds.length > 0 && (
          <div className="flex items-center gap-2 text-xs bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-xl font-semibold">
            <span>{selectedVideoIds.length} selected</span>
            <button
              onClick={() => {
                if (
                  confirm(
                    `Are you sure you want to delete ${selectedVideoIds.length} video(s)?`
                  )
                ) {
                  selectedVideoIds.forEach((id) => onDeleteVideo(id));
                  setSelectedVideoIds([]);
                }
              }}
              className="ml-2 hover:underline text-red-300"
            >
              Delete selected
            </button>
          </div>
        )}
      </div>

      {/* Desktop Content Table View */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#2d2d2d] bg-[#1a1a1a] shadow-lg">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#2d2d2d] bg-[#212121] text-gray-400 font-bold uppercase tracking-wider select-none">
              <th className="p-3 w-10">
                <button
                  onClick={toggleSelectAll}
                  className="text-gray-400 hover:text-white"
                >
                  {selectedVideoIds.length === filteredVideos.length &&
                  filteredVideos.length > 0 ? (
                    <CheckSquare className="h-4 w-4 text-red-500" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="p-3">Video</th>
              <th className="p-3 w-28">Visibility</th>
              <th className="p-3 w-24">Monetization</th>
              <th className="p-3 w-28">Restrictions</th>
              <th className="p-3 w-28">Date</th>
              <th className="p-3 w-24">Views</th>
              <th className="p-3 w-24">Comments</th>
              <th className="p-3 w-28">Likes (vs dislikes)</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#282828] text-gray-200">
            {filteredVideos.length > 0 ? (
              filteredVideos.map((video) => {
                const isSelected = selectedVideoIds.includes(video.id);
                return (
                  <tr
                    key={video.id}
                    className={`group hover:bg-[#222222] transition-colors ${
                      isSelected ? "bg-[#282020]" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3 align-middle">
                      <button
                        onClick={() => toggleSelectVideo(video.id)}
                        className="text-gray-400 hover:text-white"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-red-500" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>

                    {/* Video Thumbnail & Title + Row Hover Action Bar */}
                    <td className="p-3 align-top max-w-sm">
                      <div className="flex gap-3">
                        <div className="relative h-16 w-28 shrink-0 rounded-lg overflow-hidden bg-black border border-[#333]">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] font-bold px-1 rounded backdrop-blur-sm">
                            {video.duration}
                          </span>
                        </div>

                        <div className="flex flex-col justify-between overflow-hidden">
                          <div>
                            <h2 className="font-bold text-white line-clamp-1 group-hover:text-red-400 transition-colors">
                              {video.title}
                            </h2>
                            <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                              {video.description}
                            </p>
                          </div>

                          {/* Quick Actions (Always visible on mobile touch, hover on desktop) */}
                          <div className="flex items-center gap-1.5 mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onEditVideo(video)}
                              className="p-1 rounded hover:bg-[#333] text-gray-300 hover:text-white"
                              title="Edit Video Details"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {onOpenEditor && (
                              <button
                                onClick={() => onOpenEditor(video)}
                                className="p-1 rounded hover:bg-[#333] text-red-400 hover:text-red-300"
                                title="Video Editor (Trim, Blur, End Screen)"
                              >
                                <Scissors className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => onSelectView("subtitles")}
                              className="p-1 rounded hover:bg-[#333] text-blue-400 hover:text-blue-300"
                              title="Subtitles Editor"
                            >
                              <Captions className="h-3.5 w-3.5" />
                            </button>
                            {onOpenCopyrightModal && (
                              <button
                                onClick={() => onOpenCopyrightModal(video)}
                                className={`p-1 rounded hover:bg-[#333] ${video.restrictions && video.restrictions !== 'None' ? 'text-red-400' : 'text-amber-400 hover:text-amber-300'}`}
                                title={`Copyright Status: ${video.restrictions || 'None'}`}
                              >
                                <ShieldAlert className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => onSelectVideoAnalytics(video)}
                              className="p-1 rounded hover:bg-[#333] text-gray-300 hover:text-white"
                              title="Analytics"
                            >
                              <BarChart2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onSelectView("comments")}
                              className="p-1 rounded hover:bg-[#333] text-gray-300 hover:text-white"
                              title="Comments"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteVideo(video.id)}
                              className="p-1 rounded hover:bg-[#333] text-rose-400 hover:text-rose-300"
                              title="Delete Video"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Visibility */}
                    <td className="p-3 align-middle">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {video.visibility === "Public" && (
                          <>
                            <Globe className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Public</span>
                          </>
                        )}
                        {video.visibility === "Unlisted" && (
                          <>
                            <LinkIcon className="h-3.5 w-3.5 text-amber-400" />
                            <span className="text-amber-400">Unlisted</span>
                          </>
                        )}
                        {video.visibility === "Private" && (
                          <>
                            <Lock className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-gray-400">Private</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Monetization */}
                    <td className="p-3 align-middle">
                      <div className="flex items-center gap-1">
                        <DollarSign
                          className={`h-4 w-4 ${
                            video.monetization
                              ? "text-emerald-400 fill-emerald-400/20"
                              : "text-gray-500"
                          }`}
                        />
                        <span className="font-medium text-gray-300">
                          {video.monetization ? "On" : "Off"}
                        </span>
                      </div>
                    </td>

                    {/* Restrictions */}
                    <td className="p-3 align-middle font-medium">
                      {video.restrictions && video.restrictions !== "None" && video.restrictions.includes("Copyright") ? (
                        <button
                          onClick={() =>
                            onOpenCopyrightModal && onOpenCopyrightModal(video)
                          }
                          className="flex items-center gap-1 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/30 text-xs font-bold transition-all"
                          title="Click to view copyright claim details & resolve"
                        >
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                          <span>{video.restrictions}</span>
                        </button>
                      ) : (
                        <span className="text-gray-300">{video.restrictions || "None"}</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="p-3 align-middle text-gray-400 font-medium">
                      {video.uploadDate}
                    </td>

                    {/* Views */}
                    <td className="p-3 align-middle font-bold text-white">
                      {video.views.toLocaleString()}
                    </td>

                    {/* Comments */}
                    <td className="p-3 align-middle text-gray-300 font-medium">
                      {video.commentsCount.toLocaleString()}
                    </td>

                    {/* Likes ratio */}
                    <td className="p-3 align-middle">
                      <div className="flex flex-col">
                        <span className="font-semibold text-emerald-400">
                          {video.likePercentage}%
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {video.likes.toLocaleString()} likes
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="p-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Upload className="h-8 w-8 text-gray-600" />
                    <p className="text-sm font-semibold">No content found</p>
                    <button
                      onClick={onOpenUploadModal}
                      className="mt-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-semibold"
                    >
                      Upload new video
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile ProNax Studio Vertical Content Cards View */}
      <div className="block md:hidden space-y-3">
        {filteredVideos.length > 0 ? (
          filteredVideos.map((video) => {
            const isSelected = selectedVideoIds.includes(video.id);
            return (
              <div
                key={video.id}
                className={`bg-zinc-900/90 border border-zinc-800 p-3 rounded-xl flex flex-col gap-3 shadow-md transition-all ${
                  isSelected ? "ring-2 ring-red-500/50 bg-[#241a1a]" : ""
                }`}
              >
                {/* Row 1: Left Thumbnail (Fixed 120px) + Right Details */}
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleSelectVideo(video.id)}
                    className="mt-1 text-gray-400 hover:text-white shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-4 w-4 text-red-500" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>

                  {/* Fixed Size 120px Thumbnail */}
                  <div className="relative w-[120px] aspect-video shrink-0 rounded-lg overflow-hidden bg-black border border-zinc-800 shadow-sm">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/85 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                      {video.duration}
                    </span>
                  </div>

                  {/* Right Details */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <h2 className="font-bold text-xs sm:text-sm text-white line-clamp-2 leading-snug">
                      {video.title}
                    </h2>

                    {/* Clean grey text for Views and Upload Date */}
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-400 font-medium">
                      <span>{video.views.toLocaleString()} views</span>
                      <span>•</span>
                      <span>{video.uploadDate}</span>
                    </div>

                    {/* Small Status Badge on its own line */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800/90 border border-zinc-700/60">
                        {video.visibility === "Public" && (
                          <Globe className="h-2.5 w-2.5 text-emerald-400" />
                        )}
                        {video.visibility === "Unlisted" && (
                          <LinkIcon className="h-2.5 w-2.5 text-amber-400" />
                        )}
                        {video.visibility === "Private" && (
                          <Lock className="h-2.5 w-2.5 text-zinc-400" />
                        )}
                        <span
                          className={
                            video.visibility === "Public"
                              ? "text-emerald-400"
                              : video.visibility === "Unlisted"
                              ? "text-amber-400"
                              : "text-zinc-400"
                          }
                        >
                          {video.visibility}
                        </span>
                      </span>

                      {video.restrictions.includes("Copyright") && (
                        <button
                          onClick={() =>
                            onOpenCopyrightModal && onOpenCopyrightModal(video)
                          }
                          className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 text-[10px] font-bold"
                        >
                          <ShieldAlert className="h-2.5 w-2.5 shrink-0" />
                          <span>Copyright</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: Separate Clean Action Bar at Bottom of Card */}
                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2.5 px-0.5 text-xs text-zinc-300 gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => onEditVideo(video)}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200 text-[11px] font-semibold shrink-0 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5 text-blue-400" />
                    <span>Edit</span>
                  </button>

                  {onOpenEditor && (
                    <button
                      onClick={() => onOpenEditor(video)}
                      className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200 text-[11px] font-semibold shrink-0 transition-colors"
                    >
                      <Scissors className="h-3.5 w-3.5 text-red-400" />
                      <span>Editor</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSelectVideoAnalytics(video)}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200 text-[11px] font-semibold shrink-0 transition-colors"
                  >
                    <BarChart2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Analytics</span>
                  </button>

                  <button
                    onClick={() => onSelectView("comments")}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200 text-[11px] font-semibold shrink-0 transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
                    <span>Comments</span>
                  </button>

                  <button
                    onClick={() => onDeleteVideo(video.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-rose-400 hover:text-rose-300 text-[11px] font-semibold shrink-0 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl text-gray-400">
            <Upload className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-semibold">No content found</p>
            <button
              onClick={onOpenUploadModal}
              className="mt-3 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-semibold"
            >
              Upload new video
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
