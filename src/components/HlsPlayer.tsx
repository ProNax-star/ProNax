/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Settings, RefreshCw, AlertTriangle, Radio
} from 'lucide-react';

interface HlsPlayerProps {
  playbackId: string;
  isLive: boolean;
  onError?: (error: Error) => void;
  onStreamEnded?: () => void;
  className?: string;
}

export function HlsPlayer({ 
  playbackId, 
  isLive, 
  onError, 
  onStreamEnded,
  className = '' 
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Initialize HLS player
  useEffect(() => {
    if (!videoRef.current || !playbackId) return;

    const video = videoRef.current;
    let hls: any = null;

    const initPlayer = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        // Check if native HLS is supported (Safari)
        const supportsNativeHls = video.canPlayType('application/vnd.apple.mpegurl');

        const streamUrl = `https://stream.mux.com/${playbackId}.m3u8`;

        if (supportsNativeHls) {
          // Use native HLS support (Safari)
          video.src = streamUrl;
        } else {
          // Dynamically import hls.js for other browsers
          const Hls = (await import('hls.js')).default;
          
          if (Hls.isSupported()) {
            hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 90,
            });

            hls.loadSource(streamUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setIsLoading(false);
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.error('Network error, trying to recover...');
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.error('Media error, trying to recover...');
                    hls.recoverMediaError();
                    break;
                  default:
                    console.error('Fatal error, cannot recover:', data);
                    setHasError(true);
                    setIsLoading(false);
                    onError?.(new Error(data.details || 'Stream playback error'));
                    break;
                }
              }
            });

            hlsRef.current = hls;
          } else {
            throw new Error('HLS is not supported in this browser');
          }
        }

        // Set up video event listeners
        video.addEventListener('canplay', () => setIsLoading(false));
        video.addEventListener('play', () => setIsPlaying(true));
        video.addEventListener('pause', () => setIsPlaying(false));
        video.addEventListener('ended', () => {
          setIsPlaying(false);
          onStreamEnded?.();
        });
        video.addEventListener('timeupdate', () => setCurrentTime(video.currentTime));
        video.addEventListener('loadedmetadata', () => setDuration(video.duration));
        video.addEventListener('error', () => {
          setHasError(true);
          setIsLoading(false);
        });

      } catch (error) {
        console.error('Failed to initialize HLS player:', error);
        setHasError(true);
        setIsLoading(false);
        onError?.(error as Error);
      }
    };

    initPlayer();

    return () => {
      // Cleanup
      if (hls) {
        hls.destroy();
      }
      if (video.src) {
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [playbackId]);

  // Toggle play/pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    
    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Retry loading
  const retryLoad = () => {
    setHasError(false);
    setIsLoading(true);
    // Force re-initialization by unmounting and remounting
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  return (
    <div className={`relative bg-black aspect-video ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        muted={isMuted}
        playsInline
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <RefreshCw className="w-8 h-8 text-white animate-spin" />
            <p className="text-white text-sm font-medium">Loading stream...</p>
          </motion.div>
        </div>
      )}

      {/* Error overlay */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 text-center p-6"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Stream Unavailable</p>
              <p className="text-gray-400 text-sm">The stream may be offline or experiencing issues</p>
            </div>
            <button
              onClick={retryLoad}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </motion.div>
        </div>
      )}

      {/* Video controls overlay */}
      {!isLoading && !hasError && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between">
            {/* Left controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              
              <button
                onClick={toggleMute}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              {isLive && (
                <div className="flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full">
                  <Radio className="w-3 h-3 text-white" />
                  <span className="text-xs font-bold text-white">LIVE</span>
                </div>
              )}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
                <Settings className="w-5 h-5" />
              </button>
              
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Progress bar (for VOD) */}
          {!isLive && duration > 0 && (
            <div className="mt-3">
              <div className="w-full bg-white/20 rounded-full h-1 cursor-pointer">
                <div 
                  className="bg-red-500 h-1 rounded-full transition-all"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-white/70">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Play/Pause overlay when hovering */}
      {!isLoading && !hasError && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={togglePlay}
            className="pointer-events-auto w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition"
          >
            <Play className="w-8 h-8 ml-1" />
          </motion.button>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
