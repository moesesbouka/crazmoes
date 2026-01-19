import { Sparkles, ArrowRight, Zap, TrendingUp, ShoppingBag, Calendar, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AnimatedBadge } from "./AnimatedBadge";

const FLOATING_ICONS = [
  { icon: "💰", delay: 0, duration: 6, left: 5, top: 20 },
  { icon: "🔥", delay: 1, duration: 7, left: 90, top: 15 },
  { icon: "⭐", delay: 2, duration: 5, left: 15, top: 70 },
  { icon: "🛒", delay: 0.5, duration: 8, left: 85, top: 65 },
  { icon: "💎", delay: 1.5, duration: 6, left: 8, top: 45 },
  { icon: "🎉", delay: 2.5, duration: 7, left: 92, top: 40 },
  { icon: "✨", delay: 0.8, duration: 5, left: 20, top: 85 },
  { icon: "🤑", delay: 1.8, duration: 6, left: 80, top: 80 },
];

export function HeroSection() {
  const scrollToPickupInfo = () => {
    const element = document.getElementById("pickup-info");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden py-16 md:py-24 lg:py-32">
      {/* Animated background blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-fun-blue/20 blur-3xl animate-blob blob-2" style={{ animationDelay: "-2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-accent/15 blur-3xl animate-blob" style={{ animationDelay: "-4s" }} />
        <div className="absolute top-20 right-1/4 h-[200px] w-[200px] rounded-full bg-fun-green/15 blur-3xl animate-blob" style={{ animationDelay: "-3s" }} />
        <div className="absolute top-20 left-1/3 w-32 h-32 bg-fun-yellow/20 rounded-full animate-float" />
      </div>

      {/* Floating emoji decorations */}
      {FLOATING_ICONS.map((item, i) => (
        <span
          key={i}
          className="absolute text-3xl md:text-4xl opacity-50 animate-float pointer-events-none select-none hidden sm:block"
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            animationDuration: `${item.duration}s`,
            animationDelay: `${item.delay}s`,
          }}
        >
          {item.icon}
        </span>
      ))}
      
      <div className="container relative">
        <div className="mx-auto max-w-4xl text-center">
          {/* Animated badge */}
          <div className="animate-bounce-in mb-8" style={{ animationDelay: "0.1s" }}>
            <AnimatedBadge variant="flash" className="text-sm px-6 py-3">
              <Sparkles className="h-4 w-4 animate-wiggle" />
              Fresh inventory added daily — appointment pickup near 14212
              <Sparkles className="h-4 w-4 animate-wiggle" style={{ animationDelay: '0.5s' }} />
            </AnimatedBadge>
          </div>
          
          {/* Main headline with animated gradient */}
          <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl animate-pop-in opacity-0" style={{ animationDelay: '100ms' }}>
            <span className="text-gradient-animated">Buffalo Pickup Deals</span>
            <br />
            <span className="text-foreground">at </span>
            <span className="text-gradient-animated">Crazy Moe's</span>
          </h1>
          
          {/* Animated subtitle */}
          <div className="mt-6 max-w-2xl mx-auto animate-fade-in-up opacity-0" style={{ animationDelay: '200ms' }}>
            <p className="text-xl text-muted-foreground font-medium">
              Liquidation, open-box, and overstock deals —{" "}
              <span className="text-primary font-bold">50–75% off retail.</span>
            </p>
            <p className="text-lg text-muted-foreground mt-2">
              Appointment pickup near 14212 (exact address shared after confirmation).
            </p>
            <p className="text-sm text-muted-foreground/80 mt-3 font-medium">
              ⚡ Fast pickup • 💵 Cash or Cash App • 🛵 Test at pickup (e-bikes/scooters)
            </p>
          </div>
          
          {/* CTA Buttons with crazy hover effects */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-in-up opacity-0" style={{ animationDelay: '300ms' }}>
            <Link to="/shop">
              <Button size="lg" className="group hero-gradient text-lg font-bold px-8 py-6 rounded-2xl shadow-glow hover:scale-105 transition-all duration-300 hover-shake">
                <ShoppingBag className="mr-2 h-5 w-5 group-hover:animate-wiggle" />
                Shop All Products
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={scrollToPickupInfo}
              className="text-lg font-bold px-8 py-6 rounded-2xl border-2 hover:bg-accent hover:border-accent transition-all duration-300 hover:scale-105 hover-wobble"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Pickup Info (Appointment Only)
            </Button>
          </div>
          
          {/* Animated stats with 3D tilt */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-6 animate-fade-in-up opacity-0" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-3 bg-card rounded-2xl px-6 py-4 shadow-card animate-pop-in opacity-0 tilt-3d hover:shadow-fun transition-shadow" style={{ animationDelay: '0.5s' }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fun-blue/20">
                <TrendingUp className="h-6 w-6 text-fun-blue animate-bounce-soft" />
              </div>
              <div className="text-left">
                <span className="block text-2xl font-bold font-display text-foreground">500+</span>
                <span className="text-sm text-muted-foreground">Products</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-card rounded-2xl px-6 py-4 shadow-card animate-pop-in opacity-0 tilt-3d hover:shadow-fun transition-shadow" style={{ animationDelay: '0.6s' }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fun-green/20">
                <Zap className="h-6 w-6 text-fun-green animate-bounce-soft" style={{ animationDelay: '0.2s' }} />
              </div>
              <div className="text-left">
                <span className="block text-2xl font-bold font-display text-foreground">Daily</span>
                <span className="text-sm text-muted-foreground">New Arrivals</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-card rounded-2xl px-6 py-4 shadow-card animate-pop-in opacity-0 tilt-3d hover:shadow-fun transition-shadow" style={{ animationDelay: '0.7s' }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fun-yellow/20">
                <Percent className="h-6 w-6 text-fun-orange animate-bounce-soft" style={{ animationDelay: '0.4s' }} />
              </div>
              <div className="text-left">
                <span className="block text-2xl font-bold font-display text-foreground">Up to 75%</span>
                <span className="text-sm text-muted-foreground">Off Retail</span>
              </div>
            </div>
          </div>

          {/* Decorative floating tags */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <span className="bg-fun-yellow/90 text-foreground px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-wiggle">
              🏷️ HOT DEALS
            </span>
            <span className="bg-primary/90 text-primary-foreground px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-wiggle" style={{ animationDelay: "0.3s" }}>
              💥 FLASH SALE
            </span>
            <span className="bg-fun-blue/90 text-primary-foreground px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-wiggle" style={{ animationDelay: "0.6s" }}>
              ✨ NEW ITEMS
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}