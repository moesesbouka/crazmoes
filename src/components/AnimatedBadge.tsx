import { cn } from "@/lib/utils";

interface AnimatedBadgeProps {
  variant: "sale" | "hot" | "new" | "deal" | "flash";
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  sale: "bg-fun-red text-primary-foreground animate-glow-pulse",
  hot: "bg-gradient-to-r from-fun-orange to-fun-red text-primary-foreground animate-zoom-wiggle",
  new: "bg-fun-blue text-primary-foreground animate-bounce-soft",
  deal: "bg-gradient-to-r from-fun-yellow to-fun-orange text-foreground animate-heartbeat",
  flash: "bg-gradient-to-r from-fun-red via-fun-yellow to-fun-red text-foreground animate-flash animate-gradient-shift",
};

export function AnimatedBadge({ variant, children, className }: AnimatedBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg",
        variantStyles[variant],
        className
      )}
    >
      {variant === "hot" && <span className="text-sm">🔥</span>}
      {variant === "sale" && <span className="text-sm">💥</span>}
      {variant === "new" && <span className="text-sm">✨</span>}
      {variant === "deal" && <span className="text-sm">🤑</span>}
      {variant === "flash" && <span className="text-sm">⚡</span>}
      {children}
    </span>
  );
}
