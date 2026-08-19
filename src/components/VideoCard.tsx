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
        className="cursor-pointer group flex gap-2"
        onClick={handleClick}
      >
        <div className="relative w-40 sm:w-44 shrink-0 aspect-video rounded-xl overflow-hidden bg-gray-800">
          {thumbnail && <img src={thumbnail} alt={title} className="w-full h-full object-cover" />}
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[11px] font-medium text-white">
            {duration}
          </span>
        </div>
        <div className="flex-1 min-w-0 py-0">
          <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight">
            {title}
          </h3>
          <Link
            to={`/channel/${encodeURIComponent(channel)}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-gray-400 mt-1 hover:text-gray-300 transition-colors inline-block"
          >
            @{channel.replace(/\s+/g, '')}
          </Link>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
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
      className="cursor-pointer group w-full min-w-0"
      onClick={handleClick}
    >
      {/* Thumbnail 16:9 */}
      <div className="relative aspect-video w-full rounded-none sm:rounded-xl overflow-hidden bg-gray-800">
        {thumbnail && <img src={thumbnail} alt={title} className="w-full h-full object-cover" />}
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[11px] font-medium text-white">
          {duration}
        </span>
      </div>

      {/* Info Row */}
      <div className="flex gap-3 mt-3 px-3 w-full">
        <div className="h-9 w-9 shrink-0 rounded-full bg-gray-700 overflow-hidden">
          {channelAvatar ? (
            <img src={channelAvatar} alt={channel} className="w-full h-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-600 text-[10px] font-bold text-white">
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 w-full">
          <h3 className="line-clamp-2 text-[14px] font-semibold leading-[18px] text-white">
            {title}
          </h3>
          <div className="mt-1 flex items-center gap-1 text-[12px] text-gray-400">
            <span className="truncate">@{channel.replace(/\s+/g, '')}</span>
            <span>•</span>
            <span className="shrink-0">{views} views</span>
            <span>•</span>
            <span className="shrink-0">{time}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

