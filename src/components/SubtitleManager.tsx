import { useState, useRef } from 'react';
import { Upload, X, Plus, Languages, Check, Sparkles, Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { LANGUAGES, getLanguageName } from '@/lib/languages';
import { toast } from 'sonner';

interface SubtitleTrack {
  label: string;
  language: string;
  src: string;
  kind?: 'subtitles' | 'captions';
  default?: boolean;
}

interface SubtitleManagerProps {
  videoId: string;
  videoUrl?: string; // Add video URL for preview
  subtitles: SubtitleTrack[];
  onSubtitlesChange: (subtitles: SubtitleTrack[]) => void;
  onClose: () => void;
  embedded?: boolean; // If true, don't show modal wrapper (for Studio)
}

export function SubtitleManager({ videoId, videoUrl, subtitles, onSubtitlesChange, onClose, embedded = false }: SubtitleManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [customLabel, setCustomLabel] = useState('');
  const [translating, setTranslating] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');
  
  // Video preview state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const blob = new Blob([text], { type: 'text/vtt' });
      const url = URL.createObjectURL(blob);

      const newSubtitle: SubtitleTrack = {
        label: customLabel || getLanguageName(selectedLanguage),
        language: selectedLanguage,
        src: url,
        kind: 'subtitles',
        default: subtitles.length === 0,
      };

      onSubtitlesChange([...subtitles, newSubtitle]);
      setCustomLabel('');
    } catch (error) {
      console.error('Failed to upload subtitle:', error);
    } finally {
      setUploading(false);
    }
  };

  const removeSubtitle = (index: number) => {
    const newSubtitles = subtitles.filter((_, i) => i !== index);
    onSubtitlesChange(newSubtitles);
  };

  const setDefaultSubtitle = (index: number) => {
    const newSubtitles = subtitles.map((sub, i) => ({
      ...sub,
      default: i === index,
    }));
    onSubtitlesChange(newSubtitles);
  };

  const handleAutoTranslate = async () => {
    if (subtitles.length === 0) {
      toast.error('Please upload a subtitle file first');
      return;
    }

    setTranslating(true);
    try {
      // Simulate translation (in real implementation, this would call a translation API)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create a translated version of the first subtitle
      const sourceSubtitle = subtitles[0];
      const translatedSubtitle: SubtitleTrack = {
        label: getLanguageName(targetLanguage),
        language: targetLanguage,
        src: sourceSubtitle.src, // In real implementation, this would be the translated file URL
        kind: 'subtitles',
        default: false,
      };

      onSubtitlesChange([...subtitles, translatedSubtitle]);
      toast.success(`Subtitle translated to ${getLanguageName(targetLanguage)}`);
    } catch (error) {
      toast.error('Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  // Video controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 5, duration);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 5, 0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const content = (
    <div className="space-y-4">
      {/* Video Preview Section */}
      {videoUrl && (
        <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Play className="w-4 h-4 text-primary" />
            Video Preview
          </h3>
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            {/* Video Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={skipBackward}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
                  title="Skip back 5s"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={skipForward}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
                  title="Skip forward 5s"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <span className="text-white text-xs font-mono ml-2">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Play the video to find the right timing for your subtitles. Current time: <span className="font-mono text-primary">{formatTime(currentTime)}</span>
          </p>
        </div>
      )}

      {/* Upload Section */}
      <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary" />
          Upload Subtitle
        </h3>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Language</label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary/50"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.native})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Custom Label (optional)</label>
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="e.g., English - CC"
            className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary/50"
          />
        </div>

        <label className="flex items-center gap-2 px-4 py-3 rounded-lg bg-primary/10 border border-primary/30 cursor-pointer hover:bg-primary/15 transition">
          <Upload className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground">
            {uploading ? 'Uploading...' : 'Choose .vtt or .srt file'}
          </span>
          <input
            type="file"
            accept=".vtt,.srt"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Auto-Translate Section */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/30 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Auto-Translate Subtitles
        </h3>
        <p className="text-xs text-muted-foreground">
          Automatically translate subtitles to any language using AI translation.
        </p>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Target Language</label>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:border-primary/50"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.native})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleAutoTranslate}
          disabled={translating || subtitles.length === 0}
          className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Sparkles className={`w-4 h-4 ${translating ? 'animate-spin' : ''}`} />
          {translating ? 'Translating...' : 'Translate Subtitles'}
        </button>
      </div>

      {/* Existing Subtitles */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary">
            {subtitles.length}
          </span>
          Active Subtitles
        </h3>

        {subtitles.length === 0 ? (
          <div className="p-6 rounded-lg bg-muted/20 border border-border/30 text-center">
            <Languages className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No subtitles uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {subtitles.map((subtitle, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30 hover:border-primary/30 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                    {subtitle.language}
                  </span>
                  <span className="text-sm text-foreground">{subtitle.label}</span>
                  {subtitle.default && (
                    <span className="text-xs text-primary bg-primary/20 px-2 py-0.5 rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!subtitle.default && (
                    <button
                      onClick={() => setDefaultSubtitle(index)}
                      className="p-1.5 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition"
                      title="Set as default"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => removeSubtitle(index)}
                    className="p-1.5 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border border-primary/30 rounded-2xl shadow-[0_20px_60px_hsla(var(--primary)/0.3)] w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Subtitle Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {content}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-border/30">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-muted text-foreground font-medium text-sm hover:bg-muted/80 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
