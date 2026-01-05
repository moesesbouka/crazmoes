import { ShopifyProduct, formatPrice } from "@/lib/shopify";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AnimatedBadge } from "./AnimatedBadge";
import { ProductImage } from "./ProductImage";
interface ProductCardProps {
  product: ShopifyProduct;
  index: number;
}

export function ProductCard({ product, index }: ProductCardProps) {
  const { node } = product;
  const price = node.priceRange.minVariantPrice;
  const image = node.images.edges[0]?.node;
  const isAvailable = node.variants.edges.some((v) => v.node.availableForSale);
  const isNewArrival = index < 4; // First 4 items are "new"
  const isHotDeal = Math.random() > 0.7; // Random hot deals for demo

  const handleCashAppBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Open Cash App with payment info
    const amount = parseFloat(price.amount);
    const note = encodeURIComponent(`Crazy Moe's - ${node.title}`);
    
    // Cash App payment link format
    window.open(`https://cash.app/$MOEB1978/${amount}?note=${note}`, '_blank');
    
    toast.success("Opening Cash App", {
      description: "Complete your payment in Cash App, then schedule your pickup!",
    });
  };

  return (
    <Link to={`/product/${node.handle}`}>
      <Card 
        className="group overflow-hidden border-border/50 bg-card shadow-soft hover:shadow-card transition-all duration-300 cursor-pointer rounded-2xl animate-fade-in-up opacity-0 tilt-3d glow-border"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="relative aspect-square overflow-hidden bg-background rounded-t-2xl">
          <ProductImage
            src={image?.url || ''}
            alt={image?.altText || node.title}
            className="h-full w-full p-2 transition-all duration-500 group-hover:scale-110 group-hover:rotate-1"
            showProcessingIndicator={false}
          />
          
          {!isAvailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Badge variant="secondary" className="text-xs font-bold">
                Sold Out
              </Badge>
            </div>
          )}
          
          {/* Stacked badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {isAvailable && (
              <AnimatedBadge variant="sale">
                In Stock
              </AnimatedBadge>
            )}
            {isNewArrival && isAvailable && (
              <AnimatedBadge variant="new">
                New
              </AnimatedBadge>
            )}
            {isHotDeal && isAvailable && (
              <AnimatedBadge variant="hot">
                Hot
              </AnimatedBadge>
            )}
          </div>
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-display font-bold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {node.title}
          </h3>
          
          <div className="mt-3 flex items-center justify-between">
            <span className="font-display text-xl font-black text-gradient-animated">
              {formatPrice(price.amount, price.currencyCode)}
            </span>
          </div>
          
          {node.description && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
              {node.description}
            </p>
          )}

          {isAvailable && (
            <Button
              onClick={handleCashAppBuy}
              className="w-full mt-3 bg-[#00D632] hover:bg-[#00B82B] text-primary-foreground font-bold rounded-xl hover-bounce transition-all duration-300 hover:shadow-lg"
              size="sm"
            >
              <DollarSign className="h-4 w-4 mr-1 animate-bounce-soft" />
              Buy Now via Cash App
            </Button>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}