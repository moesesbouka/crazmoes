import { useState, useEffect } from "react";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
}

export function AdminMarketplaceInventory() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", price: "" });
  const itemsPerPage = 10;

  const fetchListings = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("marketplace_listings")
        .select("*", { count: "exact" })
        .order("imported_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
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
  };

  useEffect(() => {
    fetchListings();
  }, [currentPage, searchQuery]);

  useEffect(() => {
    const channel = supabase
      .channel("marketplace-listings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketplace_listings" },
        () => fetchListings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleEdit = (listing: MarketplaceListing) => {
    setEditingListing(listing);
    setEditForm({
      title: listing.title,
      description: listing.description || "",
      price: listing.price?.toString() || "",
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
        })
        .eq("id", editingListing.id);

      if (error) throw error;
      toast.success("Listing updated");
      setEditingListing(null);
      fetchListings();
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
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const exportToCSV = () => {
    const headers = ["Title", "Description", "Price", "Original Price", "Category", "Status", "Condition", "Location", "Imported At"];
    const csvContent = [
      headers.join(","),
      ...listings.map((l) =>
        [
          `"${l.title.replace(/"/g, '""')}"`,
          `"${(l.description || "").replace(/"/g, '""')}"`,
          l.price || "",
          l.original_price || "",
          l.category || "",
          l.status,
          l.condition || "",
          l.location || "",
          new Date(l.imported_at).toLocaleDateString(),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `marketplace-inventory-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Exported to CSV");
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Marketplace Inventory ({totalCount} listings)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchListings}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
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
        </div>

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
                    <TableHead className="w-16"></TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Imported</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings.map((listing) => (
                    <TableRow key={listing.id}>
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
                        <div className="font-medium truncate max-w-[300px]">{listing.title}</div>
                        {listing.category && (
                          <div className="text-sm text-muted-foreground">{listing.category}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {listing.price ? `$${listing.price.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={listing.status === "active" ? "default" : "secondary"}
                        >
                          {listing.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(listing.imported_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {listing.listing_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
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
      </CardContent>
    </Card>
  );
}
