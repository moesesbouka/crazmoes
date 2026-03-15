import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { MarketplaceListing } from "@/lib/supabase-listings";

interface HeroSectionProps {
  featuredListing?: MarketplaceListing | null;
}

function getFirstImage(images: unknown): string | null {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") {
    return images[0];
  }
  return null;
}

function formatPrice(price: number | null): string {
  if (!price || price === 0) return "Make Offer";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
}

export function HeroSection({ featuredListing }: HeroSectionProps) {
  const featuredImage = featuredListing ? getFirstImage(featuredListing.images) : null;

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Ambient glow effects */}
      <div className="absolute -right-20 -top-20 w-[360px] h-[360px] rounded-full bg-foreground/[0.08] blur-[60px] pointer-events-none" />
      <div className="absolute -left-20 top-5 w-[340px] h-[340px] rounded-full bg-primary/20 blur-[60px] pointer-events-none" />

      <div className="container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 py-20 lg:py-24">
          {/* Left: messaging */}
          <div className="flex flex-col justify-center">
            <div className="inline-flex self-start px-3 py-2 rounded-full border border-primary/25 bg-primary/[0.14] text-orange-200 text-sm font-semibold">
              Truckload liquidation • Open box • Closeout deals
            </div>

            <h1 className="text-[clamp(2.5rem,7vw,5.2rem)] font-black leading-[0.95] tracking-[-0.05em] mt-5">
              Big brand deals without big box prices.
            </h1>

            <p className="mt-6 max-w-xl text-muted-foreground text-lg leading-relaxed">
              Premium open-box and closeout inventory at 40–70% off retail.
              Appointment pickup in Buffalo, NY — new drops every week.
            </p>

            <div className="flex flex-wrap gap-3 mt-7">
              <Link to="/shop">
                <Button className="rounded-full bg-primary text-primary-foreground font-semibold px-6 py-3 shadow-[0_16px_30px_rgba(249,115,22,0.2)] hover:bg-primary/90 transition-all">
                  Browse Latest Arrivals
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#visit">
                <Button variant="outline" className="rounded-full border-border text-foreground hover:bg-secondary px-6 py-3">
                  Get Directions
                </Button>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
              {[
                "Fresh inventory drops weekly",
                "Buffalo pickup deals, no endless browsing",
                "Clear item condition and savings badges",
                "Reserve fast before it's gone",
              ].map((text) => (
                <div
                  key={text}
                  className="px-4 py-3.5 rounded-2xl border border-border bg-card text-[0.95rem] text-muted-foreground"
                >
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right: featured deal + trust cards */}
          <div className="flex flex-col gap-4">
            {/* Featured deal panel */}
            <article className="rounded-2xl border border-border bg-card p-5 shadow-[0_25px_70px_rgba(0,0,0,0.28)]">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-muted-foreground text-sm">Featured deal</p>
                  <h3 className="text-lg font-bold tracking-tight mt-1">
                    {featuredListing?.title || "Premium Closeout Deal"}
                  </h3>
                </div>
                <span className="shrink-0 bg-emerald-500/15 text-emerald-200 px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap">
                  Up to 70% off
                </span>
              </div>

              <div className="rounded-3xl aspect-[4/3] overflow-hidden bg-secondary">
                {featuredImage ? (
                  <img
                    src={featuredImage}
                    alt={featuredListing?.title || "Featured deal"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-muted-foreground text-5xl">
                    📦
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="rounded-2xl bg-secondary p-3.5">
                  <p className="text-muted-foreground text-xs">Condition</p>
                  <p className="font-bold text-sm mt-1">{featuredListing?.condition || "New in box"}</p>
                </div>
                <div className="rounded-2xl bg-secondary p-3.5">
                  <p className="text-muted-foreground text-xs">Pickup</p>
                  <p className="font-bold text-sm mt-1">Buffalo, NY</p>
                </div>
                <div className="rounded-2xl bg-secondary p-3.5">
                  <p className="text-muted-foreground text-xs">Price</p>
                  <p className="font-bold text-sm mt-1">{featuredListing ? formatPrice(featuredListing.price) : "$499"}</p>
                </div>
              </div>
            </article>

            {/* Trust mini cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-border bg-card p-5">
                <p className="text-muted-foreground text-sm">Store trust</p>
                <p className="text-2xl font-black tracking-tight mt-2">Fresh stock</p>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  Newest arrivals first with clear timestamps and limited-quantity urgency.
                </p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-5">
                <p className="text-muted-foreground text-sm">Conversion focus</p>
                <p className="text-2xl font-black tracking-tight mt-2">Faster pickup</p>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  Reserve buttons, sticky contact, and map-first store info.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
