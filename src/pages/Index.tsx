import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Armchair,
  BadgePercent,
  Bike,
  Car,
  Clock3,
  Dumbbell,
  Gamepad2,
  Hammer,
  Home,
  MapPin,
  Package,
  Refrigerator,
  Search,
  ShieldCheck,
  Sparkles,
  Tv,
  Wrench,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCardV2 } from "@/components/storefront/ProductCardV2";
import { ProductImage } from "@/components/ProductImage";
import { Button } from "@/components/ui/button";
import { cleanImages, fetchCatalogPage, formatCatalogPrice } from "@/storefront/catalog";
import { STOREFRONT_DEPARTMENTS } from "@/storefront/taxonomy";

const departmentIcons: Record<string, typeof Package> = {
  electronics: Tv,
  appliances: Refrigerator,
  furniture: Armchair,
  "home-improvement": Home,
  "tools-equipment": Wrench,
  "outdoor-seasonal": Sparkles,
  fitness: Dumbbell,
  "scooters-ebikes": Bike,
  "gaming-arcade": Gamepad2,
  "smart-home-security": ShieldCheck,
  automotive: Car,
  "kids-toys": Package,
};

function ProductRail({
  title,
  eyebrow,
  items,
  href,
}: {
  title: string;
  eyebrow: string;
  items: Awaited<ReturnType<typeof fetchCatalogPage>>["items"];
  href: string;
}) {
  if (!items.length) return null;
  return (
    <section className="py-12 sm:py-16">
      <div className="container">
        <div className="mb-6 flex items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl lg:text-4xl">{title}</h2>
          </div>
          <Button asChild variant="ghost" className="hidden rounded-full font-bold sm:inline-flex">
            <Link to={href}>See all <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {items.slice(0, 8).map((listing, index) => (
            <ProductCardV2 key={listing.facebook_id} listing={listing} index={index} />
          ))}
        </div>
        <Button asChild variant="outline" className="mt-6 w-full rounded-xl font-bold sm:hidden">
          <Link to={href}>See all deals <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    </section>
  );
}

