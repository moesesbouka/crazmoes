import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Search,
  Download,
  RefreshCw,
  Edit,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Rocket,
  Globe,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  Filter,
  X,
} from "lucide-react";

interface MarketplaceListing {
  id: string;
  facebook_id: string | null;
  title: string;
  description: string | null;
  price: number | null;
  original_price: number | null;
  images: string[];
  status: string;
  category: string | null;
  condition: string | null;
  location: string | null;
  listing_url: string | null;
  imported_at: string;
  created_at: string;
  updated_at: string;
  shopify_product_id: string | null;
  launched_at: string | null;
}

type SortField = "title" | "price" | "imported_at" | "created_at" | "status" | "condition" | "category";
type SortDirection = "asc" | "desc";

interface StatusCounts {
  active: number;
  pending: number;
  sold: number;
  deleted: number;
  launched: number;
  total: number;
}

export function AdminMarketplaceInventory() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", price: "", status: "" });
  const itemsPerPage = 10;

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("imported_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [launchFilter, setLaunchFilter] = useState<string>("all");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Status counts
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    active: 0,
    pending: 0,
    sold: 0,
    deleted: 0,
    launched: 0,
    total: 0,
  });

  // Launch state
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchProgress, setLaunchProgress] = useState({ current: 0, total: 0 });
  const [showLaunchDialog, setShowLaunchDialog] = useState(false);
  const [launchingIds, setLaunchingIds] = useState<string[]>([]);

  // Bulk delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchStatusCounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("status, shopify_product_id");

      if (error) throw error;

      const counts: StatusCounts = {
        active: 0,
        pending: 0,
        sold: 0,
        deleted: 0,
        launched: 0,
        total: data?.length || 0,
      };

      data?.forEach((item) => {
        const status = item.status?.toLowerCase() || "active";
        if (status === "active") counts.active++;
        else if (status === "pending") counts.pending++;
        else if (status === "sold") counts.sold++;
        else if (status === "deleted") counts.deleted++;
        if (item.shopify_product_id) counts.launched++;
      });

      setStatusCounts(counts);
    } catch (error: any) {
      console.error("Error fetching status counts:", error);
    }
  }, []);

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("marketplace_listings")
        .select("*", { count: "exact" })
        .order(sortField, { ascending: sortDirection === "asc" });

      // Apply search filter
      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Apply condition filter
      if (conditionFilter !== "all") {
        query = query.eq("condition", conditionFilter);
      }

      // Apply launch filter
      if (launchFilter === "launched") {
        query = query.not("shopify_product_id", "is", null);
      } else if (launchFilter === "not_launched") {
        query = query.is("shopify_product_id", null);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      setListings(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      toast.error("Failed to fetch listings: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, sortField, sortDirection, statusFilter, conditionFilter, launchFilter]);

  useEffect(() => {
    fetchListings();
    fetchStatusCounts();
  }, [fetchListings, fetchStatusCounts]);

  useEffect(() => {
    const channel = supabase
      .channel("marketplace-listings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketplace_listings" },
        () => {
          fetchListings();
          fetchStatusCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchListings, fetchStatusCounts]);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectAll(false);
  }, [statusFilter, conditionFilter, launchFilter, searchQuery, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(new Set(listings.map((l) => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
    setSelectAll(newSet.size === listings.length);
  };

  const handleEdit = (listing: MarketplaceListing) => {
    setEditingListing(listing);
    setEditForm({
      title: listing.title,
      description: listing.description || "",
      price: listing.price?.toString() || "",
      status: listing.status || "active",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingListing) return;

    try {
      const { error } = await supabase
        .from("marketplace_listings")
        .update({
          title: editForm.title,
          description: editForm.description,
          price: editForm.price ? parseFloat(editForm.price) : null,
          status: editForm.status,
        })
        .eq("id", editingListing.id);

      if (error) throw error;
      toast.success("Listing updated");
      setEditingListing(null);
      fetchListings();
      fetchStatusCounts();
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;

    try {
      const { error } = await supabase
        .from("marketplace_listings")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Listing deleted");
      fetchListings();
      fetchStatusCounts();
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      const { error } = await supabase
        .from("marketplace_listings")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;
      toast.success(`Deleted ${selectedIds.size} listings`);
      setSelectedIds(new Set());
      setSelectAll(false);
      setShowDeleteDialog(false);
      fetchListings();
      fetchStatusCounts();
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedIds.size === 0) return;

    try {
      const { error } = await supabase
        .from("marketplace_listings")
        .update({ status: newStatus })
        .in("id", Array.from(selectedIds));

      if (error) throw error;
      toast.success(`Updated ${selectedIds.size} listings to ${newStatus}`);
      setSelectedIds(new Set());
      setSelectAll(false);
      fetchListings();
      fetchStatusCounts();
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    }
  };

  const handleLaunch = async (ids: string[]) => {
    if (ids.length === 0) return;

    setIsLaunching(true);
    setLaunchProgress({ current: 0, total: ids.length });
    setShowLaunchDialog(false);

    try {
      const { data, error } = await supabase.functions.invoke("launch-to-shopify", {
        body: { listing_ids: ids },
      });

      if (error) throw error;

      const successCount = data?.summary?.success || 0;
      const failCount = data?.summary?.failed || 0;

      if (successCount > 0) {
        toast.success(`Launched ${successCount} product${successCount > 1 ? "s" : ""} to crazymoe.com`);
      }
      if (failCount > 0) {
        toast.error(`Failed to launch ${failCount} product${failCount > 1 ? "s" : ""}`);
      }

      setSelectedIds(new Set());
      setSelectAll(false);
      fetchListings();
      fetchStatusCounts();
    } catch (error: any) {
      console.error("Launch error:", error);
      toast.error("Failed to launch: " + (error.message || "Unknown error"));
    } finally {
      setIsLaunching(false);
      setLaunchProgress({ current: 0, total: 0 });
    }
  };

  const openLaunchDialog = (ids: string[]) => {
    // Filter out already launched items
    const launchableIds = ids.filter((id) => {
      const listing = listings.find((l) => l.id === id);
      return listing && !listing.shopify_product_id;
    });

    if (launchableIds.length === 0) {
      toast.info("All selected items are already launched");
      return;
    }

    setLaunchingIds(launchableIds);
    setShowLaunchDialog(true);
  };

  const exportToCSV = (exportAll = true) => {
    const itemsToExport = exportAll ? listings : listings.filter((l) => selectedIds.has(l.id));
    
    const headers = [
      "Title",
      "Description",
      "Price",
      "Original Price",
      "Category",
      "Status",
      "Condition",
      "Location",
      "Images",
      "Launched",
      "Shopify ID",
      "Imported At",
    ];
    const csvContent = [
      headers.join(","),
      ...itemsToExport.map((l) =>
        [
          `"${l.title.replace(/"/g, '""')}"`,
          `"${(l.description || "").replace(/"/g, '""')}"`,
          l.price || "",
          l.original_price || "",
          l.category || "",
          l.status,
          l.condition || "",
          l.location || "",
          l.images?.length || 0,
          l.shopify_product_id ? "Yes" : "No",
          l.shopify_product_id || "",
          new Date(l.imported_at).toLocaleDateString(),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `marketplace-inventory-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success(`Exported ${itemsToExport.length} listings to CSV`);
  };

  const getStatusBadge = (status: string, shopifyId: string | null) => {
    if (shopifyId) {
      return (
        <Badge className="bg-blue-500 hover:bg-blue-600">
          <Globe className="h-3 w-3 mr-1" />
          Live
        </Badge>
      );
    }

    switch (status?.toLowerCase()) {
      case "active":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "sold":
        return (
          <Badge className="bg-red-500 hover:bg-red-600">
            <Package className="h-3 w-3 mr-1" />
            Sold
          </Badge>
        );
      case "deleted":
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Deleted
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-4">
          <span>Marketplace Inventory ({totalCount} listings)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchListings()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCSV()}>
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg text-sm">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="font-medium">{statusCounts.active}</span> Active
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">{statusCounts.pending}</span> Pending
          </div>
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4 text-red-500" />
            <span className="font-medium">{statusCounts.sold}</span> Sold
          </div>
          <div className="flex items-center gap-1">
            <Globe className="h-4 w-4 text-blue-500" />
            <span className="font-medium">{statusCounts.launched}</span> Live on Site
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>

          <Select value={conditionFilter} onValueChange={(v) => { setConditionFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Like New">Like New</SelectItem>
              <SelectItem value="Good">Good</SelectItem>
              <SelectItem value="Fair">Fair</SelectItem>
            </SelectContent>
          </Select>

          <Select value={launchFilter} onValueChange={(v) => { setLaunchFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <Globe className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Launch Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="launched">Live on Site</SelectItem>
              <SelectItem value="not_launched">Not Launched</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => openLaunchDialog(Array.from(selectedIds))}
              disabled={isLaunching}
            >
              <Rocket className="h-4 w-4 mr-2" />
              Launch to Site
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(false)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Selected
            </Button>
            <Select onValueChange={(v) => handleBulkStatusUpdate(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Set Active</SelectItem>
                <SelectItem value="pending">Set Pending</SelectItem>
                <SelectItem value="sold">Set Sold</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedIds(new Set());
                setSelectAll(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Launch Progress */}
        {isLaunching && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-2">
              <Rocket className="h-5 w-5 text-blue-500 animate-bounce" />
              <span className="font-medium">Launching products to crazymoe.com...</span>
            </div>
            <Progress value={(launchProgress.current / launchProgress.total) * 100} className="h-2" />
            <p className="text-sm text-muted-foreground mt-1">
              {launchProgress.current} of {launchProgress.total} complete
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No listings found. Install the Chrome extension to import from Facebook Marketplace.
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      />
                    </TableHead>
                    <TableHead className="w-16"></TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground"
                        onClick={() => handleSort("title")}
                      >
                        Title {getSortIcon("title")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground"
                        onClick={() => handleSort("price")}
                      >
                        Price {getSortIcon("price")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground"
                        onClick={() => handleSort("status")}
                      >
                        Status {getSortIcon("status")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground"
                        onClick={() => handleSort("condition")}
                      >
                        Condition {getSortIcon("condition")}
                      </button>
                    </TableHead>
                    <TableHead>Images</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground"
                        onClick={() => handleSort("imported_at")}
                      >
                        Imported {getSortIcon("imported_at")}
                      </button>
                    </TableHead>
                    <TableHead className="w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings.map((listing) => (
                    <TableRow key={listing.id} className={selectedIds.has(listing.id) ? "bg-primary/5" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(listing.id)}
                          onCheckedChange={(checked) => handleSelectOne(listing.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        {listing.images && listing.images.length > 0 ? (
                          <img
                            src={listing.images[0]}
                            alt={listing.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium truncate max-w-[200px]">{listing.title}</div>
                        {listing.category && (
                          <div className="text-xs text-muted-foreground">{listing.category}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {listing.price ? `$${listing.price.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(listing.status, listing.shopify_product_id)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {listing.condition || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {listing.images?.length || 0} photos
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(listing.imported_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {listing.shopify_product_id ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="View on Site"
                            >
                              <a
                                href={`https://crazymoe.com/products/${listing.shopify_product_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Globe className="h-4 w-4 text-blue-500" />
                              </a>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openLaunchDialog([listing.id])}
                              disabled={isLaunching}
                              title="Launch to Site"
                            >
                              <Rocket className="h-4 w-4" />
                            </Button>
                          )}
                          {listing.listing_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              title="View on Facebook"
                            >
                              <a href={listing.listing_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(listing)}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Listing</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Title</label>
                                  <Input
                                    value={editForm.title}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, title: e.target.value })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Description</label>
                                  <Textarea
                                    value={editForm.description}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, description: e.target.value })
                                    }
                                    rows={4}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Price</label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editForm.price}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, price: e.target.value })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Status</label>
                                  <Select
                                    value={editForm.status}
                                    onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="sold">Sold</SelectItem>
                                      <SelectItem value="deleted">Deleted</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button onClick={handleSaveEdit} className="w-full">
                                  Save Changes
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(listing.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Launch Confirmation Dialog */}
        <Dialog open={showLaunchDialog} onOpenChange={setShowLaunchDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Launch to crazymoe.com
              </DialogTitle>
              <DialogDescription>
                You're about to publish {launchingIds.length} product{launchingIds.length > 1 ? "s" : ""} to your live website.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <p className="text-sm">Products will be:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Added to Shopify inventory
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Visible on crazymoe.com/shop
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Searchable by customers
                </li>
              </ul>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLaunchDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleLaunch(launchingIds)}>
                <Rocket className="h-4 w-4 mr-2" />
                Launch Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Delete {selectedIds.size} Listings
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. Are you sure you want to permanently delete these listings?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
