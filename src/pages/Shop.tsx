import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/Header";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { CategorySection } from "@/components/CategorySection";
import { ProductGrid } from "@/components/ProductGrid";
import { NewsletterModal } from "@/components/NewsletterModal";
import { Footer } from "@/components/Footer";
import { ImageProcessingProgress } from "@/components/ImageProcessingProgress";
import { fetchAllProducts, ShopifyProduct } from "@/lib/shopify";
import { resolveProductCategory } from "@/lib/categoryMapper";
import { useImageProcessingStore } from "@/lib/imageProcessingStore";

const Shop = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("title-asc");
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const setTotalImages = useImageProcessingStore((state) => state.setTotalImages);

  useEffect(() => {
    document.title = "Shop All Products | Crazy Moe's";
  }, []);

  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      try {
        const data = await fetchAllProducts();
        setProducts(data);
        // Count images for progress tracking
        const imageCount = data.filter(p => p.node.images.edges.length > 0).length;
        setTotalImages(imageCount);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, []);

  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) =>
        p.node.title.toLowerCase().includes(query) ||
        p.node.description?.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      switch (sortOption) {
        case "title-asc":
          return a.node.title.localeCompare(b.node.title);
        case "title-desc":
          return b.node.title.localeCompare(a.node.title);
        case "price-asc":
          return (
            parseFloat(a.node.priceRange.minVariantPrice.amount) -
            parseFloat(b.node.priceRange.minVariantPrice.amount)
          );
        case "price-desc":
          return (
            parseFloat(b.node.priceRange.minVariantPrice.amount) -
            parseFloat(a.node.priceRange.minVariantPrice.amount)
          );
        default:
          return 0;
      }
    });

    return result;
  }, [products, searchQuery, sortOption]);

  const productsByCategory = useMemo(() => {
    const categories: Record<string, ShopifyProduct[]> = {};
    
    filteredAndSortedProducts.forEach((product) => {
      const category = resolveProductCategory(
        product.node.title,
        product.node.description,
        product.node.category?.name,
        product.node.productType
      );
      
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(product);
    });

    const sortedCategories = Object.keys(categories).sort((a, b) => {
      if (a === "Other") return 1;
      if (b === "Other") return -1;
      return a.localeCompare(b);
    });

    return sortedCategories.map((category) => ({
      category,
      products: categories[category],
    }));
  }, [filteredAndSortedProducts]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header onNewsletterClick={() => setNewsletterOpen(true)} />
      
      {/* Page Header */}
      <section className="py-12 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/10 blob animate-blob" />
          <div className="absolute bottom-0 -left-20 w-64 h-64 bg-fun-purple/10 blob-2" />
        </div>
        <div className="container text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gradient-fun mb-4 animate-fade-in-up opacity-0">
            Shop All Products
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto animate-fade-in-up opacity-0" style={{ animationDelay: '100ms' }}>
            Browse our complete inventory of amazing finds. Search, filter, and discover your next treasure!
          </p>
        </div>
      </section>
      
      <main className="container pb-8">
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortOption={sortOption}
          onSortChange={setSortOption}
          totalProducts={filteredAndSortedProducts.length}
        />
        
        {isLoading ? (
          <ProductGrid products={[]} isLoading={true} />
        ) : isSearching ? (
          <ProductGrid products={filteredAndSortedProducts} isLoading={false} />
        ) : (
          <div className="space-y-8">
            {productsByCategory.map(({ category, products: categoryProducts }, categoryIndex) => {
              const startIndex = productsByCategory
                .slice(0, categoryIndex)
                .reduce((acc, cat) => acc + cat.products.length, 0);
              
              return (
                <CategorySection
                  key={category}
                  category={category}
                  products={categoryProducts}
                  startIndex={startIndex}
                />
              );
            })}
            
            {productsByCategory.length === 0 && (
              <ProductGrid products={[]} isLoading={false} />
            )}
          </div>
        )}
      </main>
      
      <Footer />
      
      <ImageProcessingProgress />
      
      <NewsletterModal
        open={newsletterOpen}
        onOpenChange={setNewsletterOpen}
      />
    </div>
  );
};

export default Shop;
