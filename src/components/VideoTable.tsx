/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { Link } from '@/lib/router-compat';
import { Play, BarChart2, Edit3, Trash2, CheckCircle, Clock, Globe, DollarSign, Heart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  status: 'Good' | 'Warning' | 'Error';
  visibility: 'public' | 'private' | 'unlisted';
  monetization: 'Active' | 'Pending Review' | 'Rejected';
  views: number;
  likes: number;
  earnings: string;
  date: string;
}

interface VideoTableProps {
  videos: Video[];
}

export function VideoTable({ videos }: VideoTableProps) {
  return (
    <div className="w-full">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/40">
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Video</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visibility</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monetization</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Views</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Likes</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Earnings</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {videos.map((video) => (
            <tr key={video.id} className="border-b border-border/20 hover:bg-muted/30 transition">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-24 h-14 rounded overflow-hidden bg-muted shrink-0">
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-sm font-medium line-clamp-2 max-w-xs">{video.title}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <Badge variant="outline" className="gap-1 border-emerald-500/50 text-emerald-500">
                  <CheckCircle className="w-3 h-3" />
                  {video.status}
                </Badge>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  <span className="capitalize">{video.visibility}</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-500">
                  <Clock className="w-3 h-3" />
                  {video.monetization}
                </Badge>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  {video.views}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Heart className="w-4 h-4" />
                  {video.likes}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  {video.earnings}
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-muted-foreground">{video.date}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <BarChart2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
