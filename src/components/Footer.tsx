import { Package, Mail, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/50 py-12 mt-16">
      <div className="container">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl hero-gradient">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">Crazy Moe's</span>
          </div>
          
          <p className="max-w-md text-sm text-muted-foreground">
            Quality consumer goods at unbeatable prices. Browse our complete inventory and find exactly what you need.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>Facebook Marketplace</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Contact via Marketplace</span>
            </div>
          </div>
          
          <div className="border-t border-border/50 pt-6 w-full text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Crazy Moe's. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
