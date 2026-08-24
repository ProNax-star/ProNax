import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  Info,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";

const alertVariants = cva(
  "relative w-full rounded-2xl border px-4 py-3.5 text-xs backdrop-blur-xl font-sans transition-all [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:w-4 [&>svg]:h-4 [&>svg~*]:pl-7 shadow-xl overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-[#0e121b]/90 border-white/10 text-zinc-100 [&>svg]:text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.05)]",
        destructive:
          "border-red-500/40 bg-red-950/40 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.15)] [&>svg]:text-red-400",
        success:
          "border-emerald-500/40 bg-emerald-950/40 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.15)] [&>svg]:text-emerald-400",
        warning:
          "border-amber-500/40 bg-amber-950/40 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.15)] [&>svg]:text-amber-400",
        info:
          "border-cyan-500/40 bg-cyan-950/40 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.15)] [&>svg]:text-cyan-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ElementType;
  onClose?: () => void;
  onDismiss?: () => void;
  triggerToast?: boolean;
}

// Map variants to default Lucide Icons
const variantIcons: Record<
  NonNullable<VariantProps<typeof alertVariants>["variant"]>,
  React.ElementType
> = {
  default: Info,
  destructive: AlertOctagon,
  success: ShieldCheck,
  warning: AlertTriangle,
  info: Info,
};

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = "default",
      icon: CustomIcon,
      onClose,
      onDismiss,
      triggerToast = false,
      children,
      ...props
    },
    ref
  ) => {
    const handleDismiss = onClose || onDismiss;
    const Icon = CustomIcon || (variant ? variantIcons[variant] : Info) || Info;

    React.useEffect(() => {
      if (triggerToast) {
        if (variant === "destructive") {
          toast.error("Alert Triggered", { description: "High severity system notification." });
        } else if (variant === "success") {
          toast.success("Action Completed", { description: "System status verified." });
        } else if (variant === "warning") {
          toast.warning("System Warning", { description: "Action requires review." });
        } else {
          toast.info("System Notice", { description: "Alert mounted successfully." });
        }
      }
    }, [triggerToast, variant]);

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <Icon className="shrink-0 stroke-[2.25]" />
        <div>{children}</div>

        {handleDismiss && (
          <button
            onClick={handleDismiss}
            type="button"
            className="absolute top-3.5 right-3.5 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Dismiss alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "mb-1 font-extrabold tracking-tight text-white leading-none font-display text-xs",
      className
    )}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs text-zinc-300 [&_p]:leading-relaxed font-sans", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
