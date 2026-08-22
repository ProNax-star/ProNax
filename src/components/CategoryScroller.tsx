import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';

type CategoryScrollerProps = {
  items: string[];
  value?: string | null;
  prefix?: string;
  onSelect: (item: string) => void;
  rounded?: 'pill' | 'chip';
};

export function CategoryScroller({ items, value, prefix = '', onSelect, rounded = 'chip' }: CategoryScrollerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (direction: -1 | 1) => {
    ref.current?.scrollBy({ left: direction * Math.max(240, ref.current.clientWidth * 0.75), behavior: 'smooth' });
  };

  return (
    <div className="relative group/category-row w-full max-w-full overflow-hidden">
      <button
        type="button"
        aria-label="Scroll categories left"
        onClick={() => scroll(-1)}
        className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full glass-strong border border-border/40 items-center justify-center opacity-0 group-hover/category-row:opacity-100 transition hover:border-primary/50 flex-shrink-0"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div ref={ref} className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth px-0 sm:px-9 w-full max-w-full">
        {items.map((item) => {
          const active = item === value;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onSelect(item)}
              className={`shrink-0 px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                active
                  ? 'bg-foreground text-background font-semibold'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {prefix}{item}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Scroll categories right"
        onClick={() => scroll(1)}
        className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full glass-strong border border-border/40 items-center justify-center opacity-0 group-hover/category-row:opacity-100 transition hover:border-primary/50 flex-shrink-0"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}