const Index = () => {
  useEffect(() => {
    document.title = "Crazy Moe's | Big Brand Deals. Buffalo Pickup.";
  }, []);

  const newestQuery = useQuery({
    queryKey: ["home-newest"],
    queryFn: () => fetchCatalogPage({ page: 1, pageSize: 12, sort: "newest" }),
  });
  const under100Query = useQuery({
    queryKey: ["home-under-100"],
    queryFn: () => fetchCatalogPage({ page: 1, pageSize: 8, maxPrice: 100, sort: "newest" }),
  });
  const bigTicketQuery = useQuery({
    queryKey: ["home-big-ticket"],
    queryFn: () => fetchCatalogPage({ page: 1, pageSize: 8, minPrice: 250, sort: "newest" }),
  });

  const newest = newestQuery.data?.items ?? [];
  const heroProduct = newest.find((item) => cleanImages(item.images).length > 0) ?? newest[0];
  const heroImage = heroProduct ? cleanImages(heroProduct.images)[0] : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main>
        <section className="relative overflow-hidden border-b border-border/70">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-48 -top-56 h-[48rem] w-[48rem] rounded-full bg-primary/[0.12] blur-[150px]" />
            <div className="absolute -bottom-48 left-[-10%] h-[34rem] w-[34rem] rounded-full bg-white/[0.03] blur-[120px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.035),transparent_38%)]" />
          </div>

          <div className="container relative grid min-h-[650px] items-center gap-10 py-14 lg:grid-cols-[0.92fr_1.08fr] lg:py-20 xl:min-h-[720px]">
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }} className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                <Zap className="h-3.5 w-3.5" /> Buffalo's constantly changing deal floor
              </div>
              <h1 className="mt-6 max-w-3xl text-balance text-[clamp(3rem,7vw,6.75rem)] font-black leading-[0.88] tracking-[-0.065em]">
                Big brands.<br /><span className="text-primary">Wild prices.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Open-box, return and closeout inventory from major retailers — priced to move and ready for local Buffalo pickup.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-13 rounded-full px-7 text-sm font-black shadow-[0_18px_50px_-18px_hsl(var(--primary)/0.65)]">
                  <Link to="/shop">Shop current inventory <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-13 rounded-full px-7 text-sm font-bold">
                  <Link to="/shop"><Search className="mr-2 h-4 w-4" /> Search deals</Link>
                </Button>
              </div>

              <div className="mt-9 grid max-w-lg grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card/45 py-4 backdrop-blur-sm">
                <div className="px-4"><p className="text-xl font-black">Fresh</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">inventory</p></div>
                <div className="px-4"><p className="text-xl font-black">Local</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">pickup</p></div>
                <div className="px-4"><p className="text-xl font-black">7-day</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">DOA coverage</p></div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12, duration: 0.75 }} className="relative mx-auto w-full max-w-[720px]">
              <div className="absolute -inset-6 rounded-[3rem] bg-primary/[0.07] blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-card shadow-[0_45px_120px_-50px_rgba(0,0,0,0.95)] sm:rounded-[2.5rem]">
                <div className="absolute left-4 top-4 z-20 rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-xl sm:left-6 sm:top-6">
                  Just landed
                </div>
                <div className="aspect-[4/3] bg-gradient-to-br from-secondary via-card to-background p-4 sm:p-8">
                  {heroImage ? (
                    <ProductImage src={heroImage} alt={heroProduct?.title || "Featured deal"} className="h-full w-full rounded-2xl bg-transparent" showProcessingIndicator={false} />
                  ) : (
                    <div className="flex h-full items-center justify-center"><Package className="h-20 w-20 text-muted-foreground/20" /></div>
                  )}
                </div>
                {heroProduct && (
                  <Link to={`/product/${heroProduct.facebook_id}`} className="group flex items-center justify-between gap-5 border-t border-border bg-background/85 p-5 backdrop-blur-xl sm:p-6">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-bold text-muted-foreground">{heroProduct.title}</p>
                      <p className="mt-1 text-3xl font-black tracking-tight text-primary">{formatCatalogPrice(heroProduct.price)}</p>
                    </div>
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 group-hover:translate-x-1"><ArrowRight className="h-5 w-5" /></div>
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-b border-border/70 bg-card/25 py-5">
          <div className="container grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [BadgePercent, "Liquidation pricing", "Major-brand inventory without big-box markup"],
              [Clock3, "Inventory moves fast", "New finds arrive and sell constantly"],
              [MapPin, "Buffalo pickup", "Schedule before heading to the warehouse"],
              [ShieldCheck, "Buy with confidence", "7-day DOA exchange/refund on eligible items"],
            ].map(([Icon, title, text]) => {
              const C = Icon as typeof BadgePercent;
              return <div key={String(title)} className="flex gap-3 rounded-xl px-2 py-2"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><C className="h-4 w-4" /></div><div><p className="text-sm font-black">{String(title)}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{String(text)}</p></div></div>;
            })}
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="container">
            <div className="mb-7 flex items-end justify-between gap-5">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Shop your way</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Explore departments</h2>
              </div>
              <p className="hidden max-w-sm text-right text-sm leading-6 text-muted-foreground md:block">A cleaner way to browse liquidation inventory — organized like a real retailer, not a Facebook feed.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {STOREFRONT_DEPARTMENTS.map((department, index) => {
                const Icon = departmentIcons[department.slug] ?? Package;
                return (
                  <motion.div key={department.slug} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(index, 8) * 0.035 }}>
                    <Link to={`/shop?dept=${department.slug}`} className="group flex min-h-[150px] h-full flex-col rounded-2xl border border-border bg-card/55 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-card">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary"><Icon className="h-5 w-5" /></div>
                      <p className="mt-auto pt-6 text-sm font-black leading-tight">{department.name}</p>
                      <span className="mt-2 inline-flex items-center text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors group-hover:text-primary">Browse <ArrowRight className="ml-1 h-3 w-3" /></span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="border-y border-border/70 bg-card/20">
          <ProductRail title="Just dropped" eyebrow="New arrivals" items={newest.slice(0, 8)} href="/shop?sort=newest" />
        </div>

        <ProductRail title="Deals under $100" eyebrow="Easy wins" items={under100Query.data?.items ?? []} href="/shop?max=100" />

        <section className="container py-8 sm:py-14">
          <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
            <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-primary/15 blur-[100px]" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">The Crazy Moe difference</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.035em] sm:text-4xl">The kind of prices that make the warehouse trip worth it.</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">Inventory comes from liquidation, returns, open-box and closeout channels. That means selection changes constantly — and the best stuff rarely sits around.</p>
              </div>
              <Button asChild size="lg" className="h-13 rounded-full px-7 font-black"><Link to="/shop">See what's here now <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </div>
          </div>
        </section>

        <div className="border-y border-border/70 bg-card/20">
          <ProductRail title="Big-ticket steals" eyebrow="Worth the look" items={bigTicketQuery.data?.items ?? []} href="/shop?min=250" />
        </div>

        <section id="visit" className="py-16 sm:py-24">
          <div className="container grid gap-5 lg:grid-cols-3">
            <div className="rounded-[1.75rem] border border-border bg-card/55 p-6 sm:p-8 lg:col-span-2">
              <div className="grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-primary/10 text-primary"><MapPin className="h-9 w-9" /></div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">Local by design</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">See it online. Pick it up in Buffalo.</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Found something you want? Schedule a pickup before heading over so availability can be confirmed and your item can be ready.</p>
                  <Button asChild variant="outline" className="mt-5 rounded-full font-bold"><Link to="/schedule-pickup">Schedule a pickup <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
                </div>
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-border bg-card/55 p-6 sm:p-8">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary"><Hammer className="h-5 w-5" /></div>
              <h3 className="mt-6 text-xl font-black">A real warehouse, not drop-shipping.</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">The products shown here represent real local liquidation inventory. When something sells, it comes out of the active catalog.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
