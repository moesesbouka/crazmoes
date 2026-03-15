import { MarketplaceListing } from "@/lib/supabase-listings";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, ArrowUpRight } from "lucide-react";

interface ProductCardProps {
  listing: MarketplaceListing;
  index?: number;
}

function getFirstImage(images: unknown): string | null {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") return images[0];
  return null;
}

function formatPrice(price: number | null): string {
  if (!price || price === 0) return "Make Offer";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
}

export function ProductCard({ listing, index = 0 }: ProductCardProps) {
  const imageUrl = getFirstImage(listing.images);
  const condition = listing.condition || "Open box";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={`/product/${listing.facebook_id}`} className="group block">
        <article className="relative rounded-2xl border border-border bg-card overflow-hidden transition-all duration-500 hover:border-primary/30 glow-border">
          {/* Image section */}
          <div className="aspect-[4/3] overflow-hidden bg-secondary relative">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={listing.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-5xl">
                📦
              </div>
            )}

            {/* Condition badge overlay */}
            <div className="absolute top-3 left-3 flex gap-2">
              <span className="px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-md text-xs font-semibold text-foreground border border-border/50">
                {condition}
              </span>
            </div>

            {/* Hover arrow */}
            <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              <ArrowUpRight className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="text-base font-bold leading-tight line-clamp-2 tracking-tight group-hover:text-primary transition-colors duration-300">
              {listing.title}
            </h3>

            <div className="flex items-center gap-2 mt-2.5 text-muted-foreground text-xs">
              <MapPin className="h-3 w-3" />
              <span>Pickup in Buffalo</span>
            </div>

            {/* Price row */}
            <div className="flex items-end justify-between gap-3 mt-4 pt-4 border-t border-border">
              <p className="text-2xl font-black tracking-tight leading-none text-foreground">
                {formatPrice(listing.price)}
              </p>
              <span className="shrink-0 rounded-full bg-primary/10 text-primary px-3.5 py-2 text-xs font-bold whitespace-nowrap">
                View Deal
              </span>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
