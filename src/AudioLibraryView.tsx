/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React, { useState, useRef } from "react";
import {
  Search,
  Play,
  Pause,
  Star,
  Download,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AudioTrack } from "../types";

interface AudioLibraryViewProps {
  tracks: AudioTrack[];
  onToggleStarTrack: (trackId: string) => void;
}

export const AudioLibraryView: React.FC<AudioLibraryViewProps> = ({
  tracks,
  onToggleStarTrack,
}) => {
  const [activeTab, setActiveTab] = useState<"music" | "sound_effects" | "starred">(
    "music"
  );
  const [filterText, setFilterText] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");

  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredTracks = tracks.filter((t) => {
    if (activeTab === "starred" && !t.isStarred) return false;
    if (
      filterText &&
      !t.title.toLowerCase().includes(filterText.toLowerCase()) &&
      !t.artist.toLowerCase().includes(filterText.toLowerCase()) &&
      !t.genre.toLowerCase().includes(filterText.toLowerCase())
    ) {
      return false;
    }
    if (selectedGenre !== "all" && t.genre !== selectedGenre) return false;
    return true;
  });

  const handlePlayTrack = (track: AudioTrack) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = track.audioUrl;
        audioRef.current.play();
      }
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 text-gray-100 max-w-7xl mx-auto pb-28">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          Audio library
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Explore royalty-free music and sound effects to add to your Pro Nax videos safely.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-[#2d2d2d] gap-6 text-sm font-semibold text-gray-400 select-none">
        <button
          onClick={() => setActiveTab("music")}
          className={`pb-3 capitalize transition-all ${
            activeTab === "music"
              ? "text-red-500 border-b-2 border-red-500 font-bold"
              : "hover:text-gray-200"
          }`}
        >
          Free music
        </button>
        <button
          onClick={() => setActiveTab("starred")}
          className={`pb-3 capitalize transition-all flex items-center gap-1 ${
            activeTab === "starred"
              ? "text-red-500 border-b-2 border-red-500 font-bold"
              : "hover:text-gray-200"
          }`}
        >
          <Star className="h-3.5 w-3.5" />
          Starred ({tracks.filter((t) => t.isStarred).length})
        </button>
      </div>

      {/* Search & Genre filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1f1f1f] p-3 rounded-2xl border border-[#2d2d2d]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search audio library or filter by track/artist..."
            className="w-full rounded-xl bg-[#141414] border border-[#333] py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
          />
        </div>

        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          className="rounded-xl bg-[#141414] border border-[#333] py-2 px-3 text-xs text-gray-300 focus:border-red-500 focus:outline-none"
        >
          <option value="all">All Genres</option>
          <option value="Electronic">Electronic</option>
          <option value="Hip-Hop & Rap">Hip-Hop & Rap</option>
          <option value="Acoustic">Acoustic</option>
          <option value="Cinematic">Cinematic</option>
          <option value="Ambient">Ambient</option>
        </select>
      </div>

      {/* Audio table — desktop / tablet only; mobile uses the card list below */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#2d2d2d] bg-[#1a1a1a] shadow-lg">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#2d2d2d] bg-[#212121] text-gray-400 font-bold uppercase tracking-wider select-none">
              <th className="p-3 w-12 text-center">Play</th>
              <th className="p-3 w-10 text-center">Star</th>
              <th className="p-3">Track title</th>
              <th className="p-3">Genre</th>
              <th className="p-3">Mood</th>
              <th className="p-3">Artist</th>
              <th className="p-3 w-20">Duration</th>
              <th className="p-3 w-40">License type</th>
              <th className="p-3 w-20 text-center">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#282828] text-gray-200">
            {filteredTracks.map((track) => {
              const isCurrent = currentTrack?.id === track.id;
              const isCurrentAndPlaying = isCurrent && isPlaying;

              return (
                <tr
                  key={track.id}
                  className={`group hover:bg-[#222222] transition-colors ${
                    isCurrent ? "bg-[#282230]" : ""
                  }`}
                >
                  {/* Play/Pause button */}
                  <td className="p-3 text-center align-middle">
                    <button
                      onClick={() => handlePlayTrack(track)}
                      className={`p-2 rounded-full transition-all ${
                        isCurrentAndPlaying
                          ? "bg-red-600 text-white"
                          : "bg-[#2a2a2a] group-hover:bg-red-600 text-gray-300 group-hover:text-white"
                      }`}
                    >
                      {isCurrentAndPlaying ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5 ml-0.5" />
                      )}
                    </button>
                  </td>

                  {/* Star Icon */}
                  <td className="p-3 text-center align-middle">
                    <button
                      onClick={() => onToggleStarTrack(track.id)}
                      className="text-gray-500 hover:text-amber-400 transition-colors"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          track.isStarred
                            ? "fill-amber-400 text-amber-400"
                            : ""
                        }`}
                      />
                    </button>
                  </td>

                  {/* Title */}
                  <td className="p-3 align-middle font-bold text-white">
                    <span className="line-clamp-1">{track.title}</span>
                  </td>

                  {/* Genre */}
                  <td className="p-3 align-middle text-gray-300">
                    {track.genre}
                  </td>

                  {/* Mood */}
                  <td className="p-3 align-middle text-gray-400">
                    {track.mood}
                  </td>

                  {/* Artist */}
                  <td className="p-3 align-middle text-gray-300">
                    {track.artist}
                  </td>

                  {/* Duration */}
                  <td className="p-3 align-middle text-gray-400 font-mono">
                    {track.duration}
                  </td>

                  {/* License */}
                  <td className="p-3 align-middle text-emerald-400 font-medium">
                    {track.licenseType}
                  </td>

                  {/* Download */}
                  <td className="p-3 text-center align-middle">
                    <a
                      href={track.audioUrl}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-[#282828] hover:bg-[#383838] text-gray-300 hover:text-white inline-block transition-colors"
                      title="Download Track"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list — no horizontal scrolling */}
      <div className="md:hidden space-y-2">
        {filteredTracks.length === 0 && (
          <p className="rounded-2xl border border-[#2d2d2d] bg-[#1a1a1a] p-6 text-center text-xs text-gray-400">
            No tracks in your audio library yet.
          </p>
        )}
        {filteredTracks.map((track) => {
          const isCurrent = currentTrack?.id === track.id;
          const isCurrentAndPlaying = isCurrent && isPlaying;
          return (
            <div
              key={track.id}
              className={`rounded-2xl border border-[#2d2d2d] p-3 flex items-center gap-3 ${
                isCurrent ? "bg-[#282230]" : "bg-[#1a1a1a]"
              }`}
            >
              <button
                onClick={() => handlePlayTrack(track)}
                className={`p-2.5 rounded-full shrink-0 ${
                  isCurrentAndPlaying ? "bg-red-600 text-white" : "bg-[#2a2a2a] text-gray-300"
                }`}
                aria-label={isCurrentAndPlaying ? "Pause track" : "Play track"}
              >
                {isCurrentAndPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white line-clamp-1">{track.title}</p>
                <p className="text-[11px] text-gray-400 line-clamp-1">
                  {track.artist} • {track.genre} • {track.duration}
                </p>
                <p className="text-[10px] text-emerald-400 mt-0.5">{track.licenseType}</p>
              </div>
              <button
                onClick={() => onToggleStarTrack(track.id)}
                className="text-gray-500 shrink-0"
                aria-label="Star track"
              >
                <Star className={`h-4 w-4 ${track.isStarred ? "fill-amber-400 text-amber-400" : ""}`} />
              </button>
              <a
                href={track.audioUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-lg bg-[#282828] text-gray-300 shrink-0"
                aria-label="Download track"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
            </div>
          );
        })}
      </div>

      {/* Persistent Bottom Music Player */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-[#181818] border-t border-[#333] px-6 flex items-center justify-between z-50 shadow-2xl text-white">
          <div className="flex items-center gap-4 max-w-sm">
            <button
              onClick={() => handlePlayTrack(currentTrack)}
              className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition-all"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </button>

            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{currentTrack.title}</p>
              <p className="text-xs text-gray-400 truncate">
                {currentTrack.artist} • {currentTrack.genre}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-8">
            <span className="text-xs text-gray-400 font-mono">0:42</span>
            <div className="w-full bg-[#333] h-1.5 rounded-full overflow-hidden cursor-pointer">
              <div className="bg-red-500 h-full w-1/3 rounded-full" />
            </div>
            <span className="text-xs text-gray-400 font-mono">
              {currentTrack.duration}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                if (audioRef.current) audioRef.current.muted = !isMuted;
              }}
              className="p-2 text-gray-400 hover:text-white"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5 text-rose-400" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>

            <a
              href={currentTrack.audioUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>DOWNLOAD</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
