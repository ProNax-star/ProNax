/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import React, { useRef, useEffect } from "react";
import { Video } from "./types";

interface VideoPreviewProps {
  video: Video | null;
  isPlaying: boolean;
  playhead: number;
  onTimeUpdate: (time: number) => void;
  onLoadedMetadata: (duration: number) => void;
  onEnded: () => void;
  onPlay: () => void;
  onPause: () => void;
  onSeeked: () => void;
  viewportZoom: number;
  filters?: any;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  video,
  isPlaying,
  playhead,
  onTimeUpdate,
  onLoadedMetadata,
  onEnded,
  onPlay,
  onPause,
  onSeeked,
  viewportZoom,
  filters,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const videoSource = video?.url || video?.videoUrl || '';

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !videoSource) return;

    if (isPlaying) {
      videoElement.play()
        .then(() => console.log('[VideoPreview] Playback started'))
        .catch((error) => {
          console.warn('[VideoPreview] Autoplay blocked, trying muted:', error.message);
          videoElement.muted = true;
          videoElement.play()
            .then(() => console.log('[VideoPreview] Muted playback started'))
            .catch((mutedError) => {
              console.error('[VideoPreview] Playback failed:', mutedError.message);
              if (!mutedError.message.includes('403') && !mutedError.message.includes('network')) {
                onPause();
              }
            });
        });
    } else {
      videoElement.pause();
    }
  }, [isPlaying, videoSource, onPause]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      onLoadedMetadata(video.duration);
    };

    const handleEnded = () => {
      onEnded();
    };

    const handlePlay = () => {
      onPlay();
    };

    const handlePause = () => {
      onPause();
    };

    const handleSeeked = () => {
      onSeeked();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeeked);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [onTimeUpdate, onLoadedMetadata, onEnded, onPlay, onPause, onSeeked]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (Math.abs(video.currentTime - playhead) > 0.01) {
      video.currentTime = playhead;
    }
  }, [playhead]);

  const filterStyle = filters ? `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%)` : '';

  return (
    <div 
      ref={viewportRef}
      className="relative bg-black flex items-center justify-center overflow-hidden"
      style={{ transform: `scale(${viewportZoom / 100})` }}
    >
      {videoSource ? (
        <video
          ref={videoRef}
          src={videoSource}
          className="max-w-full max-h-full"
          style={{ filter: filterStyle }}
        />
      ) : (
        <div className="text-gray-500 text-sm">No video loaded</div>
      )}
    </div>
  );
};
