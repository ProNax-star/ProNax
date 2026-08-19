import { motion } from 'framer-motion';

import { useNavigate, Link } from 'react-router-dom';

interface VideoCardProps {
  id: string;
  title: string;
  channel: string;
  views: string;
  time: string;
  thumbnail?: string;
  duration: string;
  monetized?: boolean;
  channelAvatar?: string;
  layout?: 'grid' | 'list';
  is_short?: boolean;
}

export function VideoCard({ id, title, channel, views, time, thumbnail, duration, monetized = true, channelAvatar, layout = 'grid', is_short = false }: VideoCardProps) {
  const navigate = useNavigate();
  const initials = channel.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Route to shorts page if video is a short
  const handleClick = () => {
    if (is_short) {
      navigate(`/shorts/${id}`);
    } else {
      navigate(`/watch/${id}`);
    }
  };

  if (layout === 'list') {
    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="cursor-pointer group flex gap-3"
        onClick={handleClick}
      >
        <div className="relative w-40 sm:w-44 shrink-0 aspect-video rounded-lg overflow-hidden bg-muted/20">
          {thumbnail && <img src={thumbnail} alt={title} className="w-full h-full object-cover" />}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-background/80 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[10px] border-l-foreground border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-0.5" />
            </div>
          </div>
          <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-background/80 text-foreground">
            {duration}
          </span>
        </div>
        <div className="flex-1 min-w-0 py-0.5">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {title}
          </h3>
          <Link
            to={`/channel/${encodeURIComponent(channel)}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-muted-foreground mt-1 hover:text-primary transition-colors inline-block"
          >
            @{channel.replace(/\s+/g, '')}
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span>{views} views</span>
            <span>•</span>
            <span>{time}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="cursor-pointer group w-full min-w-0 tilt-3d"
      onClick={handleClick}
    >
      {/* Thumbnail 16:9 */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-muted/20 border border-primary/20 transition-all duration-300 group-hover:border-primary/60 card-3d-glare neon-edge group-hover:shadow-[0_15px_45px_-10px_hsl(var(--glow-primary)/0.65),0_0_20px_1px_hsl(var(--glow-secondary)/0.3)]">
        {thumbnail && <img src={thumbnail} alt={title} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/0 via-transparent to-secondary/0 group-hover:from-primary/15 group-hover:to-secondary/15 transition-all duration-300" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-background/70 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110 backdrop-blur-sm shadow-[0_0_20px_hsl(var(--glow-primary)/0.6)]">
            <div className="w-0 h-0 border-l-[14px] border-l-primary border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent ml-1" />
          </div>
        </div>
        <span className="absolute bottom-1.5 right-1.5 rounded-md bg-background/85 px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground backdrop-blur-sm">
          {duration}
        </span>
        {views && (
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-foreground/90 backdrop-blur-sm">
            {views} views
          </span>
        )}
        {monetized && (
          <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse" />
        )}
      </div>

      {/* Info Row */}
      <div className="mt-2.5 flex items-center gap-3">
        <Link
          to={`/channel/${encodeURIComponent(channel)}`}
          onClick={(e) => e.stopPropagation()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full gradient-primary text-[10px] font-display font-bold text-primary-foreground transition hover:ring-2 hover:ring-primary/50 overflow-hidden"
        >
          {channelAvatar ? (
            <img src={channelAvatar} alt={channel} className="w-full h-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {title}
          </h3>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Link
              to={`/channel/${encodeURIComponent(channel)}`}
              onClick={(e) => e.stopPropagation()}
              className="truncate hover:text-primary transition-colors"
            >
              @{channel.replace(/\s+/g, '')}
            </Link>
            <span aria-hidden>•</span>
            <span className="shrink-0">{time}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

