import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { ProductGrid } from "@/components/ProductGrid";
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

  return (
    <>
      <Helmet>
        <title>Crazy Moe's - Quality Consumer Goods at Unbeatable Prices</title>
        <meta
          name="description"
          content="Browse our complete inventory of quality consumer goods. Search, filter, and find exactly what you need at unbeatable prices."
        />
      </Helmet>

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
          
          <ProductGrid
            products={filteredAndSortedProducts}
            isLoading={isLoading}
          />
        </main>
        
        <Footer />
        
        <NewsletterModal
          open={newsletterOpen}
          onOpenChange={setNewsletterOpen}
        />
      </div>
    </>
  );
};

export default Index;
