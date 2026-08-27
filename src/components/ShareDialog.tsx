/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Share2, MessageCircle, Facebook, Twitter, Send, Mail, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { useVideoShare, type SharePlatform } from '@/hooks/useVideoShare';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  url: string;
  title?: string;
  videoId?: string;
};

export function ShareDialog({ open, onOpenChange, url, title = 'Check this out on Pro Nax', videoId }: Props) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent(url);
  const encT = encodeURIComponent(title);
  const { recordShare } = useVideoShare();

  const channels: { label: string; icon: React.ComponentType<{ className?: string }>; color: string; href: string; platform: SharePlatform }[] = [
    { label: 'WhatsApp', icon: MessageCircle, color: 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30', href: `https://wa.me/?text=${encT}%20${enc}`, platform: 'whatsapp' },
    { label: 'X / Twitter', icon: Twitter, color: 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30', href: `https://twitter.com/intent/tweet?text=${encT}&url=${enc}`, platform: 'twitter' },
    { label: 'Facebook', icon: Facebook, color: 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30', href: `https://www.facebook.com/sharer/sharer.php?u=${enc}`, platform: 'facebook' },
    { label: 'Telegram', icon: Send, color: 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30', href: `https://t.me/share/url?url=${enc}&text=${encT}`, platform: 'telegram' },
    { label: 'Email', icon: Mail, color: 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30', href: `mailto:?subject=${encT}&body=${enc}`, platform: 'other' },
    { label: 'Embed', icon: Link2, color: 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30', href: `#embed`, platform: 'clipboard' },
  ];

  const handleShare = async (platform: SharePlatform) => {
    if (videoId) {
      await recordShare(videoId, platform);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success('Link copied');
      await handleShare('clipboard');
    } catch {
      toast.error('Copy failed');
    }
  };

  const native = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        await handleShare('native');
      } catch {/* user cancelled */}
    } else {
      copy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border border-border/40 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Share2 className="w-4 h-4 text-primary" /> Share</DialogTitle>
        </DialogHeader>

        {/* social row */}
        <div className="grid grid-cols-3 gap-3 py-2">
          {channels.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { 
                if (c.href === '#embed') { 
                  e.preventDefault(); 
                  copy(); 
                } else {
                  handleShare(c.platform);
                }
              }}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl transition ${c.color}`}
            >
              <c.icon className="w-5 h-5" />
              <span className="text-[11px] font-medium">{c.label}</span>
            </a>
          ))}
        </div>

        {/* URL + copy */}
        <div className="flex gap-2 items-center bg-muted/40 rounded-lg p-1.5 mt-2">
          <Input readOnly value={url} className="border-0 bg-transparent h-9 text-xs focus-visible:ring-0" />
          <Button size="sm" onClick={copy} className="shrink-0">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="ml-1.5">{copied ? 'Copied' : 'Copy'}</span>
          </Button>
        </div>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <Button variant="outline" onClick={native} className="w-full mt-2">
            <Share2 className="w-4 h-4 mr-2" /> More sharing options
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
