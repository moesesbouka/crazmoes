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
  AlertTriangle,
} from "lucide-react";

interface MarketplaceListing {
  id: string;
  facebook_id: string;
  account_tag: string;
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

interface AccountCounts {
  MBFB: StatusCounts;
  CMFB: StatusCounts;
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
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("all");
  const [launchFilter, setLaunchFilter] = useState<string>("all");
  const [showBroken, setShowBroken] = useState(false); // hide broken imports by default

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Account counts
  const [accountCounts, setAccountCounts] = useState<AccountCounts>({
    MBFB: { active: 0, pending: 0, sold: 0, deleted: 0, launched: 0, total: 0 },
    CMFB: { active: 0, pending: 0, sold: 0, deleted: 0, launched: 0, total: 0 },
  });

  // Launch state
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchProgress, setLaunchProgress] = useState({ current: 0, total: 0 });
  const [showLaunchDialog, setShowLaunchDialog] = useState(false);
  const [launchingIds, setLaunchingIds] = useState<string[]>([]);

  // Bulk delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Clear all dialog
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  const fetchAccountCounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("marketplace_listings")
        .select("status, shopify_product_id, account_tag");

      if (error) throw error;

      const counts: AccountCounts = {
        MBFB: { active: 0, pending: 0, sold: 0, deleted: 0, launched: 0, total: 0 },
        CMFB: { active: 0, pending: 0, sold: 0, deleted: 0, launched: 0, total: 0 },
      };

      data?.forEach((item) => {
        const account = (item.account_tag === "CMFB" ? "CMFB" : "MBFB") as keyof AccountCounts;
        const status = item.status?.toLowerCase() || "active";
        
        counts[account].total++;
        if (status === "active") counts[account].active++;
        else if (status === "pending") counts[account].pending++;
        else if (status === "sold") counts[account].sold++;
        else if (status === "deleted") counts[account].deleted++;
        if (item.shopify_product_id) counts[account].launched++;
      });

      setAccountCounts(counts);
    } catch (error: any) {
      console.error("Error fetching account counts:", error);
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

      // Apply account filter
      if (accountFilter !== "all") {
        query = query.eq("account_tag", accountFilter);
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
  }, [currentPage, searchQuery, sortField, sortDirection, accountFilter, statusFilter, conditionFilter, launchFilter]);

  useEffect(() => {
    fetchListings();
    fetchAccountCounts();
  }, [fetchListings, fetchAccountCounts]);

  useEffect(() => {
    const channel = supabase
      .channel("marketplace-listings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketplace_listings" },
        () => {
          fetchListings();
          fetchAccountCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchListings, fetchAccountCounts]);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectAll(false);
  }, [accountFilter, statusFilter, conditionFilter, launchFilter, searchQuery, currentPage]);

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
      fetchAccountCounts();
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
      fetchAccountCounts();
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
      fetchAccountCounts();
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const handleClearAll = async () => {
    if (clearConfirmText !== "DELETE ALL") return;

    setIsClearing(true);
    try {
      const { error } = await supabase
        .from("marketplace_listings")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (error) throw error;
      toast.success("All inventory cleared");
      setShowClearAllDialog(false);
      setClearConfirmText("");
      fetchListings();
      fetchAccountCounts();
    } catch (error: any) {
      toast.error("Failed to clear: " + error.message);
    } finally {
      setIsClearing(false);
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
      fetchAccountCounts();
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
      fetchAccountCounts();
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
      "Account",
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
          l.account_tag || "MBFB",
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

  const getAccountBadge = (accountTag: string) => {
    if (accountTag === "CMFB") {
      return (
        <Badge className="bg-purple-500 hover:bg-purple-600 text-xs">
          CMFB
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500 hover:bg-blue-600 text-xs">
        MBFB
      </Badge>
    );
  };

  const getStatusBadge = (status: string, shopifyId: string | null) => {
    if (shopifyId) {
      return (
        <Badge className="bg-emerald-500 hover:bg-emerald-600">
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
  const grandTotal = accountCounts.MBFB.total + accountCounts.CMFB.total;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between flex-wrap gap-4">
          <span>Marketplace Inventory ({totalCount} of {grandTotal})</span>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowClearAllDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
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
        {/* Per-Account Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* MBFB Stats */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-blue-500">MBFB</Badge>
              <span className="font-semibold">{accountCounts.MBFB.total} total</span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {accountCounts.MBFB.active} Active
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-yellow-500" />
                {accountCounts.MBFB.pending} Pending
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3 text-red-500" />
                {accountCounts.MBFB.sold} Sold
              </span>
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3 text-emerald-500" />
                {accountCounts.MBFB.launched} Live
              </span>
            </div>
          </div>

          {/* CMFB Stats */}
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-purple-500">CMFB</Badge>
              <span className="font-semibold">{accountCounts.CMFB.total} total</span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {accountCounts.CMFB.active} Active
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-yellow-500" />
                {accountCounts.CMFB.pending} Pending
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3 text-red-500" />
                {accountCounts.CMFB.sold} Sold
              </span>
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3 text-emerald-500" />
                {accountCounts.CMFB.launched} Live
              </span>
            </div>
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

          <Select value={accountFilter} onValueChange={(v) => { setAccountFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              <SelectItem value="MBFB">🔵 MBFB</SelectItem>
              <SelectItem value="CMFB">🟣 CMFB</SelectItem>
            </SelectContent>
          </Select>

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
                    <TableHead className="w-16">Acct</TableHead>
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
                        {getAccountBadge(listing.account_tag)}
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
                                <Globe className="h-4 w-4 text-emerald-500" />
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
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="flex items-center px-3 text-sm">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Launch Confirmation Dialog */}
      <Dialog open={showLaunchDialog} onOpenChange={setShowLaunchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Launch to crazymoe.com</DialogTitle>
            <DialogDescription>
              You're about to launch {launchingIds.length} product{launchingIds.length > 1 ? "s" : ""} to your live website.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLaunchDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleLaunch(launchingIds)}>
              <Rocket className="h-4 w-4 mr-2" />
              Launch {launchingIds.length} Product{launchingIds.length > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Listings</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you sure you want to delete the selected listings?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete {selectedIds.size} Listings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <Dialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Clear All Inventory
            </DialogTitle>
            <DialogDescription>
              This will permanently delete ALL {grandTotal} listings from both MBFB and CMFB accounts. 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Type "DELETE ALL" to confirm:</label>
            <Input
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder="DELETE ALL"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowClearAllDialog(false);
              setClearConfirmText("");
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleClearAll}
              disabled={clearConfirmText !== "DELETE ALL" || isClearing}
            >
              {isClearing ? "Clearing..." : "Clear All Inventory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
