import { MarketplaceListing } from "@/lib/supabase-listings";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ProductImage } from "./ProductImage";

interface ProductCardProps {
  listing: MarketplaceListing;
  index: number;
}

function getFirstImage(images: unknown): string {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") {
    return images[0];
  }
  return "/placeholder.svg";
}

function formatCardPrice(price: number | null): string {
  if (!price || price === 0) return "Make Offer";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
}

export function ProductCard({ listing, index }: ProductCardProps) {
  const imageUrl = getFirstImage(listing.images);
  const isNewArrival = index < 4;

  const handleCashAppBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const amount = listing.price ?? 0;
    const note = encodeURIComponent(`Crazy Moe's - ${listing.title}`);
    window.open(`https://cash.app/$MOEB1978/${amount}?note=${note}`, '_blank');
    toast.success("Opening Cash App", {
      description: "Complete your payment in Cash App, then schedule your pickup!",
    });
  };

  return (
    <Link to={`/product/${listing.facebook_id}`}>
      <Card
        className="group overflow-hidden border-border/50 bg-card shadow-soft hover:shadow-card transition-all duration-300 cursor-pointer rounded-2xl animate-fade-in-up opacity-0 tilt-3d glow-border"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="relative aspect-square overflow-hidden bg-background rounded-t-2xl">
          <ProductImage
            src={imageUrl}
            alt={listing.title}
            className="h-full w-full p-2 transition-all duration-500 group-hover:scale-110 group-hover:rotate-1"
            showProcessingIndicator={false}
          />

          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <Badge className="bg-primary text-primary-foreground text-xs font-bold">In Stock</Badge>
            {isNewArrival && (
              <Badge className="bg-accent text-accent-foreground text-xs font-bold">New</Badge>
            )}
          </div>
        </div>

        <CardContent className="p-4">
          <h3 className="font-display font-bold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {listing.title}
          </h3>

          <div className="mt-3 flex items-center justify-between">
            <span className="font-display text-xl font-black text-gradient-animated">
              {formatCardPrice(listing.price)}
            </span>
          </div>

          {listing.description && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
              {listing.description}
            </p>
          )}

          <Button
            onClick={handleCashAppBuy}
            className="w-full mt-3 bg-[#00D632] hover:bg-[#00B82B] text-primary-foreground font-bold rounded-xl hover-bounce transition-all duration-300 hover:shadow-lg"
            size="sm"
          >
            <DollarSign className="h-4 w-4 mr-1" />
            Buy Now via Cash App
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
