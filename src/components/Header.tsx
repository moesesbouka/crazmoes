import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import logo from "@/assets/logo.png";

interface HeaderProps {
  onNewsletterClick?: () => void;
}

export function Header({ onNewsletterClick }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { href: "/shop", label: "Inventory" },
    { href: "/shop#categories", label: "Categories" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/#visit", label: "Visit" },
  ];

  const isActive = (href: string) => location.pathname === href.split("#")[0];

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/84 border-b border-border">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="Crazy Moe's"
              className="h-10 w-auto"
            />
            <div className="hidden sm:flex flex-col">
              <span className="font-black text-lg tracking-tight leading-none">
                Crazy Moe's
              </span>
              <span className="text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground mt-0.5">
                Buffalo Pickup Deals
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-[0.95rem] transition-colors ${
                  isActive(link.href)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/#visit">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex rounded-full border-border text-foreground hover:bg-secondary"
            >
              Call Store
            </Button>
          </Link>
          <Link to="/shop">
            <Button
              size="sm"
              className="hidden sm:inline-flex rounded-full bg-foreground text-background hover:bg-foreground/90 font-semibold"
            >
              Shop Deals
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <nav className="container py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-3 px-4">
              <Link to="/#visit" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full rounded-full border-border">
                  Call Store
                </Button>
              </Link>
              <Link to="/shop" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full rounded-full bg-foreground text-background font-semibold">
                  Shop Deals
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
