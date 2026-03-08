import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { NewsletterModal } from "@/components/NewsletterModal";
import { Footer } from "@/components/Footer";
import { marketplaceDb } from "@/lib/marketplace-client";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, ExternalLink } from "lucide-react";

interface Listing {
  id: string;
  facebook_id: string;
  title: string;
  price: number | null;
  description: string | null;
  category: string | null;
  images: string[] | null;
  listing_url: string | null;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];

function getCleanImages(images: string[] | null): string[] {
  if (!images) return [];
  return images.filter(
    (u) => u && /^https:\/\/(scontent|z-p[0-9]+-shbz|lookaside).*\.(jpg|jpeg|png|webp)/i.test(u)
  );
}

function formatPrice(p: number | null) {
  if (!p || p === 0) return "Make Offer";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(p);
}

function ListingCard({ listing }: { listing: Listing }) {
  const imgs = getCleanImages(listing.images);
  const img = imgs[0] || null;

  return (
    <a
      href={listing.listing_url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
    >
      <div className="aspect-square bg-gray-50 overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">📦</div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight">{listing.title}</p>
        <p className="text-base font-bold text-primary mt-auto pt-1">{formatPrice(listing.price)}</p>
        {listing.category && (
          <span className="text-xs text-gray-400">{listing.category}</span>
        )}
      </div>
    </a>
  );
}

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newsletterOpen, setNewsletterOpen] = useState(false);

  // URL-driven state
  const searchQuery = searchParams.get("q") || "";
  const selectedCategory = searchParams.get("cat") || "All";
  const sortOption = searchParams.get("sort") || "newest";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("per") || "50", 10);

  const setParam = (key: string, val: string, resetPage = true) => {
    const p = new URLSearchParams(searchParams);
    val && val !== "" ? p.set(key, val) : p.delete(key);
    if (resetPage) p.delete("page");
    setSearchParams(p, { replace: true });
  };

  useEffect(() => {
    document.title = "Shop All Inventory | Crazy Moe's";
  }, []);

  // Load ALL active listings once (they're small JSON, ~500KB)
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const all: Listing[] = [];
      let offset = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("marketplace_listings")
          .select("id,facebook_id,title,price,category,images,listing_url,description")
          .eq("status", "active")
          .order("imported_at", { ascending: false })
          .range(offset, offset + PAGE - 1);
        if (error || !data?.length) break;
        all.push(...(data as Listing[]));
        if (data.length < PAGE) break;
        offset += PAGE;
      }
      setAllListings(all);
      setIsLoading(false);
    }
    load();
  }, []);

  // Unique categories
  const categories = useMemo(() => {
    const cats = new Set(allListings.map((l) => l.category).filter(Boolean) as string[]);
    return ["All", ...Array.from(cats).sort()];
  }, [allListings]);

  // Filter + sort
  const filtered = useMemo(() => {
    let r = [...allListings];
    if (selectedCategory !== "All") r = r.filter((l) => l.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter((l) => l.title.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q));
    }
    switch (sortOption) {
      case "price-asc":  r.sort((a, b) => (a.price ?? 0) - (b.price ?? 0)); break;
      case "price-desc": r.sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); break;
      case "title-asc":  r.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "title-desc": r.sort((a, b) => b.title.localeCompare(a.title)); break;
      default: break; // newest — already sorted by imported_at desc from DB
    }
    return r;
  }, [allListings, selectedCategory, searchQuery, sortOption]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const goToPage = (n: number) => setParam("page", String(n), false);

  // Page number range to show
  const pageNums = useMemo(() => {
    const pages: (number | "…")[] = [];
    const delta = 2;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safePage - delta && i <= safePage + delta)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "…") {
        pages.push("…");
      }
    }
    return pages;
  }, [totalPages, safePage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNewsletterClick={() => setNewsletterOpen(true)} />

      {/* Page header */}
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="container text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-gradient-fun mb-1">
            Available Inventory
          </h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? "Loading…" : `${filtered.length.toLocaleString()} items · Buffalo pickup`}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="container py-3 flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search inventory…"
              value={searchQuery}
              onChange={(e) => setParam("q", e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-gray-50"
            />
          </div>

          {/* Category dropdown */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-4 w-4 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setParam("cat", e.target.value)}
              className="py-2 pl-3 pr-7 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <select
            value={sortOption}
            onChange={(e) => setParam("sort", e.target.value)}
            className="py-2 pl-3 pr-7 rounded-lg border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="title-asc">Name A→Z</option>
            <option value="title-desc">Name Z→A</option>
          </select>

          {/* Per page */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span className="hidden sm:inline">Show</span>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.set("per", String(n));
                  p.delete("page");
                  setSearchParams(p, { replace: true });
                }}
                className={`px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${
                  pageSize === n
                    ? "bg-primary text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <main className="container py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: pageSize }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-gray-100 aspect-square animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-lg">No listings found</p>
            <p className="text-sm mt-1">Try adjusting your search or category</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Showing {((safePage - 1) * pageSize) + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length.toLocaleString()} listings
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {paginated.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-10 flex-wrap">
                <button
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage === 1}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {pageNums.map((n, i) =>
                  n === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-gray-400">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => goToPage(n as number)}
                      className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                        n === safePage
                          ? "bg-primary text-white shadow-sm"
                          : "border border-gray-200 hover:bg-gray-100 text-gray-600"
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}

                <button
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
      <NewsletterModal open={newsletterOpen} onOpenChange={setNewsletterOpen} />
    </div>
  );
};

export default Shop;
