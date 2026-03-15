import { MarketplaceListing } from "@/lib/supabase-listings";
import { Link } from "react-router-dom";

interface ProductCardProps {
  listing: MarketplaceListing;
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

export function ProductCard({ listing }: ProductCardProps) {
  const imageUrl = getFirstImage(listing.images);
  const condition = listing.condition || "Open box";

  return (
    <Link to={`/product/${listing.facebook_id}`}>
      <article className="rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20">
        {/* Image */}
        <div className="aspect-[4/3] rounded-[22px] overflow-hidden bg-secondary">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={listing.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl">
              📦
            </div>
          )}
        </div>

        {/* Title + meta */}
        <div className="flex items-start justify-between gap-3 mt-5">
          <div className="min-w-0">
            <h3 className="text-[1.15rem] font-bold leading-tight line-clamp-2 tracking-tight">
              {listing.title}
            </h3>
            <p className="text-muted-foreground text-[0.92rem] mt-1.5">
              {condition} • Pickup in Buffalo
            </p>
          </div>
          <span className="shrink-0 bg-emerald-500/15 text-emerald-200 px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap">
            Save big
          </span>
        </div>

        {/* Price + CTA */}
        <div className="flex items-end justify-between gap-3 mt-5">
          <div>
            <p className="text-[2rem] font-black tracking-tight leading-none">
              {formatPrice(listing.price)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-foreground text-background px-4 py-2.5 text-sm font-semibold hover:bg-foreground/90 transition-colors">
            View Deal
          </span>
        </div>
      </article>
    </Link>
  );
}
