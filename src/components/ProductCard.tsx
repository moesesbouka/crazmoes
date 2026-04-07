import { MarketplaceListing } from "@/lib/supabase-listings";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, ArrowUpRight } from "lucide-react";

interface ProductCardProps {
  listing: MarketplaceListing;
  index?: number;
}

// Only Supabase-hosted images are reliable — FB CDN requires session cookies
function getReliableImage(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;
  const first = images[0];
  if (typeof first !== "string") return null;
  // Only trust Supabase storage URLs — FB CDN will 403 on external requests
  if (first.includes("supabase.co/storage")) return first;
  return null;
}

function getCategoryIcon(title: string, category: string | null): string {
  const t = (title + " " + (category || "")).toLowerCase();
  if (/(tv|monitor|laptop|phone|iphone|ipad|tablet|computer|camera|headphone|speaker|console|playstation|xbox|nintendo|router|electronic)/.test(t)) return "📺";
  if (/(sofa|couch|chair|table|desk|bed|mattress|dresser|lamp|shelf|furniture)/.test(t)) return "🛋️";
  if (/(microwave|fridge|refrigerator|washer|dryer|dishwasher|oven|freezer|appliance)/.test(t)) return "🏠";
  if (/(vacuum|blender|air fryer|toaster|coffee|mixer|kettle|home good)/.test(t)) return "🍳";
  if (/(tool|drill|saw|wrench|hammer|power tool)/.test(t)) return "🔧";
  if (/(toy|lego|game|puzzle|kids|children|baby|stroller)/.test(t)) return "🧸";
  if (/(shoe|sneaker|boot|jacket|shirt|pants|clothing|apparel|dress)/.test(t)) return "👕";
  if (/(book|textbook|novel|magazine)/.test(t)) return "📚";
  if (/(bike|bicycle|scooter|outdoor|garden|lawn|patio)/.test(t)) return "🌿";
  if (/(car|truck|auto|vehicle|tire|wheel)/.test(t)) return "🚗";
  if (/(sport|gym|fitness|weight|exercise)/.test(t)) return "⚽";
  return "📦";
}

function formatPrice(price: number | null): string {
  if (!price || price === 0) return "Make Offer";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
}

export function ProductCard({ listing, index = 0 }: ProductCardProps) {
  const imageUrl = getReliableImage(listing.images);
  const icon = getCategoryIcon(listing.title || "", listing.category);
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
                onError={(e) => {
                  // If even supabase URL fails, show placeholder
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    (e.target as HTMLImageElement).style.display = "none";
                    const ph = parent.querySelector(".icon-placeholder") as HTMLElement;
                    if (ph) ph.style.display = "flex";
                  }
                }}
              />
            ) : null}

            {/* Icon placeholder — shown when no permanent image available */}
            <div
              className="icon-placeholder w-full h-full flex flex-col items-center justify-center gap-2"
              style={{ display: imageUrl ? "none" : "flex", background: "linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(var(--muted)) 100%)" }}
            >
              <span style={{ fontSize: "2.5rem", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>{icon}</span>
              <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", color: "hsl(var(--muted-foreground))", textTransform: "uppercase", opacity: 0.6 }}>
                {listing.category || "Item"}
              </span>
            </div>

            {/* Condition badge */}
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

            <div className="flex items-end justify-between gap-3 mt-4 pt-4 border-t border-border">
              <p className="text-2xl font-black tracking-tight leading-none text-foreground">
                {formatPrice(listing.price)}
              </p>
              <span className="shrink-0 rounded-full bg-primary/10 text-primary px-3.5 py-2 text-xs font-bold whitespace-nowrap">
                View Deal →
              </span>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
