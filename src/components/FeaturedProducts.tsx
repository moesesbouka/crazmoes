import { MarketplaceListing } from "@/lib/supabase-listings";
import { ProductCard } from "./ProductCard";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface FeaturedProductsProps {
  listings: MarketplaceListing[];
  isLoading: boolean;
}

export function FeaturedProducts({ listings, isLoading }: FeaturedProductsProps) {
  if (isLoading) {
    return (
      <section className="py-24">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card h-[420px] shimmer" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const featured = listings.slice(0, 6);

  return (
    <section className="py-24 relative">
      {/* Subtle section divider gradient */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12"
        >
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-primary font-semibold">
              Latest inventory
            </span>
            <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-black tracking-tight mt-2">
              Just dropped.
            </h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors group"
          >
            View all inventory
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((listing, i) => (
            <ProductCard key={listing.facebook_id} listing={listing} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
