import { Package, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onNewsletterClick: () => void;
}

export function Header({ onNewsletterClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl hero-gradient shadow-glow">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">
              Crazy Moe's
            </h1>
            <p className="text-xs text-muted-foreground">Consumer Goods Marketplace</p>
          </div>
        </div>
        
        <Button 
          onClick={onNewsletterClick}
          className="gap-2 hero-gradient hover:opacity-90 transition-opacity"
        >
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Get Updates</span>
        </Button>
      </div>
    </header>
  );
}
