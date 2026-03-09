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
import { fetchActiveListings, MarketplaceListing } from "@/lib/supabase-listings";

const Index = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newsletterOpen, setNewsletterOpen] = useState(false);

  useEffect(() => {
    document.title = "Crazy Moe's - Buffalo Pickup Deals on Quality Consumer Goods";
  }, []);

  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      try {
        const data = await fetchActiveListings(20);
        console.log("listings:", data?.length, data?.[0]);
        setListings(data);
      } catch (error) {
        console.error("Failed to fetch featured products:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      <FloatingParticles count={12} />
      <Header onNewsletterClick={() => setNewsletterOpen(true)} />
      <HeroSection />
      <PickupInfoSection />
      <FeaturedProducts listings={listings} isLoading={isLoading} />
      <ShopByCategory />
      <NewsAndUpdates />
      <Footer />
      <NewsletterModal open={newsletterOpen} onOpenChange={setNewsletterOpen} />
    </div>
  );
};

export default Index;
