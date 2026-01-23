import { useState, useEffect, useMemo } from "react";
import { fetchAllProducts, formatPrice, ShopifyProduct } from "@/lib/shopify";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import {
  RefreshCw,
  Search,
  ExternalLink,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  ImageOff,
} from "lucide-react";
import { resolveProductCategory } from "@/lib/categoryMapper";

interface CategoryOverride {
  product_handle: string;
  category: string;
}

type SortField = "title" | "price" | "category" | "status";
type SortDirection = "asc" | "desc";

const SHOPIFY_ADMIN_URL = "https://admin.shopify.com/store/rsg4h0-q3/products";

export function AdminShopifyInventory() {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [overrides, setOverrides] = useState<CategoryOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const loadData = async (showToast = false) => {
    try {
      const [shopifyProducts, { data: categoryData }] = await Promise.all([
        fetchAllProducts(),
        supabase.from("category_overrides").select("product_handle, category"),
      ]);

      setProducts(shopifyProducts);
      setOverrides(categoryData || []);
      setLastSynced(new Date());

      if (showToast) {
        toast.success(`Synced ${shopifyProducts.length} products from Shopify`);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(true);
  };

  const getProductCategory = (product: ShopifyProduct): string => {
    const override = overrides.find(
      (o) => o.product_handle === product.node.handle
    );
    if (override) return override.category;
    return resolveProductCategory(
      product.node.title,
      product.node.description,
      product.node.category?.name,
      product.node.productType
    );
  };

  const getProductStatus = (
    product: ShopifyProduct
  ): "available" | "out_of_stock" | "partial" => {
    const variants = product.node.variants.edges;
    const availableCount = variants.filter(
      (v) => v.node.availableForSale
    ).length;

    if (availableCount === 0) return "out_of_stock";
    if (availableCount === variants.length) return "available";
    return "partial";
  };

  const getStatusBadge = (status: "available" | "out_of_stock" | "partial") => {
    switch (status) {
      case "available":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            In Stock
          </Badge>
        );
      case "out_of_stock":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Out of Stock
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        );
    }
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => cats.add(getProductCategory(p)));
    return Array.from(cats).sort();
  }, [products, overrides]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.node.title.toLowerCase().includes(query) ||
          p.node.description?.toLowerCase().includes(query) ||
          p.node.handle.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((p) => getProductCategory(p) === categoryFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => getProductStatus(p) === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "title":
          comparison = a.node.title.localeCompare(b.node.title);
          break;
        case "price":
          comparison =
            parseFloat(a.node.priceRange.minVariantPrice.amount) -
            parseFloat(b.node.priceRange.minVariantPrice.amount);
          break;
        case "category":
          comparison = getProductCategory(a).localeCompare(getProductCategory(b));
          break;
        case "status":
          comparison = getProductStatus(a).localeCompare(getProductStatus(b));
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [products, searchQuery, categoryFilter, statusFilter, sortField, sortDirection, overrides]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = useMemo(() => {
    const inStock = products.filter((p) => getProductStatus(p) === "available").length;
    const outOfStock = products.filter((p) => getProductStatus(p) === "out_of_stock").length;
    const partial = products.filter((p) => getProductStatus(p) === "partial").length;
    return { total: products.length, inStock, outOfStock, partial };
  }, [products]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  const extractShopifyId = (gid: string) => {
    // gid://shopify/Product/123456789 -> 123456789
    const match = gid.match(/\/(\d+)$/);
    return match ? match[1] : gid;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading Shopify inventory...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.inStock}</p>
                <p className="text-xs text-muted-foreground">In Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{stats.outOfStock}</p>
                <p className="text-xs text-muted-foreground">Out of Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.partial}</p>
                <p className="text-xs text-muted-foreground">Partial Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Shopify Inventory
            </CardTitle>
            {lastSynced && (
              <p className="text-xs text-muted-foreground mt-1">
                Last synced: {lastSynced.toLocaleTimeString()}
              </p>
            )}
          </div>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh from Shopify"}
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">In Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                <SelectItem value="partial">Partial Stock</SelectItem>
              </SelectContent>
            </Select>

            <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            Showing {paginatedProducts.length} of {filteredProducts.length} products
            {filteredProducts.length !== stats.total && ` (filtered from ${stats.total})`}
          </p>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("title")}
                  >
                    Title{getSortIndicator("title")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("category")}
                  >
                    Category{getSortIndicator("category")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("price")}
                  >
                    Price{getSortIndicator("price")}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("status")}
                  >
                    Status{getSortIndicator("status")}
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">No products found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProducts.map((product) => {
                    const image = product.node.images.edges[0]?.node;
                    const status = getProductStatus(product);
                    const category = getProductCategory(product);
                    const hasOverride = overrides.some(
                      (o) => o.product_handle === product.node.handle
                    );

                    return (
                      <TableRow key={product.node.id}>
                        <TableCell>
                          {image ? (
                            <img
                              src={image.url}
                              alt={image.altText || product.node.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <ImageOff className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium line-clamp-1">{product.node.title}</p>
                            <p className="text-xs text-muted-foreground">{product.node.handle}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={hasOverride ? "default" : "secondary"}>
                            {category}
                            {hasOverride && " ✎"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatPrice(
                            product.node.priceRange.minVariantPrice.amount,
                            product.node.priceRange.minVariantPrice.currencyCode
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a
                                href={`/product/${product.node.handle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a
                                href={`${SHOPIFY_ADMIN_URL}/${extractShopifyId(product.node.id)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
