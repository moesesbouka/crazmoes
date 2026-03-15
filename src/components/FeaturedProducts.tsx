import { MarketplaceListing } from "@/lib/supabase-listings";
import { ProductCard } from "./ProductCard";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface FeaturedProductsProps {
  listings: MarketplaceListing[];
  isLoading: boolean;
}

export function FeaturedProducts({ listings, isLoading }: FeaturedProductsProps) {
  if (isLoading) {
    return (
      <section id="inventory" className="py-20">
        <div className="container">
          <div className="mb-7">
            <p className="text-xs uppercase tracking-[0.22em] text-orange-200 mb-2.5">Latest inventory</p>
            <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-black tracking-tight">Product cards built to convert.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card h-96 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const featured = listings.slice(0, 6);

  return (
    <section id="inventory" className="py-20">
      <div className="container">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-orange-200 mb-2.5">Latest inventory</p>
            <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-black tracking-tight">
              Product cards built to convert.
            </h2>
          </div>
          <p className="max-w-lg text-muted-foreground leading-relaxed">
            Every listing surfaces the info shoppers care about: price, savings, condition, and pickup details.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.map((listing) => (
            <ProductCard key={listing.facebook_id} listing={listing} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors"
          >
            View all inventory
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
