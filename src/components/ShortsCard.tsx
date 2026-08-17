import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ShortsCardProps {
  id: string;
  title: string;
  channel: string;
  views: string;
  thumbnail?: string;
}

export function ShortsCard({ id, title, channel, views, thumbnail }: ShortsCardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="cursor-pointer group shrink-0 w-[105px] sm:w-[110px] tilt-3d"
      onClick={() => navigate(`/shorts#${id}`)}
    >
      <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted/20 neon-edge card-3d-glare border border-primary/20 transition-all duration-300 group-hover:border-primary/60 group-hover:shadow-[0_10px_30px_-5px_hsl(var(--glow-primary)/0.6)]">
        {thumbnail ? (
          <img src={thumbnail} alt={title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted/40 to-muted/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1">
          <Play className="w-2.5 h-2.5 text-white fill-white" />
          <span className="text-[10px] font-semibold text-white">{views}</span>
        </div>
      </div>
    </motion.div>
  );
}
