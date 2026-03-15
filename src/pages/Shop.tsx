import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { NewsletterModal } from "@/components/NewsletterModal";
import { Footer } from "@/components/Footer";
import { marketplaceDb } from "@/lib/marketplace-client";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X, MapPin, ArrowUpRight, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

function ListingCard({ listing, index }: { listing: Listing; index: number }) {
  const imgs = getCleanImages(listing.images);
  const img = imgs[0] || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: Math.min(index % 20, 10) * 0.03 }}
    >
      <Link
        to={`/product/${listing.facebook_id}`}
        className="group block"
      >
        <article className="rounded-2xl border border-border bg-card overflow-hidden transition-all duration-500 hover:border-primary/30 glow-border">
          <div className="aspect-[4/3] bg-secondary overflow-hidden relative">
            {img ? (
              <img
                src={img}
                alt={listing.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-10 w-10 text-muted-foreground/20" />
              </div>
            )}
            {listing.category && (
              <span className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-md text-[0.65rem] font-semibold text-foreground border border-border/50">
                {listing.category}
              </span>
            )}
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              <ArrowUpRight className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
          </div>
          <div className="p-4">
            <h3 className="text-sm font-bold line-clamp-2 leading-tight tracking-tight group-hover:text-primary transition-colors duration-300">
              {listing.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-muted-foreground text-[0.65rem]">
              <MapPin className="h-2.5 w-2.5" />
              <span>Buffalo pickup</span>
            </div>
            <div className="flex items-end justify-between mt-3 pt-3 border-t border-border">
              <p className="text-lg font-black tracking-tight text-foreground leading-none">
                {formatPrice(listing.price)}
              </p>
              <span className="text-[0.65rem] font-bold text-primary">View →</span>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const activeFilterCount = (selectedCategory !== "All" ? 1 : 0) + (searchQuery ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden border-b border-border"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-primary/[0.06] blur-[100px]" />
        </div>
        <div className="container relative z-10 py-12 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xs uppercase tracking-[0.25em] text-primary font-semibold"
          >
            Buffalo pickup deals
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl md:text-5xl font-black tracking-tight mt-3"
          >
            Available Inventory
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground mt-3 text-base"
          >
            {isLoading ? "Loading inventory…" : `${filtered.length.toLocaleString()} items ready for pickup`}
          </motion.p>
        </div>
      </motion.div>

      {/* Sticky filter bar */}
      <div className="border-b border-border sticky top-[72px] z-30 glass-card">
        <div className="container py-3 flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search inventory…"
              value={searchQuery}
              onChange={(e) => setParam("q", e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-secondary/50 text-foreground placeholder:text-muted-foreground transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setParam("q", "")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category pills - horizontal scroll on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {categories.slice(0, 8).map((cat) => (
              <button
                key={cat}
                onClick={() => setParam("cat", cat === "All" ? "" : cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                  (cat === "All" && selectedCategory === "All") || cat === selectedCategory
                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_-3px_hsl(var(--primary)/0.4)]"
                    : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border"
                }`}
              >
                {cat}
              </button>
            ))}
            {categories.length > 8 && (
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary/50 text-muted-foreground hover:text-foreground border border-border whitespace-nowrap flex items-center gap-1.5"
              >
                <SlidersHorizontal className="h-3 w-3" />
                More
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[0.6rem] flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Sort + page size */}
          <div className="flex items-center gap-2">
            <select
              value={sortOption}
              onChange={(e) => setParam("sort", e.target.value)}
              className="py-2.5 pl-3 pr-7 rounded-xl border border-border text-xs font-medium bg-secondary/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
              <option value="title-asc">A→Z</option>
              <option value="title-desc">Z→A</option>
            </select>

            <div className="hidden sm:flex items-center gap-1">
              {PAGE_SIZE_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    const p = new URLSearchParams(searchParams);
                    p.set("per", String(n));
                    p.delete("page");
                    setSearchParams(p, { replace: true });
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
                    pageSize === n
                      ? "bg-primary text-primary-foreground shadow-[0_0_12px_-3px_hsl(var(--primary)/0.4)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Expanded filter panel */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-border"
            >
              <div className="container py-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">All categories</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setParam("cat", cat === "All" ? "" : cat);
                        setFiltersOpen(false);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                        (cat === "All" && selectedCategory === "All") || cat === selectedCategory
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid */}
      <main className="container py-8">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: pageSize > 20 ? 20 : pageSize }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card aspect-[3/4] shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24"
          >
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-bold text-xl">No listings found</p>
            <p className="text-muted-foreground text-sm mt-2">Try adjusting your search or category filter</p>
            <button
              onClick={() => {
                setParam("q", "");
                setParam("cat", "");
              }}
              className="mt-4 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Clear filters
            </button>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-muted-foreground">
                Showing <span className="text-foreground font-semibold">{((safePage - 1) * pageSize) + 1}–{Math.min(safePage * pageSize, filtered.length)}</span> of {filtered.length.toLocaleString()}
              </p>
              {selectedCategory !== "All" && (
                <button
                  onClick={() => setParam("cat", "")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                >
                  {selectedCategory}
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {paginated.map((l, i) => (
                <ListingCard key={l.id} listing={l} index={i} />
              ))}
            </div>

            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex items-center justify-center gap-1.5 mt-12 flex-wrap"
              >
                <button
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage === 1}
                  className="p-2.5 rounded-xl border border-border disabled:opacity-30 hover:bg-secondary transition-all hover:scale-105"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {pageNums.map((n, i) =>
                  n === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => goToPage(n as number)}
                      className={`min-w-[40px] h-10 px-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                        n === safePage
                          ? "bg-primary text-primary-foreground shadow-[0_0_15px_-3px_hsl(var(--primary)/0.4)]"
                          : "border border-border hover:bg-secondary text-muted-foreground hover:scale-105"
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}

                <button
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  className="p-2.5 rounded-xl border border-border disabled:opacity-30 hover:bg-secondary transition-all hover:scale-105"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </motion.div>
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
