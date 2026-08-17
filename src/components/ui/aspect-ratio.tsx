import * as React from "react";
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";
import { cn } from "@/lib/utils";

export interface AspectRatioProps
  extends React.ComponentPropsWithoutRef<typeof AspectRatioPrimitive.Root> {
  preset?: '16/9' | '9/16' | '1/1' | '21/9' | '4/3';
  showSkeleton?: boolean;
}

const PRESET_RATIOS = {
  '16/9': 16 / 9,   // Standard Landscape Video / Stream
  '9/16': 9 / 16,   // Vertical Shorts / Mobile Reels
  '1/1': 1 / 1,     // Square Avatar / Thumbnail
  '21/9': 21 / 9,   // Ultrawide Cinematic Stream
  '4/3': 4 / 3,     // Classic Format Stream
};

const AspectRatio = React.forwardRef<
  React.ElementRef<typeof AspectRatioPrimitive.Root>,
  AspectRatioProps
>(({ className, ratio, preset = '16/9', showSkeleton = false, children, ...props }, ref) => {
  const finalRatio = ratio ?? PRESET_RATIOS[preset];

  return (
    <AspectRatioPrimitive.Root
      ref={ref}
      ratio={finalRatio}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-[#0b0e14] border border-white/5 shadow-2xl group",
        className
      )}
      {...props}
    >
      {/* Background Ambient Glow for Video Containers */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-white/5 pointer-events-none z-10" />

      {/* Optional Skeleton Loading Effect */}
      {showSkeleton && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" />
      )}

      {children}
    </AspectRatioPrimitive.Root>
  );
});

AspectRatio.displayName = "AspectRatio";

export { AspectRatio };
