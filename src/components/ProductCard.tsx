import { ShopifyProduct, formatPrice } from "@/lib/shopify";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { Link } from "react-router-dom";

interface ProductCardProps {
  product: ShopifyProduct;
  index: number;
}

export function ProductCard({ product, index }: ProductCardProps) {
  const { node } = product;
  const price = node.priceRange.minVariantPrice;
  const image = node.images.edges[0]?.node;
  const isAvailable = node.variants.edges.some((v) => v.node.availableForSale);

  return (
    <Link to={`/product/${node.handle}`}>
      <Card 
        className="group overflow-hidden border-border/50 bg-card shadow-soft hover:shadow-card transition-all duration-300 cursor-pointer animate-fade-in-up"
        style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {image ? (
            <img
              src={image.url}
              alt={image.altText || node.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          
          {!isAvailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Badge variant="secondary" className="text-xs">
                Sold Out
              </Badge>
            </div>
          )}
          
          {isAvailable && (
            <Badge className="absolute top-3 right-3 hero-gradient border-0">
              In Stock
            </Badge>
          )}
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-display font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {node.title}
          </h3>
          
          <div className="mt-3 flex items-center justify-between">
            <span className="font-display text-lg font-bold text-primary">
              {formatPrice(price.amount, price.currencyCode)}
            </span>
          </div>
          
          {node.description && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
              {node.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
