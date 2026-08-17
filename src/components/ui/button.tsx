import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-bold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 select-none font-sans cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/25 hover:shadow-red-600/40 hover:opacity-95 border border-red-500/30",
        destructive:
          "bg-red-950/80 text-red-200 border border-red-500/30 hover:bg-red-900/80 shadow-lg shadow-red-950/50",
        outline:
          "border border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10 hover:border-white/20 backdrop-blur-md shadow-sm",
        secondary:
          "bg-zinc-800/80 text-zinc-100 hover:bg-zinc-700/80 border border-white/5 backdrop-blur-md",
        ghost:
          "text-zinc-400 hover:text-white hover:bg-white/5",
        link:
          "text-red-400 underline-offset-4 hover:underline hover:text-red-300 p-0 h-auto",
        glow:
          "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] border border-cyan-400/30",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-[11px]",
        lg: "h-12 rounded-2xl px-6 text-sm",
        icon: "h-10 w-10 p-0 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
