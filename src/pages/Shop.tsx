import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { NewsletterModal } from "@/components/NewsletterModal";
import { Footer } from "@/components/Footer";
import { marketplaceDb } from "@/lib/marketplace-client";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";

interface Listing {
  id: string;
  facebook_id: string;
  title: string;
  price: number | null;
  description: string | null;
  category: string | null;
  images: unknown;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];

function getCleanImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter((u): u is string => typeof u === "string" && !!u)
    .filter((u) => /^https:\/\/(scontent|z-p[0-9]+-shbz|lookaside).*\.(jpg|jpeg|png|webp)/i.test(u));
}

function formatPrice(p: number | null) {
  if (!p || p === 0) return "Make Offer";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(p);
}

function ListingCard({ listing }: { listing: Listing }) {
  const imgs = getCleanImages(listing.images);
  const img = imgs[0] || null;

  return (
    <Link
      to={`/product/${listing.facebook_id}`}
      className="group rounded-2xl border border-border bg-card overflow-hidden hover:-translate-y-0.5 hover:border-foreground/20 transition-all duration-200 flex flex-col"
    >
      <div className="aspect-square bg-secondary overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl">📦</div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-semibold line-clamp-2 leading-tight">{listing.title}</p>
        <p className="text-base font-bold text-primary mt-auto pt-1">{formatPrice(listing.price)}</p>
        {listing.category && <span className="text-xs text-muted-foreground">{listing.category}</span>}
      </div>
    </Link>
  );
}

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newsletterOpen, setNewsletterOpen] = useState(false);

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
    document.title = "Inventory | Crazy Moe's";
  }, []);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const all: Listing[] = [];
      let offset = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await marketplaceDb
          .from("public_listings")
          .select("id,facebook_id,title,price,category,images,description")
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

  const categories = useMemo(() => {
    const cats = new Set(allListings.map((l) => l.category).filter(Boolean) as string[]);
    return ["All", ...Array.from(cats).sort()];
  }, [allListings]);

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
      default: break;
    }
    return r;
  }, [allListings, selectedCategory, searchQuery, sortOption]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const goToPage = (n: number) => setParam("page", String(n), false);

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
    <div className="min-h-screen bg-background">
      <Header />

      {/* Page header */}
      <div className="border-b border-border py-8">
        <div className="container text-center">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
            Available Inventory
          </h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? "Loading…" : `${filtered.length.toLocaleString()} items · Buffalo pickup`}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="border-b border-border sticky top-16 z-20 bg-background/95 backdrop-blur-sm">
        <div className="container py-3 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search inventory…"
              value={searchQuery}
              onChange={(e) => setParam("q", e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-full border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-secondary text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedCategory}
              onChange={(e) => setParam("cat", e.target.value)}
              className="py-2 pl-3 pr-7 rounded-full border border-border text-sm bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <select
            value={sortOption}
            onChange={(e) => setParam("sort", e.target.value)}
            className="py-2 pl-3 pr-7 rounded-full border border-border text-sm bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="title-asc">Name A→Z</option>
            <option value="title-desc">Name Z→A</option>
          </select>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
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
                className={`px-2.5 py-1 rounded-full text-sm font-medium transition-colors ${
                  pageSize === n
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-muted text-muted-foreground"
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
              <div key={i} className="rounded-2xl border border-border bg-card aspect-square animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-lg">No listings found</p>
            <p className="text-sm mt-1">Try adjusting your search or category</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Showing {((safePage - 1) * pageSize) + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length.toLocaleString()} listings
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {paginated.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-10 flex-wrap">
                <button
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage === 1}
                  className="p-2 rounded-full border border-border disabled:opacity-30 hover:bg-secondary transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {pageNums.map((n, i) =>
                  n === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => goToPage(n as number)}
                      className={`min-w-[36px] h-9 px-3 rounded-full text-sm font-medium transition-colors ${
                        n === safePage
                          ? "bg-primary text-primary-foreground"
                          : "border border-border hover:bg-secondary text-muted-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}

                <button
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  className="p-2 rounded-full border border-border disabled:opacity-30 hover:bg-secondary transition-colors"
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
