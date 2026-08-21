import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Save, Trash2, Globe, Lock, Link2, Eye,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/loose';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { VideoRetentionChart } from '@/components/VideoRetentionChart';
import { EndScreenConfig } from '@/components/EndScreenConfig';
import { CardsConfig } from '@/components/CardsConfig';
import { SubtitleManager } from '@/components/SubtitleManager';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const EDITOR_TABS = [
  { id: 'details', label: 'Details' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'comments', label: 'Comments' },
  { id: 'subtitles', label: 'Subtitles' },
  { id: 'endscreen', label: 'End screen' },
  { id: 'cards', label: 'Cards' },
  { id: 'visibility', label: 'Visibility' },
] as const;

type TabId = (typeof EDITOR_TABS)[number]['id'];

export default function StudioVideoEditor() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = (searchParams.get('tab') as TabId) || 'details';

  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [video, setVideo] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [subtitles, setSubtitles] = useState<{ label: string; language: string; src: string; kind?: 'subtitles' | 'captions'; default?: boolean }[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from('videos').select('*').eq('id', id).maybeSingle();
      if (error || !data) {
        toast.error('Video not found');
        navigate('/studio/content');
        return;
      }
      setVideo(data);
      setTitle(data.title ?? '');
      setDescription(data.description ?? '');
      setVisibility((data.visibility as 'public' | 'unlisted' | 'private') ?? 'public');
      
      // Load subtitles from database
      const { data: subtitleData, error: subtitleError } = await supabase
        .from('video_subtitles')
        .select('*')
        .eq('video_id', id);
      
      if (!subtitleError && subtitleData) {
        setSubtitles(subtitleData.map(sub => ({
          label: sub.label,
          language: sub.language,
          src: sub.src,
          kind: sub.kind as 'subtitles' | 'captions',
          default: sub.is_default,
        })));
      }
      
      setLoading(false);
    })();
  }, [id, navigate]);

  const setTab = (tab: TabId) => {
    setSearchParams({ tab });
  };

  const save = async () => {
    if (!id || title.trim().length < 3) {
      toast.error('Title must be at least 3 characters');
      return;
    }
    setSaving(true);
    
    // Save video details
    const { error: videoError } = await supabase.from('videos').update({
      title: title.trim(),
      description: description.trim(),
      visibility,
    }).eq('id', id);
    
    if (videoError) {
      setSaving(false);
      toast.error(videoError.message);
      return;
    }
    
    // Save subtitles - delete existing and insert new ones
    const { error: deleteError } = await supabase.from('video_subtitles').delete().eq('video_id', id);
    if (deleteError) {
      console.error('Error deleting old subtitles:', deleteError);
    }
    
    // Insert new subtitles
    if (subtitles.length > 0) {
      const subtitleRows = subtitles.map(sub => ({
        video_id: id,
        label: sub.label,
        language: sub.language,
        src: sub.src,
        kind: sub.kind || 'subtitles',
        is_default: sub.default || false,
      }));
      
      const { error: insertError } = await supabase.from('video_subtitles').insert(subtitleRows);
      if (insertError) {
        console.error('Error inserting subtitles:', insertError);
        toast.error('Failed to save subtitles');
      }
    }
    
    setSaving(false);
    toast.success('Changes saved');
  };

  const confirmDelete = async () => {
    if (!id) return;
    setDeleting(true);
    const { error } = await supabase.from('videos').delete().eq('id', id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Video deleted');
    navigate('/studio/content');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/studio/content"
            className="w-9 h-9 rounded-full hover:bg-white border border-[#e5e5e5] grid place-items-center shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-[#0f0f0f]" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-medium text-[#0f0f0f] line-clamp-1">{video.title}</h1>
            <p className="text-xs text-[#606060]">Video details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-[#e5e5e5] text-[#606060]"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
          <Link
            to={`/watch/${id}`}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-[#e5e5e5] text-sm text-[#0f0f0f] hover:bg-white transition"
          >
            <Eye className="w-4 h-4" /> View on Pro Nax
          </Link>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600 disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left sidebar tabs */}
        <nav className="lg:w-52 shrink-0 studio-card p-2 h-fit">
          {EDITOR_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition ${
                activeTab === tab.id
                  ? 'studio-nav-active font-medium'
                  : 'text-[#0f0f0f] hover:bg-[#f2f2f2]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0 space-y-4">
          {activeTab === 'details' && (
            <div className="studio-card p-6 space-y-5">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-64 shrink-0">
                  <div className="aspect-video rounded-lg overflow-hidden bg-[#f2f2f2] border border-[#e5e5e5]">
                    {video.thumb_url ? (
                      <img src={video.thumb_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#e5e5e5]" />
                    )}
                  </div>
                  <p className="text-xs text-[#606060] mt-2">Video link</p>
                  <p className="text-xs text-cyan-500 break-all">{window.location.origin}/watch/{id}</p>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <Label className="text-sm text-[#0f0f0f]">Title (required)</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                      className="mt-1.5 bg-white border-[#e5e5e5]"
                      maxLength={100}
                    />
                    <p className="text-xs text-[#606060] mt-1">{title.length}/100</p>
                  </div>
                  <div>
                    <Label className="text-sm text-[#0f0f0f]">Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
                      rows={8}
                      className="mt-1.5 bg-white border-[#e5e5e5] resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && id && (
            <div className="studio-card p-6">
              <h2 className="text-base font-medium text-[#0f0f0f] mb-4">Audience retention</h2>
              <VideoRetentionChart videoId={id} videoTitle={video.title} />
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#e5e5e5]">
                <div>
                  <p className="text-xs text-[#606060]">Views</p>
                  <p className="text-xl font-medium text-[#0f0f0f]">{(video.views_count ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[#606060]">Duration</p>
                  <p className="text-xl font-medium text-[#0f0f0f]">
                    {video.duration_seconds
                      ? `${Math.floor(video.duration_seconds / 60)}:${String(video.duration_seconds % 60).padStart(2, '0')}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#606060]">Published</p>
                  <p className="text-xl font-medium text-[#0f0f0f]">
                    {video.published_at
                      ? new Date(video.published_at).toLocaleDateString()
                      : new Date(video.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="studio-card p-6 text-center py-12">
              <p className="text-sm text-[#606060] mb-4">Manage comments on the watch page</p>
              <Link
                to={`/watch/${id}#comments`}
                className="inline-flex px-4 py-2 rounded-full bg-cyan-500 text-white text-sm font-medium"
              >
                Open comments
              </Link>
            </div>
          )}

          {activeTab === 'subtitles' && (
            <div className="studio-card p-6">
              <SubtitleManager
                videoId={id || ''}
                videoUrl={video.video_url}
                subtitles={subtitles}
                onSubtitlesChange={setSubtitles}
                onClose={() => {}}
              />
            </div>
          )}

          {activeTab === 'endscreen' && id && (
            <div className="studio-card p-6">
              <EndScreenConfig videoId={id} />
            </div>
          )}

          {activeTab === 'cards' && id && (
            <div className="studio-card p-6">
              <CardsConfig videoId={id} />
            </div>
          )}

          {activeTab === 'visibility' && (
            <div className="studio-card p-6 space-y-4">
              <h2 className="text-base font-medium text-[#0f0f0f]">Visibility</h2>
              <p className="text-sm text-[#606060]">Choose who can see your video</p>
              <div className="space-y-2">
                {([
                  { v: 'public' as const, icon: Globe, label: 'Public', desc: 'Everyone can watch your video' },
                  { v: 'unlisted' as const, icon: Link2, label: 'Unlisted', desc: 'Anyone with the link can watch' },
                  { v: 'private' as const, icon: Lock, label: 'Private', desc: 'Only you can watch' },
                ]).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setVisibility(opt.v)}
                    className={`w-full flex items-start gap-3 p-4 rounded-lg border text-left transition ${
                      visibility === opt.v
                        ? 'border-cyan-500 bg-[#e0f2fe]'
                        : 'border-[#e5e5e5] hover:bg-[#fafafa]'
                    }`}
                  >
                    <opt.icon className={`w-5 h-5 mt-0.5 ${visibility === opt.v ? 'text-cyan-500' : 'text-[#606060]'}`} />
                    <div>
                      <p className="text-sm font-medium text-[#0f0f0f]">{opt.label}</p>
                      <p className="text-xs text-[#606060]">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete video permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-[#0f0f0f] font-medium">{video.title}</span> will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
