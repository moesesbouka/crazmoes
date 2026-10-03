import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MapPin, Menu, Search, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STOREFRONT_DEPARTMENTS } from "@/storefront/taxonomy";
import logo from "@/assets/logo.png";

interface HeaderProps {
  onNewsletterClick?: () => void;
}

export function Header({ onNewsletterClick: _onNewsletterClick }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [departmentsOpen, setDepartmentsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 18);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setDepartmentsOpen(false);
  }, [location.pathname, location.search]);

  return (
    <header className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${scrolled ? "border-border bg-background/92 shadow-[0_12px_40px_-25px_rgba(0,0,0,0.8)] backdrop-blur-xl" : "border-border/60 bg-background/80 backdrop-blur-lg"}`}>
      <div className="container flex h-[72px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-7 xl:gap-10">
          <Link to="/" className="group flex shrink-0 items-center gap-2.5">
            <motion.img whileHover={{ rotate: [0, -7, 6, 0] }} src={logo} alt="Crazy Moe's" className="h-10 w-auto" />
            <div className="hidden sm:block">
              <p className="text-base font-black leading-none tracking-[-0.03em]">Crazy Moe's</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Buffalo deal warehouse</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <Link to="/shop" className={`rounded-full px-4 py-2 text-sm font-bold transition ${location.pathname === "/shop" && !location.search ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}>Shop all</Link>
            <div className="relative">
              <button
                onClick={() => setDepartmentsOpen((value) => !value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${departmentsOpen ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}
              >
                Departments <ChevronDown className={`h-3.5 w-3.5 transition-transform ${departmentsOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {departmentsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.985 }}
                    transition={{ duration: 0.18 }}
                    className="absolute left-0 top-[calc(100%+14px)] w-[650px] overflow-hidden rounded-2xl border border-border bg-background/98 p-3 shadow-[0_30px_90px_-35px_rgba(0,0,0,0.95)] backdrop-blur-xl"
                  >
                    <div className="grid grid-cols-3 gap-1">
                      {STOREFRONT_DEPARTMENTS.map((department) => (
                        <Link key={department.slug} to={`/shop?dept=${department.slug}`} className="group rounded-xl p-3 transition hover:bg-secondary/70">
                          <p className="text-sm font-black transition-colors group-hover:text-primary">{department.name}</p>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{department.description}</p>
                        </Link>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
                      <div><p className="text-xs font-black text-primary">Don't know where it belongs?</p><p className="mt-0.5 text-[11px] text-muted-foreground">Search the full warehouse inventory instead.</p></div>
                      <Button asChild size="sm" className="rounded-full"><Link to="/shop"><Search className="mr-1.5 h-3.5 w-3.5" />Search all</Link></Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Link to="/schedule-pickup" className="rounded-full px-4 py-2 text-sm font-bold text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground">Pickup</Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" size="icon" className="hidden rounded-full sm:inline-flex" aria-label="Search inventory"><Link to="/shop"><Search className="h-4 w-4" /></Link></Button>
          <div className="hidden items-center gap-1.5 text-[11px] font-bold text-muted-foreground xl:flex"><MapPin className="h-3.5 w-3.5 text-primary" /> Buffalo pickup</div>
          <Button asChild size="sm" className="hidden rounded-full px-5 font-black sm:inline-flex"><Link to="/shop"><Zap className="mr-1.5 h-3.5 w-3.5" />Shop deals</Link></Button>
          <Button variant="ghost" size="icon" className="rounded-full lg:hidden" onClick={() => setMobileMenuOpen((value) => !value)} aria-label="Open navigation">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-border bg-background/98 backdrop-blur-xl lg:hidden">
            <div className="container max-h-[calc(100vh-72px)] overflow-y-auto py-5">
              <div className="grid grid-cols-2 gap-2">
                <Button asChild className="rounded-xl font-black"><Link to="/shop"><Zap className="mr-1.5 h-4 w-4" />Shop all</Link></Button>
                <Button asChild variant="outline" className="rounded-xl font-bold"><Link to="/schedule-pickup"><MapPin className="mr-1.5 h-4 w-4" />Pickup</Link></Button>
              </div>
              <p className="mb-3 mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Departments</p>
              <div className="grid grid-cols-2 gap-2">
                {STOREFRONT_DEPARTMENTS.map((department, index) => (
                  <motion.div key={department.slug} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * 0.025 }}>
                    <Link to={`/shop?dept=${department.slug}`} className="block rounded-xl border border-border bg-card/60 p-3 text-sm font-bold transition hover:border-primary/30 hover:text-primary">{department.name}</Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
