/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useState } from 'react';
import { Link } from '@/lib/router-compat';
import { 
  Edit3, BarChart2, MessageSquare, ExternalLink, 
  AlertTriangle, CheckCircle, Clock, Eye, 
  MoreVertical, Globe, Lock, Link2, Calendar, Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { CopyrightClaimModal } from '@/components/CopyrightClaimModal';

interface VideoRow {
  id: string;
  title: string;
  description: string | null;
  thumb_url: string | null;
  duration_seconds: number | null;
  created_at: string;
  published_at: string | null;
  visibility: 'public' | 'private' | 'unlisted' | 'draft';
  views_count?: number;
  comments_count?: number;
  copyright_status?: 'none' | 'warning' | 'blocked' | 'partial';
  copyright_claims?: any[];
}

interface ChannelContentDashboardProps {
  videos: VideoRow[];
  loading?: boolean;
  onRefresh?: () => void;
  variant?: string;
  onEdit?: (id: string) => void;
  onAnalytics?: (id: string) => void;
  onVisibilityChange?: (videoId: string, visibility: string) => void | Promise<void>;
}

export function ChannelContentDashboard({ 
  videos, 
  loading = false, 
  onRefresh 
}: ChannelContentDashboardProps) {
  const [selectedVideo, setSelectedVideo] = useState<VideoRow | null>(null);
  const [copyrightModalOpen, setCopyrightModalOpen] = useState(false);

  const handleCopyrightClick = (video: VideoRow) => {
    setSelectedVideo(video);
    setCopyrightModalOpen(true);
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public': return <Globe className="w-4 h-4" />;
      case 'private': return <Lock className="w-4 h-4" />;
      case 'unlisted': return <Link2 className="w-4 h-4" />;
      case 'draft': return <Clock className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const getCopyrightBadge = (video: VideoRow) => {
    if (video.copyright_status === 'blocked') {
      return (
        <Badge variant="destructive" className="gap-1 cursor-pointer" onClick={() => handleCopyrightClick(video)}>
          <AlertTriangle className="w-3 h-3" />
          Blocked
        </Badge>
      );
    }
    if (video.copyright_status === 'partial') {
      return (
        <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-500 cursor-pointer" onClick={() => handleCopyrightClick(video)}>
          <AlertTriangle className="w-3 h-3" />
          Partially blocked
        </Badge>
      );
    }
    if (video.copyright_status === 'warning') {
      return (
        <Badge variant="outline" className="gap-1 border-orange-500/50 text-orange-500 cursor-pointer" onClick={() => handleCopyrightClick(video)}>
          <AlertTriangle className="w-3 h-3" />
          Copyright notice
        </Badge>
      );
    }
    if (video.visibility === 'draft') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="w-3 h-3" />
          Draft
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 border-emerald-500/50 text-emerald-500">
        <CheckCircle className="w-3 h-3" />
        No issues
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-muted/30 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
            <Video className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No videos yet</h3>
          <p className="text-sm text-muted-foreground">Upload your first video to get started</p>
          <Button asChild className="mt-2">
            <Link to="/upload">Upload video</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="col-span-5">Video</div>
          <div className="col-span-2">Notices</div>
          <div className="col-span-2">Visibility</div>
          <div className="col-span-1">Date</div>
          <div className="col-span-1">Views</div>
          <div className="col-span-1">Comments</div>
        </div>

        {/* Video Rows */}
        {videos.map((video) => (
          <Card key={video.id} className="p-3 hover:border-primary/50 transition-colors">
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* Video Thumbnail & Title */}
              <div className="col-span-5 flex items-start gap-3">
                <div className="relative w-32 h-18 rounded-lg overflow-hidden bg-muted shrink-0">
                  {video.thumb_url ? (
                    <img 
                      src={video.thumb_url} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/50">
                      <Video className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  {video.duration_seconds && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white font-medium">
                      {formatDuration(video.duration_seconds)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link 
                    to={`/watch/${video.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary line-clamp-2"
                  >
                    {video.title}
                  </Link>
                  {video.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                      {video.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      <Edit3 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      <BarChart2 className="w-3 h-3 mr-1" />
                      Analytics
                    </Button>
                  </div>
                </div>
              </div>

              {/* Notices */}
              <div className="col-span-2">
                {getCopyrightBadge(video)}
              </div>

              {/* Visibility */}
              <div className="col-span-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 justify-start gap-2 text-xs capitalize">
                      {getVisibilityIcon(video.visibility)}
                      {video.visibility}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem>
                      <Globe className="w-4 h-4 mr-2" />
                      Public
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Lock className="w-4 h-4 mr-2" />
                      Private
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link2 className="w-4 h-4 mr-2" />
                      Unlisted
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Clock className="w-4 h-4 mr-2" />
                      Draft
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Date */}
              <div className="col-span-1">
                <div className="text-xs text-foreground">
                  {formatDate(video.published_at || video.created_at)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {video.published_at ? 'Published' : 'Uploaded'}
                </div>
              </div>

              {/* Views */}
              <div className="col-span-1">
                <div className="flex items-center gap-1 text-xs text-foreground">
                  <Eye className="w-3 h-3 text-muted-foreground" />
                  {formatNumber(video.views_count)}
                </div>
              </div>

              {/* Comments */}
              <div className="col-span-1">
                <Link 
                  to={`/watch/${video.id}#comments`}
                  className="flex items-center gap-1 text-xs text-foreground hover:text-primary"
                >
                  <MessageSquare className="w-3 h-3 text-muted-foreground" />
                  {formatNumber(video.comments_count)}
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Copyright Claim Modal */}
      {selectedVideo && (
        <CopyrightClaimModal
          open={copyrightModalOpen}
          onOpenChange={setCopyrightModalOpen}
          video={selectedVideo}
          claims={selectedVideo.copyright_claims || []}
        />
      )}
    </>
  );
}
