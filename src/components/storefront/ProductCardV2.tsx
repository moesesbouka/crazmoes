import { ArrowUpRight, MapPin, Package, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ProductImage } from "@/components/ProductImage";
import { classifyListing } from "@/storefront/taxonomy";
import { cleanImages, formatCatalogPrice } from "@/storefront/catalog";
import type { StorefrontListing } from "@/storefront/types";

interface ProductCardV2Props {
  listing: StorefrontListing;
  index?: number;
}

export function ProductCardV2({ listing, index = 0 }: ProductCardV2Props) {
  const images = cleanImages(listing.images);
  const primaryImage = images[0];
  const { department, subcategory } = classifyListing(listing);
  const eyebrow = subcategory?.name ?? department?.name ?? listing.category ?? "More Deals";

  return (
    <motion.article
      initial={{ opacity: 0, y: 70, scale: 0.88, rotate: index % 2 === 0 ? -2 : 2 }}
      whileInView={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay: Math.min(index, 8) * 0.045, type: "spring" }}
      whileHover={{ y: -10, scale: 1.025 }}
      className="group h-full"
    >
      <Link
        to={`/product/${listing.facebook_id}`}
        className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-white/8 bg-card/75 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.8)] backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_70px_-28px_hsl(var(--primary)/0.28)]"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary/60">
          {primaryImage ? (
            <ProductImage
              src={primaryImage}
              alt={listing.title}
              className="h-full w-full object-contain p-3 transition-transform duration-700 group-hover:scale-[1.035]"
              showProcessingIndicator={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary via-secondary/80 to-background">
              <Package className="h-12 w-12 text-muted-foreground/25" />
            </div>
          )}

          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
            <span className="max-w-[75%] truncate rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/85 backdrop-blur-xl">
              {eyebrow}
            </span>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-black/55 text-white opacity-0 backdrop-blur-xl transition-all duration-300 group-hover:opacity-100">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white/85 backdrop-blur-xl">
              <Sparkles className="h-3 w-3" />
              {images.length} photos
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <h3 className="line-clamp-2 min-h-[2.6rem] text-[0.96rem] font-bold leading-snug tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary">
            {listing.title}
          </h3>

          <div className="mt-2 flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{listing.location || "Buffalo pickup"}</span>
          </div>

          <div className="mt-auto flex items-end justify-between gap-3 border-t border-border/70 pt-4">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Deal price</p>
              <motion.p animate={{ textShadow: ["0 0 0px transparent", "0 0 18px hsl(var(--primary)/.45)", "0 0 0px transparent"] }} transition={{duration:2.4,repeat:Infinity,delay:index*.12}} className="mt-1 text-xl font-black tracking-tight text-primary">
                {formatCatalogPrice(listing.price)}
              </motion.p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">View deal →</span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
