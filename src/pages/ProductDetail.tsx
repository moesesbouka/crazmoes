import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  MapPin,
  Maximize2,
  PackageCheck,
  RotateCcw,
  Share2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductImage } from "@/components/ProductImage";
import { ProductCardV2 } from "@/components/storefront/ProductCardV2";
import {
  cleanImages,
  fetchCatalogPage,
  fetchStorefrontListingByFacebookId,
  formatCatalogPrice,
} from "@/storefront/catalog";
import { classifyListing } from "@/storefront/taxonomy";

const RECENT_KEY = "crazymoe-recent-products-v2";
const FAVORITES_KEY = "crazymoe-favorite-products-v2";

function readIds(key: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

const ProductDetail = () => {
  const { id = "" } = useParams<{ id: string }>();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [favorite, setFavorite] = useState(false);

  const productQuery = useQuery({
    queryKey: ["storefront-product", id],
    queryFn: () => fetchStorefrontListingByFacebookId(id),
    enabled: Boolean(id),
  });

  const listing = productQuery.data ?? null;
  const classification = useMemo(() => (listing ? classifyListing(listing) : null), [listing]);

  const relatedQuery = useQuery({
    queryKey: ["related-products", classification?.department?.slug, id],
    queryFn: () =>
      fetchCatalogPage({
        department: classification?.department?.slug,
        page: 1,
        pageSize: 12,
        sort: "newest",
      }),
    enabled: Boolean(listing && classification?.department),
  });

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [id]);

  useEffect(() => {
    if (!listing) return;
    document.title = `${listing.title} | Crazy Moe's`;
    setFavorite(readIds(FAVORITES_KEY).includes(listing.facebook_id));

    const recent = readIds(RECENT_KEY).filter((item) => item !== listing.facebook_id);
    localStorage.setItem(RECENT_KEY, JSON.stringify([listing.facebook_id, ...recent].slice(0, 20)));
  }, [listing]);

  const images = cleanImages(listing?.images);
  const displayImage = images[selectedImageIndex] || "";
  const related = (relatedQuery.data?.items ?? []).filter((item) => item.facebook_id !== listing?.facebook_id).slice(0, 4);

  const toggleFavorite = () => {
    if (!listing) return;
    const current = new Set(readIds(FAVORITES_KEY));
    if (current.has(listing.facebook_id)) {
      current.delete(listing.facebook_id);
      setFavorite(false);
      toast.success("Removed from favorites");
    } else {
      current.add(listing.facebook_id);
      setFavorite(true);
      toast.success("Saved to favorites");
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(current)));
  };

  const shareListing = async () => {
    if (!listing) return;
    const shareData = { title: listing.title, text: `${listing.title} — ${formatCatalogPrice(listing.price)} at Crazy Moe's`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Product link copied");
      }
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") toast.error("Could not share this listing");
    }
  };

  const handleCashAppBuy = () => {
    if (!listing) return;
    const amount = listing.price ?? 0;
    const note = encodeURIComponent(`Crazy Moe's - ${listing.title} - FB ${listing.facebook_id}`);
    window.open(`https://cash.app/$MOEB1978/${amount}?note=${note}`, "_blank", "noopener,noreferrer");
  };

  const moveImage = (direction: number) => {
    if (images.length < 2) return;
    setSelectedImageIndex((current) => (current + direction + images.length) % images.length);
  };

  if (productQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8 lg:py-12">
          <div className="mb-7 h-5 w-36 animate-pulse rounded bg-secondary" />
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
            <div className="aspect-[4/3] animate-pulse rounded-[2rem] bg-secondary" />
            <div className="space-y-5">
              <div className="h-4 w-28 animate-pulse rounded bg-secondary" />
              <div className="h-10 w-full animate-pulse rounded bg-secondary" />
              <div className="h-12 w-40 animate-pulse rounded bg-secondary" />
              <div className="h-36 w-full animate-pulse rounded-2xl bg-secondary" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!listing || productQuery.isError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-24 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-border bg-card">
            <PackageCheck className="h-9 w-9 text-muted-foreground" />
          </div>
          <h1 className="mt-6 text-3xl font-black tracking-tight">This deal is no longer available.</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">Liquidation inventory moves fast. There are plenty more deals waiting in the current inventory.</p>
          <Button asChild className="mt-6 rounded-full px-6"><Link to="/shop">Browse current deals</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const eyebrow = classification?.subcategory?.name ?? classification?.department?.name ?? listing.category ?? "Crazy Moe's Deal";

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <Header />

      <main>
        <div className="border-b border-border/70 bg-card/20">
          <div className="container flex min-h-12 items-center gap-2 overflow-x-auto text-xs text-muted-foreground no-scrollbar">
            <Link to="/shop" className="whitespace-nowrap hover:text-foreground">Inventory</Link>
            <span>/</span>
            {classification?.department && (
              <>
                <Link to={`/shop?dept=${classification.department.slug}`} className="whitespace-nowrap hover:text-foreground">{classification.department.name}</Link>
                <span>/</span>
              </>
            )}
            <span className="max-w-[52vw] truncate text-foreground">{listing.title}</span>
          </div>
        </div>

        <div className="container py-7 lg:py-10">
          <Link to="/shop" className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to inventory
          </Link>

          <div className="grid gap-9 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)] xl:gap-14">
            <section className="min-w-0">
              <div className="group relative overflow-hidden rounded-[1.75rem] border border-border/80 bg-card shadow-[0_30px_90px_-50px_rgba(0,0,0,0.95)] sm:rounded-[2rem]">
                <div className="aspect-[4/3] bg-gradient-to-br from-secondary/80 via-card to-background p-3 sm:p-6">
                  {displayImage ? (
                    <button onClick={() => setLightboxOpen(true)} className="h-full w-full cursor-zoom-in" aria-label="Open full-screen product image">
                      <ProductImage src={displayImage} alt={listing.title} className="h-full w-full rounded-xl bg-transparent" showProcessingIndicator={false} />
                    </button>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/35">
                      <div className="text-center"><ImageIcon className="mx-auto h-12 w-12" /><p className="mt-3 text-sm font-semibold">Gallery processing</p></div>
                    </div>
                  )}
                </div>

                {images.length > 1 && (
                  <>
                    <button onClick={() => moveImage(-1)} className="absolute left-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/55 text-white opacity-100 backdrop-blur-xl transition sm:opacity-0 sm:group-hover:opacity-100" aria-label="Previous image">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button onClick={() => moveImage(1)} className="absolute right-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/55 text-white opacity-100 backdrop-blur-xl transition sm:opacity-0 sm:group-hover:opacity-100" aria-label="Next image">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                <button onClick={() => setLightboxOpen(true)} className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-xl">
                  <Maximize2 className="h-3.5 w-3.5" /> {images.length || 1} {images.length === 1 ? "photo" : "photos"}
                </button>
              </div>

              {images.length > 1 && (
                <div className="mt-4 flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
                  {images.map((url, index) => (
                    <button
                      key={`${url}-${index}`}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`h-20 w-24 shrink-0 overflow-hidden rounded-xl border-2 bg-card p-1 transition sm:h-24 sm:w-28 ${index === selectedImageIndex ? "border-primary" : "border-transparent hover:border-border"}`}
                    >
                      <ProductImage src={url} alt={`${listing.title} photo ${index + 1}`} className="h-full w-full rounded-lg bg-transparent" showProcessingIndicator={false} />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="lg:sticky lg:top-24 lg:self-start">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.13em] text-emerald-400">
                  <Check className="h-3.5 w-3.5" /> Available
                </span>
                <span className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">{eyebrow}</span>
              </div>

              <h1 className="mt-5 text-balance text-3xl font-black leading-[1.08] tracking-[-0.035em] sm:text-4xl xl:text-[2.75rem]">{listing.title}</h1>

              <div className="mt-6 flex items-end justify-between gap-4 border-b border-border pb-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Crazy Moe's price</p>
                  <p className="mt-1 text-4xl font-black tracking-[-0.04em] text-primary sm:text-5xl">{formatCatalogPrice(listing.price)}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={toggleFavorite} variant="outline" size="icon" className={`rounded-full ${favorite ? "border-primary text-primary" : ""}`} aria-label="Save favorite">
                    <Heart className={`h-4 w-4 ${favorite ? "fill-current" : ""}`} />
                  </Button>
                  <Button onClick={shareListing} variant="outline" size="icon" className="rounded-full" aria-label="Share product"><Share2 className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-card/65 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Condition</p>
                  <p className="mt-1.5 text-sm font-bold">{listing.condition || "See description"}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card/65 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Pickup</p>
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-bold"><MapPin className="h-3.5 w-3.5 text-primary" />{listing.location || "Buffalo, NY"}</p>
                </div>
              </div>

              {listing.description && (
                <div className="mt-6">
                  <h2 className="text-sm font-black uppercase tracking-[0.12em]">About this deal</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{listing.description}</p>
                </div>
              )}

              <div className="mt-7 space-y-3">
                <Button asChild size="lg" className="h-14 w-full rounded-2xl text-base font-black shadow-[0_15px_45px_-20px_hsl(var(--primary)/0.65)]">
                  <Link to={`/schedule-pickup?product=${listing.facebook_id}`}><Calendar className="mr-2 h-5 w-5" /> Schedule Pickup</Link>
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleCashAppBuy} variant="outline" className="h-12 rounded-xl font-bold"><DollarSign className="mr-1.5 h-4 w-4" /> Cash App</Button>
                  {listing.listing_url ? (
                    <Button asChild variant="outline" className="h-12 rounded-xl font-bold">
                      <a href={listing.listing_url} target="_blank" rel="noreferrer">Facebook <ExternalLink className="ml-1.5 h-3.5 w-3.5" /></a>
                    </Button>
                  ) : (
                    <Button onClick={shareListing} variant="outline" className="h-12 rounded-xl font-bold">Share <Share2 className="ml-1.5 h-3.5 w-3.5" /></Button>
                  )}
                </div>
              </div>

              <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card/50 px-4">
                <div className="flex gap-3 py-4"><PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-bold">Local pickup</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">Schedule before heading over so your item can be confirmed and ready.</p></div></div>
                <div className="flex gap-3 py-4"><RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-bold">7-day DOA coverage</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">Eligible items that are dead on arrival can be exchanged or refunded within 7 days.</p></div></div>
                <div className="flex gap-3 py-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-bold">Real liquidation inventory</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">Open-box, return and closeout inventory sourced from major retailers.</p></div></div>
              </div>
            </section>
          </div>

          {related.length > 0 && (
            <section className="mt-20 border-t border-border pt-12 lg:mt-28">
              <div className="flex items-end justify-between gap-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary"><Sparkles className="mr-1.5 inline h-3.5 w-3.5" />More worth seeing</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">More deals in {classification?.department?.name}</h2>
                </div>
                <Button asChild variant="ghost" className="hidden rounded-full sm:inline-flex"><Link to={`/shop?dept=${classification?.department?.slug}`}>View department <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              </div>
              <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                {related.map((item, index) => <ProductCardV2 key={item.facebook_id} listing={item} index={index} />)}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/92 backdrop-blur-xl lg:hidden">
        <div className="container flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Deal price</p>
            <p className="truncate text-xl font-black text-primary">{formatCatalogPrice(listing.price)}</p>
          </div>
          <Button asChild className="h-12 rounded-xl px-5 font-black"><Link to={`/schedule-pickup?product=${listing.facebook_id}`}>Reserve Pickup</Link></Button>
        </div>
      </div>

      <AnimatePresence>
        {lightboxOpen && displayImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] grid place-items-center bg-black/95 p-4 sm:p-10" onClick={() => setLightboxOpen(false)}>
            <button onClick={() => setLightboxOpen(false)} className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/10 text-white" aria-label="Close full-screen gallery"><X className="h-5 w-5" /></button>
            {images.length > 1 && <button onClick={(event) => { event.stopPropagation(); moveImage(-1); }} className="absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white sm:left-8"><ChevronLeft className="h-6 w-6" /></button>}
            <motion.img key={displayImage} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} src={displayImage} alt={listing.title} className="max-h-[88vh] max-w-[90vw] object-contain" onClick={(event) => event.stopPropagation()} />
            {images.length > 1 && <button onClick={(event) => { event.stopPropagation(); moveImage(1); }} className="absolute right-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white sm:right-8"><ChevronRight className="h-6 w-6" /></button>}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-xl">{selectedImageIndex + 1} / {images.length}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductDetail;
