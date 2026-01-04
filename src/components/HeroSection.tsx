import { Sparkles, ArrowRight, Zap, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
      {/* Playful background blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/20 blob animate-blob" />
        <div className="absolute top-1/2 -left-20 w-64 h-64 bg-fun-blue/20 blob-2 animate-blob" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-10 right-1/4 w-72 h-72 bg-accent/30 blob animate-blob" style={{ animationDelay: '4s' }} />
        <div className="absolute top-20 left-1/3 w-32 h-32 bg-fun-yellow/20 rounded-full animate-float" />
      </div>
      
      <div className="container">
        <div className="mx-auto max-w-4xl text-center">
          {/* Fun badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full fun-gradient px-5 py-2.5 text-sm font-bold text-primary-foreground animate-fade-in-up shadow-fun">
            <Sparkles className="h-4 w-4 animate-wiggle" />
            Fresh inventory added daily!
            <Sparkles className="h-4 w-4 animate-wiggle" style={{ animationDelay: '0.5s' }} />
          </div>
          
          <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl animate-fade-in-up opacity-0" style={{ animationDelay: '100ms' }}>
            <span className="text-gradient-fun">Crazy Deals</span>
            <br />
            <span className="text-foreground">at Crazy Moe's!</span>
          </h1>
          
          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in-up opacity-0 font-medium" style={{ animationDelay: '200ms' }}>
            Your one-stop shop for amazing finds! From furniture to electronics, we've got treasures waiting just for you.
          </p>
          
          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-in-up opacity-0" style={{ animationDelay: '300ms' }}>
            <Link to="/shop">
              <Button size="lg" className="hero-gradient text-lg font-bold px-8 py-6 rounded-2xl shadow-glow hover:scale-105 transition-transform">
                Shop All Products
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/about">
              <Button size="lg" variant="outline" className="text-lg font-bold px-8 py-6 rounded-2xl border-2 hover:bg-accent hover:border-accent transition-all">
                Visit Us
              </Button>
            </Link>
          </div>
          
          {/* Fun stats */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 animate-fade-in-up opacity-0" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-3 bg-card rounded-2xl px-6 py-4 shadow-card">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fun-blue/20">
                <TrendingUp className="h-6 w-6 text-fun-blue" />
              </div>
              <div className="text-left">
                <span className="block text-2xl font-bold font-display text-foreground">500+</span>
                <span className="text-sm text-muted-foreground">Products</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-card rounded-2xl px-6 py-4 shadow-card">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fun-green/20">
                <Zap className="h-6 w-6 text-fun-green" />
              </div>
              <div className="text-left">
                <span className="block text-2xl font-bold font-display text-foreground">Daily</span>
                <span className="text-sm text-muted-foreground">New Arrivals</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-card rounded-2xl px-6 py-4 shadow-card">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fun-yellow/20">
                <Star className="h-6 w-6 text-fun-orange" />
              </div>
              <div className="text-left">
                <span className="block text-2xl font-bold font-display text-foreground">Up to 75%</span>
                <span className="text-sm text-muted-foreground">Off Retail</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
