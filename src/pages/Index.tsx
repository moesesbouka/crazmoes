import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { PickupInfoSection } from "@/components/PickupInfoSection";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { ShopByCategory } from "@/components/ShopByCategory";
import { NewsAndUpdates } from "@/components/NewsAndUpdates";
import { NewsletterModal } from "@/components/NewsletterModal";
import { Footer } from "@/components/Footer";
import { FloatingParticles } from "@/components/FloatingParticles";
import { fetchProducts, ShopifyProduct } from "@/lib/shopify";

const Index = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newsletterOpen, setNewsletterOpen] = useState(false);

  useEffect(() => {
    document.title = "Crazy Moe's - Buffalo Pickup Deals on Quality Consumer Goods";
  }, []);

  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      try {
        const data = await fetchProducts(20);
        setProducts(data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background floating particles */}
      <FloatingParticles count={12} />
      
      <Header onNewsletterClick={() => setNewsletterOpen(true)} />
      <HeroSection />
      <PickupInfoSection />
      <FeaturedProducts products={products} isLoading={isLoading} />
      <ShopByCategory />
      <NewsAndUpdates />
      <Footer />
      
      <NewsletterModal
        open={newsletterOpen}
        onOpenChange={setNewsletterOpen}
      />
    </div>
  );
};

export default Index;
