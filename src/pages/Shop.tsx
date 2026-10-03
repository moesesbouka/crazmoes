import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X, Sparkles, PackageSearch } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCardV2 } from "@/components/storefront/ProductCardV2";
import { Button } from "@/components/ui/button";
import { fetchCatalogPage } from "@/storefront/catalog";
import { getDepartment, STOREFRONT_DEPARTMENTS } from "@/storefront/taxonomy";
import type { CatalogSort } from "@/storefront/types";

const PAGE_SIZE = 36;

const sortOptions: Array<{ value: CatalogSort; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "title-asc", label: "Name A–Z" },
];

function parsePrice(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(searchParams.get("q") ?? "");

  const query = searchParams.get("q") ?? "";
  const departmentSlug = searchParams.get("dept") ?? "";
  const subcategorySlug = searchParams.get("sub") ?? "";
  const sort = (searchParams.get("sort") as CatalogSort) || "newest";
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const minPrice = parsePrice(searchParams.get("min"));
  const maxPrice = parsePrice(searchParams.get("max"));
  const department = getDepartment(departmentSlug);

  const setParam = (key: string, value?: string, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (resetPage) next.delete("page");
    if (key === "dept") next.delete("sub");
    setSearchParams(next, { replace: true });
  };

  const catalogQuery = useQuery({
    queryKey: ["storefront-catalog", query, departmentSlug, subcategorySlug, sort, page, minPrice, maxPrice],
    queryFn: () =>
      fetchCatalogPage({
        query,
        department: departmentSlug || undefined,
        subcategory: subcategorySlug || undefined,
        sort,
        page,
        pageSize: PAGE_SIZE,
        minPrice,
        maxPrice,
      }),
    placeholderData: (previous) => previous,
  });

  const data = catalogQuery.data;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const safePage = Math.min(page, totalPages);

  const pageNumbers = useMemo(() => {
    const values: Array<number | "…"> = [];
    for (let i = 1; i <= totalPages; i += 1) {
      if (i === 1 || i === totalPages || Math.abs(i - safePage) <= 2) values.push(i);
      else if (values[values.length - 1] !== "…") values.push("…");
    }
    return values;
  }, [safePage, totalPages]);

  const activeFilters = [query, departmentSlug, subcategorySlug, minPrice != null ? "min" : "", maxPrice != null ? "max" : ""].filter(Boolean).length;

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setParam("q", searchDraft.trim());
  };

  const clearFilters = () => {
    setSearchDraft("");
    const next = new URLSearchParams();
    if (sort !== "newest") next.set("sort", sort);
    setSearchParams(next, { replace: true });
  };

  const goToPage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    setSearchParams(next, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main>
        <section className="relative overflow-hidden border-b border-border/70">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-24 -top-40 h-[34rem] w-[34rem] rounded-full bg-primary/[0.08] blur-[120px]" />
            <div className="absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-white/[0.025] blur-[100px]" />
          </div>

          <div className="container relative py-12 sm:py-16">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Buffalo pickup · inventory changes daily
              </div>
              <h1 className="text-balance text-4xl font-black tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                Serious deals. <span className="text-primary">Zero big-box markup.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Browse open-box, closeout and liquidation inventory from major brands. What you see is what is available — until it is gone.
              </p>

              <form onSubmit={submitSearch} className="mx-auto mt-7 flex max-w-2xl gap-2 rounded-2xl border border-border bg-card/75 p-2 shadow-2xl backdrop-blur-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="Search TVs, tools, furniture, appliances…"
                    className="h-11 w-full bg-transparent pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <Button type="submit" className="h-11 rounded-xl px-5 font-bold">Search</Button>
              </form>
            </div>
          </div>
        </section>

        <section className="border-b border-border/70 bg-card/30">
          <div className="container flex gap-2 overflow-x-auto py-3 no-scrollbar">
            <button
              onClick={() => setParam("dept", "")}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${!departmentSlug ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/50 text-muted-foreground hover:text-foreground"}`}
            >
              All deals
            </button>
            {STOREFRONT_DEPARTMENTS.map((item) => (
              <button
                key={item.slug}
                onClick={() => setParam("dept", item.slug)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${departmentSlug === item.slug ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/50 text-muted-foreground hover:text-foreground"}`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </section>

        <div className="container py-8 lg:py-10">
          <div className="flex items-start gap-8">
            <aside className="sticky top-24 hidden w-64 shrink-0 lg:block">
              <div className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-sm">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-black tracking-tight">Departments</h2>
                  {activeFilters > 0 && (
                    <button onClick={clearFilters} className="text-[11px] font-bold text-primary hover:underline">Clear</button>
                  )}
                </div>

                <nav className="space-y-1">
                  <button
                    onClick={() => setParam("dept", "")}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${!departmentSlug ? "bg-primary/10 font-bold text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  >
                    All inventory
                  </button>
                  {STOREFRONT_DEPARTMENTS.map((item) => (
                    <button
                      key={item.slug}
                      onClick={() => setParam("dept", item.slug)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${departmentSlug === item.slug ? "bg-primary/10 font-bold text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                    >
                      {item.name}
                    </button>
                  ))}
                </nav>

                {department && department.subcategories.length > 0 && (
                  <div className="mt-6 border-t border-border pt-5">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{department.name}</p>
                    <div className="space-y-1">
                      {department.subcategories.map((subcategory) => (
                        <button
                          key={subcategory.slug}
                          onClick={() => setParam("sub", subcategory.slug)}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${subcategorySlug === subcategory.slug ? "bg-secondary font-bold text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                        >
                          {subcategory.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 border-t border-border pt-5">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Price</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      inputMode="numeric"
                      defaultValue={minPrice ?? ""}
                      onBlur={(event) => setParam("min", event.target.value.trim())}
                      placeholder="Min"
                      className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                    />
                    <input
                      inputMode="numeric"
                      defaultValue={maxPrice ?? ""}
                      onBlur={(event) => setParam("max", event.target.value.trim())}
                      placeholder="Max"
                      className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                    {department?.name ?? "All inventory"}
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                    {subcategorySlug && department?.subcategories.find((item) => item.slug === subcategorySlug)?.name
                      ? department.subcategories.find((item) => item.slug === subcategorySlug)?.name
                      : department?.description ?? "Fresh finds, updated constantly."}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {catalogQuery.isLoading ? "Loading inventory…" : `${total.toLocaleString()} ${total === 1 ? "deal" : "deals"} available`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" className="lg:hidden rounded-xl" onClick={() => setFiltersOpen(true)}>
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filters {activeFilters > 0 ? `(${activeFilters})` : ""}
                  </Button>
                  <select
                    value={sort}
                    onChange={(event) => setParam("sort", event.target.value)}
                    className="h-10 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {catalogQuery.isError ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
                  <PackageSearch className="mx-auto h-10 w-10 text-destructive/70" />
                  <h3 className="mt-4 text-lg font-black">Inventory could not load</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Refresh the page or try again in a moment.</p>
                </div>
              ) : catalogQuery.isLoading && !data ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <div key={index} className="overflow-hidden rounded-[1.35rem] border border-border bg-card">
                      <div className="aspect-[4/3] animate-pulse bg-secondary" />
                      <div className="space-y-3 p-5">
                        <div className="h-4 w-4/5 animate-pulse rounded bg-secondary" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
                        <div className="h-6 w-1/3 animate-pulse rounded bg-secondary" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card/50 px-6 py-16 text-center">
                  <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground/40" />
                  <h3 className="mt-4 text-xl font-black">No deals matched that search</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Try a broader search or clear a filter. Inventory changes constantly, so check back often.</p>
                  <Button onClick={clearFilters} className="mt-5 rounded-xl">Show all inventory</Button>
                </div>
              ) : (
                <motion.div layout className={`grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3 ${catalogQuery.isFetching ? "opacity-65" : "opacity-100"} transition-opacity`}>
                  {items.map((listing, index) => (
                    <ProductCardV2 key={listing.facebook_id} listing={listing} index={index} />
                  ))}
                </motion.div>
              )}

              {totalPages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Catalog pages">
                  <Button variant="outline" size="icon" className="rounded-xl" disabled={safePage <= 1} onClick={() => goToPage(safePage - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="hidden items-center gap-1 sm:flex">
                    {pageNumbers.map((value, index) => value === "…" ? (
                      <span key={`dots-${index}`} className="px-2 text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={value}
                        onClick={() => goToPage(value)}
                        className={`h-10 min-w-10 rounded-xl px-3 text-sm font-bold transition ${value === safePage ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <span className="px-3 text-sm text-muted-foreground sm:hidden">{safePage} / {totalPages}</span>
                  <Button variant="outline" size="icon" className="rounded-xl" disabled={safePage >= totalPages} onClick={() => goToPage(safePage + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </nav>
              )}
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {filtersOpen && (
          <>
            <motion.button
              aria-label="Close filters"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFiltersOpen(false)}
              className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-[80] w-[88vw] max-w-sm overflow-y-auto border-l border-border bg-background p-5 lg:hidden"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Refine inventory</p>
                  <h2 className="mt-1 text-xl font-black">Filters</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setFiltersOpen(false)}><X className="h-5 w-5" /></Button>
              </div>

              <div className="mt-6 space-y-2">
                <button onClick={() => setParam("dept", "")} className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold ${!departmentSlug ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>All inventory</button>
                {STOREFRONT_DEPARTMENTS.map((item) => (
                  <button key={item.slug} onClick={() => setParam("dept", item.slug)} className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold ${departmentSlug === item.slug ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>{item.name}</button>
                ))}
              </div>

              {department && department.subcategories.length > 0 && (
                <div className="mt-6 border-t border-border pt-5">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{department.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {department.subcategories.map((subcategory) => (
                      <button key={subcategory.slug} onClick={() => setParam("sub", subcategory.slug)} className={`rounded-full border px-3 py-2 text-xs font-bold ${subcategorySlug === subcategory.slug ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{subcategory.name}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8 flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={clearFilters}>Clear all</Button>
                <Button className="flex-1 rounded-xl" onClick={() => setFiltersOpen(false)}>Show deals</Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default Shop;
