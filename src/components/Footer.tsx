import { Package, Mail, MapPin, Facebook, Heart } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/50 py-12 mt-16 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-primary/5 blob -z-10" />
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-fun-purple/5 blob-2 -z-10" />
      
      <div className="container">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl fun-gradient">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-foreground">Crazy Moe's</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Your neighborhood destination for incredible deals on quality consumer goods.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-foreground mb-4">Quick Links</h4>
            <nav className="space-y-2">
              <Link to="/" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Home</Link>
              <Link to="/shop" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Shop All</Link>
              <Link to="/about" className="block text-sm text-muted-foreground hover:text-primary transition-colors">About Us</Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-foreground mb-4">Get in Touch</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-fun-orange" />
                <span>Facebook Marketplace</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 text-fun-teal" />
                <span>Contact via Marketplace</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Facebook className="h-4 w-4 text-fun-blue" />
                <span>Follow us on Facebook</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border/50 pt-8 mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Crazy Moe's. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-primary" /> for our community
          </p>
        </div>
      </div>
    </footer>
  );
}
