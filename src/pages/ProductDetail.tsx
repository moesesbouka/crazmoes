import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, AlertCircle, DollarSign, Calendar, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { motion, AnimatePresence } from "framer-motion";
import { Footer } from "@/components/Footer";
import { NewsletterModal } from "@/components/NewsletterModal";
import { ProductImage } from "@/components/ProductImage";
import { fetchListingByFacebookId, MarketplaceListing } from "@/lib/supabase-listings";
import { toast } from "sonner";

function getImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images.filter((u): u is string => typeof u === "string" && u.length > 0);
}

function formatPrice(price: number | null): string {
  if (!price || price === 0) return "Make Offer";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await fetchListingByFacebookId(id);
        if (data) {
          setListing(data);
          document.title = `${data.title} - Crazy Moe's`;
        } else {
          setListing(null);
        }
      } catch (error) {
        console.error("Failed to fetch product:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  const handleCashAppBuy = () => {
    if (!listing) return;
    const amount = listing.price ?? 0;
    const note = encodeURIComponent(`Crazy Moe's - ${listing.title}`);
    window.open(`https://cash.app/$MOEB1978/${amount}?note=${note}`, '_blank');
    toast.success("Opening Cash App", {
      description: "Complete your payment in Cash App, then schedule your pickup!",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12">
          <div className="animate-pulse">
            <div className="h-8 w-32 bg-secondary rounded mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="aspect-square bg-secondary rounded-2xl" />
              <div className="space-y-4">
                <div className="h-8 w-3/4 bg-secondary rounded" />
                <div className="h-12 w-1/3 bg-secondary rounded" />
                <div className="h-24 w-full bg-secondary rounded" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12">
          <div className="text-center py-16">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
            <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist or has been removed.</p>
            <Link to="/shop">
              <Button className="rounded-full"><ArrowLeft className="mr-2 h-4 w-4" />Back to Shop</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const images = getImages(listing.images);
  const displayImage = images[selectedImageIndex] || "/placeholder.svg";

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="container py-8">
        <Link to="/shop" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />Back to Inventory
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="aspect-square rounded-2xl overflow-hidden bg-secondary">
              <ProductImage src={displayImage} alt={listing.title} className="h-full w-full p-4" />
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors bg-secondary ${
                      index === selectedImageIndex ? "border-primary" : "border-transparent hover:border-border"
                    }`}
                  >
                    <ProductImage src={url} alt={`${listing.title} ${index + 1}`} className="h-full w-full p-1" showProcessingIndicator={false} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <span className="inline-flex px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-200 text-xs font-bold mb-4">
                Available
              </span>
              <h1 className="text-3xl font-bold tracking-tight">{listing.title}</h1>
            </div>
            <p className="text-4xl font-black tracking-tight text-primary">{formatPrice(listing.price)}</p>

            {listing.condition && (
              <div className="rounded-2xl bg-secondary p-4">
                <p className="text-sm text-muted-foreground">Condition</p>
                <p className="font-bold mt-1">{listing.condition}</p>
              </div>
            )}

            {listing.description && (
              <p className="text-muted-foreground leading-relaxed">{listing.description}</p>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleCashAppBuy}
                className="w-full bg-[#00D632] hover:bg-[#00B82B] text-foreground font-bold text-lg py-6 rounded-full"
                size="lg"
              >
                <DollarSign className="h-5 w-5 mr-2" />Buy Now via Cash App
              </Button>
              <Button asChild variant="outline" className="w-full font-bold rounded-full border-border" size="lg">
                <Link to="/schedule-pickup"><Calendar className="h-5 w-5 mr-2" />Schedule Pickup</Link>
              </Button>
            </div>

            <div className="rounded-2xl bg-secondary p-5">
              <h3 className="font-bold mb-2">Want to know about new deals?</h3>
              <p className="text-sm text-muted-foreground">Subscribe to get notified about new inventory and flash sales.</p>
              <Button onClick={() => setNewsletterOpen(true)} className="mt-4 rounded-full bg-primary text-primary-foreground font-semibold">
                Get Updates
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <NewsletterModal open={newsletterOpen} onOpenChange={setNewsletterOpen} />

      {/* Sticky reserve/contact bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
        className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border"
      >
        <div className="container flex items-center justify-between gap-4 py-3.5">
          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-bold truncate">{listing.title}</p>
            <p className="text-lg font-black text-primary leading-none mt-0.5">{formatPrice(listing.price)}</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <a href="tel:+17168001234" className="shrink-0">
              <Button
                variant="outline"
                className="rounded-full border-border gap-2 font-semibold hover:bg-secondary"
                size="lg"
              >
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Call Store</span>
              </Button>
            </a>
            <Button
              onClick={handleCashAppBuy}
              className="flex-1 sm:flex-none rounded-full bg-primary text-primary-foreground font-bold gap-2 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_45px_-5px_hsl(var(--primary)/0.7)] transition-all duration-300"
              size="lg"
            >
              <DollarSign className="h-4 w-4" />
              Reserve Now
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductDetail;
