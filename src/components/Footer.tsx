import { Package, Mail, MapPin, Facebook, Heart, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/50 py-12 mt-16 relative overflow-hidden">
      {/* Animated decorative blobs */}
      <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-primary/5 blob -z-10 animate-blob" />
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-fun-blue/5 blob-2 -z-10 animate-blob" style={{ animationDelay: "-2s" }} />
      <div className="absolute left-1/2 bottom-0 w-20 h-20 bg-fun-yellow/10 rounded-full blur-2xl animate-float" />
      
      {/* Wavy top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fun-red via-fun-yellow to-fun-blue animate-gradient-shift bg-[length:200%_100%]" />
      
      <div className="container relative">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4 animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl fun-gradient group-hover:animate-wiggle">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-gradient-animated">Crazy Moe's</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Your neighborhood destination for incredible deals on quality consumer goods.
            </p>
          </div>

          {/* Quick Links */}
          <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.2s" }}>
            <h4 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-fun-yellow animate-zoom-wiggle" />
              Quick Links
            </h4>
            <nav className="space-y-2">
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary transition-colors wavy-underline">Home</Link>
              <Link to="/shop" className="block text-sm text-muted-foreground hover:text-primary transition-colors wavy-underline">Shop All</Link>
              <Link to="/schedule-pickup" className="block text-sm text-muted-foreground hover:text-primary transition-colors wavy-underline">Schedule Pickup</Link>
              <Link to="/about" className="block text-sm text-muted-foreground hover:text-primary transition-colors wavy-underline">About Us</Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="animate-fade-in-up opacity-0" style={{ animationDelay: "0.3s" }}>
            <h4 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-fun-orange animate-bounce-soft" />
              Visit Us
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-muted-foreground group cursor-pointer">
                <MapPin className="h-4 w-4 text-fun-orange mt-0.5 group-hover:animate-wiggle" />
                <span className="group-hover:text-foreground transition-colors">74 Houghton Ave, Buffalo, NY 14212</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground group cursor-pointer">
                <Mail className="h-4 w-4 text-fun-blue group-hover:animate-wiggle" />
                <span className="group-hover:text-foreground transition-colors">Contact via Facebook</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground group cursor-pointer">
                <Facebook className="h-4 w-4 text-fun-blue group-hover:animate-wiggle" />
                <span className="group-hover:text-foreground transition-colors">Follow us on Facebook</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border/50 pt-8 mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground animate-fade-in-up opacity-0" style={{ animationDelay: "0.4s" }}>
            © {new Date().getFullYear()} Crazy Moe's. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 animate-fade-in-up opacity-0" style={{ animationDelay: "0.5s" }}>
            Made with <Heart className="h-3 w-3 text-primary animate-heartbeat" /> for our community
          </p>
        </div>
      </div>
    </footer>
  );
}
