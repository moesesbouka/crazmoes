import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/safeClient";
import { Link2, Loader2, Copy, Download, ArrowLeft } from "lucide-react";
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

  const copyAndOpenFacebook = async () => {
    if (!product) return;

    const text = `${product.title}

$${product.price}

${product.description}`;

    await navigator.clipboard.writeText(text);
    toast.success("Copied! Opening Facebook...");
    
    // Use mobile-friendly URL that opens the item listing form
    setTimeout(() => {
      window.location.href = "https://m.facebook.com/marketplace/create/item";
    }, 500);
  };

  const downloadImage = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `product-image-${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Image ${index + 1} saved!`);
    } catch (error) {
      // Fallback: open in new tab for manual save
      window.open(imageUrl, '_blank');
      toast.info("Long-press image to save");
    }
  };

  const downloadAllImages = async () => {
    if (!product?.images.length) return;
    toast.info(`Downloading ${product.images.length} images...`);
    for (let i = 0; i < Math.min(product.images.length, 5); i++) {
      await downloadImage(product.images[i], i);
      await new Promise(r => setTimeout(r, 300)); // Small delay between downloads
    }
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
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Images ({product.images.length})</label>
                    <Button variant="outline" size="sm" onClick={downloadAllImages}>
                      <Download className="w-3 h-3 mr-1" />
                      Save All
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {product.images.slice(0, 6).map((img, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={img}
                          alt={`Product ${i + 1}`}
                          className="w-full aspect-square object-cover rounded border"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                        <button
                          onClick={() => downloadImage(img, i)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity"
                        >
                          <Download className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">📁 Images save to your Downloads folder</p>
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
              <div className="pt-4">
                <Button onClick={copyAndOpenFacebook} className="w-full" size="lg">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy & Open Facebook
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
