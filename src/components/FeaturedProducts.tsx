import { ShopifyProduct } from "@/lib/shopify";
import { ProductCard } from "./ProductCard";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";

interface FeaturedProductsProps {
  products: ShopifyProduct[];
  isLoading: boolean;
}

export function FeaturedProducts({ products, isLoading }: FeaturedProductsProps) {
  if (isLoading) {
    return (
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gradient-fun">
              Featured Finds
            </h2>
            <p className="mt-2 text-muted-foreground">Hot items you don't want to miss!</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Show first 8 products as featured
  const featured = products.slice(0, 8);

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Animated decorative blobs */}
      <div className="absolute -right-32 top-1/2 w-64 h-64 bg-fun-yellow/10 blob -z-10 animate-blob" />
      <div className="absolute -left-32 bottom-0 w-48 h-48 bg-fun-red/10 blob-2 -z-10 animate-blob" style={{ animationDelay: "-4s" }} />
      
      <div className="container relative">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-fun-red/10 text-fun-red px-4 py-1.5 rounded-full text-sm font-bold mb-3 animate-bounce-in">
              🔥 Hot Right Now
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
              Featured <span className="text-gradient-animated">Finds</span>
            </h2>
            <p className="mt-2 text-muted-foreground animate-fade-in-up opacity-0" style={{ animationDelay: "0.2s" }}>Check out these amazing closeout deals!</p>
          </div>
          <Link to="/shop">
            <Button variant="ghost" className="font-bold text-primary hover:text-primary/80 hover-shake animate-fade-in-up opacity-0" style={{ animationDelay: "0.3s" }}>
              View All
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {featured.map((product, index) => (
            <ProductCard key={product.node.id} product={product} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
