import { ShopifyProduct, formatPrice } from "@/lib/shopify";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface ProductCardProps {
  product: ShopifyProduct;
  index: number;
}

export function ProductCard({ product, index }: ProductCardProps) {
  const { node } = product;
  const price = node.priceRange.minVariantPrice;
  const image = node.images.edges[0]?.node;
  const isAvailable = node.variants.edges.some((v) => v.node.availableForSale);

  const handleCashAppBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Open Cash App with payment info
    const amount = parseFloat(price.amount);
    const note = encodeURIComponent(`Crazy Moe's - ${node.title}`);
    
    // Cash App payment link format
    window.open(`https://cash.app/$CrazyMoes/${amount}?note=${note}`, '_blank');
    
    toast.success("Opening Cash App", {
      description: "Complete your payment in Cash App, then schedule your pickup!",
    });
  };

  return (
    <Link to={`/product/${node.handle}`}>
      <Card 
        className="group overflow-hidden border-border/50 bg-card shadow-soft hover:shadow-card transition-all duration-300 cursor-pointer rounded-2xl animate-fade-in-up opacity-0 hover:-translate-y-1"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="relative aspect-square overflow-hidden bg-white rounded-t-2xl">
          {image ? (
            <img
              src={image.url}
              alt={image.altText || node.title}
              className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-110"
              style={{ backgroundColor: 'white' }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white">
              <Package className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          
          {!isAvailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Badge variant="secondary" className="text-xs font-bold">
                Sold Out
              </Badge>
            </div>
          )}
          
          {isAvailable && (
            <Badge className="absolute top-3 right-3 fun-gradient border-0 font-bold">
              In Stock
            </Badge>
          )}
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-display font-bold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {node.title}
          </h3>
          
          <div className="mt-3 flex items-center justify-between">
            <span className="font-display text-xl font-bold text-gradient">
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
              className="w-full mt-3 bg-[#00D632] hover:bg-[#00B82B] text-white font-bold rounded-xl"
              size="sm"
            >
              <DollarSign className="h-4 w-4 mr-1" />
              Buy Now via Cash App
            </Button>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
