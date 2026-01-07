import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link2, Loader2, Copy, ExternalLink, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface ProductData {
  title: string;
  price: string;
  description: string;
  images: string[];
  source: string;
}

const ProductScraper = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);

  const handleScrape = async () => {
    if (!url.trim()) {
      toast.error("Please enter a product URL");
      return;
    }

    setLoading(true);
    setProduct(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-product', {
        body: { url: url.trim() }
      });

      if (error) throw error;

      if (data.success && data.product) {
        setProduct(data.product);
        toast.success("Product data extracted!");
      } else {
        throw new Error(data.error || "Failed to extract product data");
      }
    } catch (error: any) {
      console.error("Scrape error:", error);
      toast.error(error.message || "Failed to scrape product");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const copyAllForFacebook = async () => {
    if (!product) return;

    const text = `${product.title}

$${product.price}

${product.description}`;

    await navigator.clipboard.writeText(text);
    toast.success("All product info copied! Paste into Facebook Marketplace.");
  };

  const openFacebookMarketplace = () => {
    window.open("https://www.facebook.com/marketplace/create/item", "_blank");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Product URL Scraper
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Paste a product URL from Amazon, eBay, Walmart, Best Buy, or Target to extract listing data
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="https://www.amazon.com/product..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleScrape} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Scrape"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {product && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Extracted Product</CardTitle>
              <p className="text-xs text-muted-foreground">From: {product.source}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Images */}
              {product.images.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Images ({product.images.length})</label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {product.images.slice(0, 5).map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Product ${i + 1}`}
                        className="w-20 h-20 object-cover rounded border flex-shrink-0"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-medium">Title</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(product.title, "Title")}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <Input value={product.title} readOnly className="bg-muted" />
              </div>

              {/* Price */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-medium">Price</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(`$${product.price}`, "Price")}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <Input value={product.price ? `$${product.price}` : "Not found"} readOnly className="bg-muted" />
              </div>

              {/* Description */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-medium">Description</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(product.description, "Description")}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <Textarea
                  value={product.description || "No description found"}
                  readOnly
                  className="bg-muted min-h-[100px]"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-4">
                <Button onClick={copyAllForFacebook} className="w-full">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All for Facebook
                </Button>
                <Button variant="outline" onClick={openFacebookMarketplace} className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Facebook Marketplace
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProductScraper;
