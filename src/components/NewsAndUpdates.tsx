import { Megaphone, Clock, MapPin, ArrowRight, Sparkles, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { AnimatedBadge } from "./AnimatedBadge";

export function NewsAndUpdates() {
  return (
    <section className="py-16 relative overflow-hidden">
      {/* Animated decorative elements */}
      <div className="absolute -left-20 top-0 w-40 h-40 bg-accent/20 blob-2 -z-10 animate-blob" />
      <div className="absolute -right-20 bottom-0 w-56 h-56 bg-fun-blue/10 blob -z-10 animate-blob" style={{ animationDelay: "-3s" }} />
      
      {/* Floating emojis */}
      <span className="absolute top-10 right-1/4 text-2xl animate-float opacity-40">📦</span>
      <span className="absolute bottom-20 left-1/4 text-2xl animate-float opacity-40" style={{ animationDelay: "1s" }}>🎁</span>
      
      <div className="container relative">
        <div className="grid md:grid-cols-2 gap-8">
          {/* News Card */}
          <div className="bg-card rounded-3xl p-8 shadow-card border border-border/50 relative overflow-hidden animate-pop-in opacity-0 tilt-3d glow-border" style={{ animationDelay: "0.1s" }}>
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/10 rounded-full animate-blob" />
            <div className="relative">
              <div className="mb-4">
                <AnimatedBadge variant="hot">
                  <Megaphone className="h-4 w-4" />
                  Latest News
                </AnimatedBadge>
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-3">
                Big Restock <span className="text-gradient-animated">Coming!</span>
              </h3>
              <p className="text-muted-foreground mb-6">
                We're receiving a massive shipment of new inventory this week! Electronics, furniture, home goods, and much more. Follow us on Facebook to be the first to know!
              </p>
              <Link to="/about">
                <Button className="hero-gradient font-bold hover:scale-105 transition-transform hover-shake">
                  <Sparkles className="mr-2 h-4 w-4 animate-wiggle" />
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-fun-blue/10 to-fun-green/10 rounded-2xl p-6 border border-border/50 animate-pop-in opacity-0 tilt-3d hover:shadow-card transition-shadow" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fun-blue/20 shrink-0">
                  <Clock className="h-6 w-6 text-fun-blue animate-bounce-soft" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-foreground">Store Hours</h4>
                  <p className="text-muted-foreground text-sm mt-1">
                    Mon - Sat: 9am - 6pm<br />
                    Sunday: 10am - 4pm
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-fun-orange/10 to-fun-yellow/10 rounded-2xl p-6 border border-border/50 animate-pop-in opacity-0 tilt-3d hover:shadow-card transition-shadow" style={{ animationDelay: "0.3s" }}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fun-orange/20 shrink-0">
                  <MapPin className="h-6 w-6 text-fun-orange animate-bounce-soft" style={{ animationDelay: "0.2s" }} />
                </div>
                <div>
                  <h4 className="font-display font-bold text-foreground">Find Us</h4>
                  <p className="text-muted-foreground text-sm mt-1">
                    Visit our Facebook Marketplace page or come see us in person!
                  </p>
                  <Link to="/about" className="inline-flex items-center text-sm font-bold text-primary mt-2 hover:underline wavy-underline group">
                    Get Directions
                    <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
