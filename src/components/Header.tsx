import { Bell, Menu, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import logo from "@/assets/logo.png";

interface HeaderProps {
  onNewsletterClick: () => void;
}

export function Header({ onNewsletterClick }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/schedule-pickup", label: "Schedule Pickup" },
    { href: "/about", label: "About" },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo with crazy animation */}
          <Link to="/" className="flex items-center gap-3 group relative">
            <div className="relative">
              <img 
                src={logo} 
                alt="Crazy Moe's - Closeouts & Open Box Deals" 
                className="h-16 w-auto transition-all duration-300 group-hover:scale-110 hover-wobble"
              />
              {/* Animated sparkle */}
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-fun-yellow animate-zoom-wiggle" />
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="font-display font-black text-xl text-gradient-animated leading-none">
                Crazy Moe's
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                Truckload Liquidation
              </span>
            </div>
          </Link>

          {/* Desktop Nav with wavy underlines */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 wavy-underline ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={onNewsletterClick}
            className="gap-2 fun-gradient hover:opacity-90 transition-all duration-300 font-bold rounded-xl hidden sm:flex animate-glow-pulse hover:scale-105 hover-shake"
          >
            <Bell className="h-4 w-4 animate-swing" />
            <span>Get Updates</span>
          </Button>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden hover-shake"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 animate-spin-in" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu with pop-in animations */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl animate-fade-in-up">
          <nav className="container py-4 space-y-2">
            {navLinks.map((link, i) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all animate-pop-in opacity-0 ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {link.label}
              </Link>
            ))}
            <Button 
              onClick={() => {
                onNewsletterClick();
                setMobileMenuOpen(false);
              }}
              className="w-full gap-2 fun-gradient hover:opacity-90 transition-opacity font-bold rounded-xl mt-4 animate-pop-in opacity-0"
              style={{ animationDelay: "0.4s" }}
            >
              <Bell className="h-4 w-4" />
              <span>Get Updates</span>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
