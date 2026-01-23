import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/safeClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tags, Search, Save, Trash2 } from "lucide-react";
import { fetchAllProducts, ShopifyProduct } from "@/lib/shopify";
import { CATEGORY_KEYWORDS, resolveProductCategory } from "@/lib/categoryMapper";

interface CategoryOverride {
  id: string;
  product_handle: string;
  product_title: string;
  category: string;
}

const AVAILABLE_CATEGORIES = Object.keys(CATEGORY_KEYWORDS);

export function AdminCategoryManager() {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [overrides, setOverrides] = useState<CategoryOverride[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [productsData, overridesData] = await Promise.all([
      fetchAllProducts(),
      supabase.from("category_overrides").select("*"),
    ]);

    setProducts(productsData);
    if (overridesData.data) setOverrides(overridesData.data);
    setIsLoading(false);
  };

  const handleCategoryChange = async (product: ShopifyProduct, newCategory: string) => {
    const existingOverride = overrides.find(
      (o) => o.product_handle === product.node.handle
    );

    try {
      if (existingOverride) {
        // Update existing override
        const { error } = await supabase
          .from("category_overrides")
          .update({ category: newCategory })
          .eq("id", existingOverride.id);

        if (error) throw error;

        setOverrides((prev) =>
          prev.map((o) =>
            o.id === existingOverride.id ? { ...o, category: newCategory } : o
          )
        );
      } else {
        // Create new override
        const { data, error } = await supabase
          .from("category_overrides")
          .insert({
            product_handle: product.node.handle,
            product_title: product.node.title,
            category: newCategory,
          })
          .select()
          .single();

        if (error) throw error;
        setOverrides((prev) => [...prev, data]);
      }

      toast.success("Category updated");
    } catch (error: any) {
      toast.error("Failed to update category", { description: error.message });
    }
  };

  const handleRemoveOverride = async (override: CategoryOverride) => {
    try {
      const { error } = await supabase
        .from("category_overrides")
        .delete()
        .eq("id", override.id);

      if (error) throw error;

      setOverrides((prev) => prev.filter((o) => o.id !== override.id));
      toast.success("Override removed");
    } catch (error: any) {
      toast.error("Failed to remove override");
    }
  };

  const getProductCategory = (product: ShopifyProduct) => {
    const override = overrides.find((o) => o.product_handle === product.node.handle);
    if (override) return { category: override.category, isOverride: true };

    const autoCategory = resolveProductCategory(
      product.node.title,
      product.node.description || "",
      product.node.category?.name,
      product.node.productType
    );
    return { category: autoCategory, isOverride: false };
  };

  const filteredProducts = products.filter(
    (p) =>
      p.node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.node.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading products...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Tags className="h-5 w-5" />
          Category Management
        </CardTitle>
        <CardDescription>
          Manually assign categories to products. Overrides take priority over auto-classification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="max-h-[500px] overflow-y-auto space-y-2">
          {filteredProducts.map((product) => {
            const { category, isOverride } = getProductCategory(product);
            const override = overrides.find(
              (o) => o.product_handle === product.node.handle
            );

            return (
              <div
                key={product.node.handle}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.node.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={isOverride ? "default" : "secondary"}>
                      {category}
                    </Badge>
                    {isOverride && (
                      <span className="text-xs text-muted-foreground">
                        (manual override)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={override?.category || ""}
                    onValueChange={(value) => handleCategoryChange(product, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Set category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {override && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOverride(override)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
