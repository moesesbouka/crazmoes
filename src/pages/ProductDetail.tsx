import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, AlertCircle, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
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
        console.log("product detail:", data);
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
        <Header onNewsletterClick={() => setNewsletterOpen(true)} />
        <div className="container py-12">
          <div className="animate-pulse">
            <div className="h-8 w-32 bg-muted rounded mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="aspect-square bg-muted rounded-lg" />
              <div className="space-y-4">
                <div className="h-8 w-3/4 bg-muted rounded" />
                <div className="h-12 w-1/3 bg-muted rounded" />
                <div className="h-24 w-full bg-muted rounded" />
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
        <Header onNewsletterClick={() => setNewsletterOpen(true)} />
        <div className="container py-12">
          <div className="text-center py-16">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold mb-2">Product Not Found</h1>
            <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist or has been removed.</p>
            <Link to="/shop">
              <Button><ArrowLeft className="mr-2 h-4 w-4" />Back to Shop</Button>
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
    <div className="min-h-screen bg-background">
      <Header onNewsletterClick={() => setNewsletterOpen(true)} />
      <main className="container py-8">
        <Link to="/shop" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />Back to Shop
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="aspect-square rounded-xl overflow-hidden bg-background shadow-card">
              <ProductImage src={displayImage} alt={listing.title} className="h-full w-full p-4" />
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((url, index) => (
                  <button key={index} onClick={() => setSelectedImageIndex(index)} className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors bg-background ${index === selectedImageIndex ? "border-primary" : "border-transparent hover:border-border"}`}>
                    <ProductImage src={url} alt={`${listing.title} ${index + 1}`} className="h-full w-full p-1" showProcessingIndicator={false} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <Badge className="hero-gradient border-0 mb-4">Available</Badge>
              <h1 className="font-display text-3xl font-bold tracking-tight">{listing.title}</h1>
            </div>
            <p className="font-display text-4xl font-bold text-primary">{formatPrice(listing.price)}</p>
            {listing.description && (
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground leading-relaxed">{listing.description}</p>
              </div>
            )}
            {listing.condition && (
              <p className="text-sm text-muted-foreground">Condition: <span className="font-medium text-foreground">{listing.condition}</span></p>
            )}
            <div className="space-y-3">
              <Button onClick={handleCashAppBuy} className="w-full bg-[#00D632] hover:bg-[#00B82B] text-white font-bold text-lg py-6 rounded-xl" size="lg">
                <DollarSign className="h-5 w-5 mr-2" />Buy Now via Cash App
              </Button>
              <Button asChild variant="outline" className="w-full font-bold rounded-xl" size="lg">
                <Link to="/schedule-pickup"><Calendar className="h-5 w-5 mr-2" />Schedule Pickup</Link>
              </Button>
            </div>
            <div className="rounded-lg bg-accent/50 p-4">
              <h3 className="font-semibold mb-2">Want to know about new deals?</h3>
              <p className="text-sm text-muted-foreground">Subscribe to our newsletter to get notified about new inventory and flash sales!</p>
              <Button onClick={() => setNewsletterOpen(true)} className="mt-4 hero-gradient hover:opacity-90">Get Updates</Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <NewsletterModal open={newsletterOpen} onOpenChange={setNewsletterOpen} />
    </div>
  );
};

export default ProductDetail;
