import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { ShopByCategory } from "@/components/ShopByCategory";
import { HowItWorks } from "@/components/HowItWorks";
import { Footer } from "@/components/Footer";
import { NewsletterModal } from "@/components/NewsletterModal";
import { fetchActiveListings, MarketplaceListing } from "@/lib/supabase-listings";

const Index = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newsletterOpen, setNewsletterOpen] = useState(false);

  useEffect(() => {
    document.title = "Crazy Moe's — Big Brand Deals Without Big Box Prices | Buffalo Pickup";
  }, []);

  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      try {
        const data = await fetchActiveListings(20);
        setListings(data);
      } catch (error) {
        console.error("Failed to fetch featured products:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, []);

  const featuredListing = listings.length > 0 ? listings[0] : null;

  return (
    <div className="min-h-screen bg-background">
      <Header onNewsletterClick={() => setNewsletterOpen(true)} />
      <HeroSection featuredListing={featuredListing} />
      <FeaturedProducts listings={listings} isLoading={isLoading} />
      <ShopByCategory />
      <HowItWorks />
      <Footer />
      <NewsletterModal open={newsletterOpen} onOpenChange={setNewsletterOpen} />
    </div>
  );
};

export default Index;
