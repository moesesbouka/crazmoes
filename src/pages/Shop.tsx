import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { CategorySection } from "@/components/CategorySection";
import { ProductGrid } from "@/components/ProductGrid";
import { NewsletterModal } from "@/components/NewsletterModal";
import { Footer } from "@/components/Footer";
import { fetchActiveListingsProgressive, listingToShopifyShape } from "@/lib/supabase-listings";
import { resolveProductCategory } from "@/lib/categoryMapper";
import type { ShopifyProduct } from "@/lib/shopify";

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newsletterOpen, setNewsletterOpen] = useState(false);

  const searchQuery = searchParams.get("q") || "";
  const sortOption = searchParams.get("sort") || "newest";

  const handleSearchChange = (value: string) => {
    const p = new URLSearchParams(searchParams);
    value ? p.set("q", value) : p.delete("q");
    setSearchParams(p, { replace: true });
  };

  const handleSortChange = (value: string) => {
    const p = new URLSearchParams(searchParams);
    value && value !== "newest" ? p.set("sort", value) : p.delete("sort");
    setSearchParams(p, { replace: true });
  };

  useEffect(() => {
    document.title = "Shop All Inventory | Crazy Moe's";
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetchActiveListingsProgressive((listings, isComplete) => {
      if (cancelled) return;
      const shaped = listings.map(listingToShopifyShape) as unknown as ShopifyProduct[];
      setProducts(shaped);
      if (listings.length > 0) setIsLoading(false);
      setIsLoadingMore(!isComplete);
      if (isComplete) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    });

    return () => { cancelled = true; };
  }, []);

  const filteredAndSorted = useMemo(() => {
    let result = [...products];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.node.title.toLowerCase().includes(q) ||
          p.node.description?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      switch (sortOption) {
        case "title-asc": return a.node.title.localeCompare(b.node.title);
        case "title-desc": return b.node.title.localeCompare(a.node.title);
        case "price-asc": return parseFloat(a.node.priceRange.minVariantPrice.amount) - parseFloat(b.node.priceRange.minVariantPrice.amount);
        case "price-desc": return parseFloat(b.node.priceRange.minVariantPrice.amount) - parseFloat(a.node.priceRange.minVariantPrice.amount);
        case "newest":
        default: return 0;
      }
    });
    return result;
  }, [products, searchQuery, sortOption]);

  const productsByCategory = useMemo(() => {
    const cats: Record<string, ShopifyProduct[]> = {};
    filteredAndSorted.forEach((product) => {
      const cat = resolveProductCategory(product.node.title, product.node.description, product.node.category?.name, product.node.productType);
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(product);
    });
    return Object.keys(cats)
      .sort((a, b) => { if (a === "Other") return 1; if (b === "Other") return -1; return a.localeCompare(b); })
      .map((cat) => ({ category: cat, products: cats[cat] }));
  }, [filteredAndSorted]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header onNewsletterClick={() => setNewsletterOpen(true)} />
      <section className="py-12 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/10 blob animate-blob" />
          <div className="absolute bottom-0 -left-20 w-64 h-64 bg-fun-purple/10 blob-2" />
        </div>
        <div className="container text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gradient-fun mb-4 animate-fade-in-up opacity-0">
            Available Inventory
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto animate-fade-in-up opacity-0" style={{ animationDelay: "100ms" }}>
            {isLoading ? "Loading inventory…" : `${filteredAndSorted.length.toLocaleString()} items available for Buffalo pickup`}
          </p>
        </div>
      </section>

      <main className="container pb-8">
        <SearchFilterBar searchQuery={searchQuery} onSearchChange={handleSearchChange} sortOption={sortOption} onSortChange={handleSortChange} totalProducts={filteredAndSorted.length} />
        {isLoading ? (
          <ProductGrid products={[]} isLoading={true} />
        ) : isSearching ? (
          <ProductGrid products={filteredAndSorted} isLoading={false} />
        ) : (
          <div className="space-y-8">
            {productsByCategory.map(({ category, products: catProducts }, idx) => {
              const startIndex = productsByCategory.slice(0, idx).reduce((acc, c) => acc + c.products.length, 0);
              return <CategorySection key={category} category={category} products={catProducts} startIndex={startIndex} />;
            })}
            {productsByCategory.length === 0 && <ProductGrid products={[]} isLoading={false} />}
            {isLoadingMore && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground animate-pulse">Loading more inventory…</p>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
      <NewsletterModal open={newsletterOpen} onOpenChange={setNewsletterOpen} />
    </div>
  );
};

export default Shop;
