import { ShopifyProduct } from "@/lib/shopify";
import { ProductCard } from "./ProductCard";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface CategorySectionProps {
  category: string;
  products: ShopifyProduct[];
  startIndex: number;
}

export function CategorySection({ category, products, startIndex }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const displayProducts = isExpanded ? products : products.slice(0, 4);

  return (
    <section className="animate-fade-in-up opacity-0" style={{ animationDelay: '100ms' }}>
      <div 
        className="flex items-center justify-between mb-6 cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-1.5 bg-gradient-to-b from-primary to-fun-purple rounded-full" />
          <h2 className="font-display text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
            {category}
          </h2>
          <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full font-medium">
            {products.length} items
          </span>
        </div>
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          {isExpanded ? (
            <>
              <span className="hidden sm:inline">Show Less</span>
              <ChevronUp className="h-5 w-5" />
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Show All</span>
              <ChevronDown className="h-5 w-5" />
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {displayProducts.map((product, index) => (
          <ProductCard 
            key={product.node.id} 
            product={product} 
            index={startIndex + index} 
          />
        ))}
      </div>
    </section>
  );
}
