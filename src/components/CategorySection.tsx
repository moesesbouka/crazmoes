import { ShopifyProduct } from "@/lib/shopify";
import { ProductCard } from "./ProductCard";
import { ChevronRight } from "lucide-react";

interface CategorySectionProps {
  category: string;
  products: ShopifyProduct[];
  startIndex: number;
}

export function CategorySection({ category, products, startIndex }: CategorySectionProps) {
  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-display text-2xl font-bold text-foreground">
          {category}
        </h2>
        <span className="text-sm text-muted-foreground">
          ({products.length} {products.length === 1 ? 'item' : 'items'})
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product, index) => (
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
