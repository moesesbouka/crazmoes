import { Sparkles, TrendingUp, Zap } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/30 rounded-full blur-3xl" />
      </div>
      
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground animate-fade-in-up">
            <Sparkles className="h-4 w-4" />
            New inventory added daily
          </div>
          
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl animate-fade-in-up [animation-delay:100ms] opacity-0">
            Quality Consumer Goods
            <span className="block text-gradient mt-2">At Unbeatable Prices</span>
          </h1>
          
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in-up [animation-delay:200ms] opacity-0">
            Browse our complete inventory of quality products. Search, filter, and find exactly what you need. New items added regularly!
          </p>
          
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 animate-fade-in-up [animation-delay:300ms] opacity-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <TrendingUp className="h-4 w-4 text-accent-foreground" />
              </div>
              <span>100+ Products</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <Zap className="h-4 w-4 text-accent-foreground" />
              </div>
              <span>Updated Daily</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
