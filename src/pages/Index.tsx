import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { ProductGrid } from "@/components/ProductGrid";
import { CategorySection } from "@/components/CategorySection";
import { NewsletterModal } from "@/components/NewsletterModal";
import { Footer } from "@/components/Footer";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";

const Index = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("title-asc");
  const [newsletterOpen, setNewsletterOpen] = useState(false);

  useEffect(() => {
    document.title = "Crazy Moe's - Quality Consumer Goods at Unbeatable Prices";
  }, []);

  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      try {
        const data = await fetchProducts(100);
        setProducts(data);
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

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) =>
        p.node.title.toLowerCase().includes(query) ||
        p.node.description?.toLowerCase().includes(query)
      );
    }

    // Sort products
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

  // Group products by category
  const productsByCategory = useMemo(() => {
    const categories: Record<string, ShopifyProduct[]> = {};
    
    filteredAndSortedProducts.forEach((product) => {
      const category = product.node.productType || "Other";
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(product);
    });

    // Sort categories alphabetically, but put "Other" at the end
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

  // Check if we're searching (show flat grid) or not (show categories)
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header onNewsletterClick={() => setNewsletterOpen(true)} />
      <HeroSection />
      
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
      
      <NewsletterModal
        open={newsletterOpen}
        onOpenChange={setNewsletterOpen}
      />
    </div>
  );
};

export default Index;
