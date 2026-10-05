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
    <motion.section initial={{opacity:0,y:70}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.12}} transition={{duration:.6}} className="relative overflow-hidden py-12 sm:py-16">
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
    </motion.section>
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
  const heroDeals = newest.filter((item) => cleanImages(item.images).length > 0).slice(0, 5);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main>
        <section className="relative overflow-hidden border-b border-border/70 hero-neon-stage">
          <div className="hero-scanline pointer-events-none" />
          <div className="hero-beam hero-beam-cyan pointer-events-none" />
          <div className="hero-beam hero-beam-pink pointer-events-none" />
          <motion.div initial={{x:"-120%"}} animate={{x:"120%"}} transition={{duration:2.8,repeat:Infinity,repeatDelay:1.2}} className="pointer-events-none absolute top-24 z-20 whitespace-nowrap text-[clamp(4rem,18vw,13rem)] font-black italic tracking-[-.08em] text-white/[.035]">CRAZY DEALS CRAZY DEALS</motion.div>
          <div className="container relative grid min-h-[720px] items-center gap-6 py-10 lg:grid-cols-[.82fr_1.18fr]">
            <motion.div initial={{opacity:0,x:-80}} animate={{opacity:1,x:0}} transition={{duration:.65,type:"spring"}} className="relative z-20">
              <motion.div animate={{scale:[1,1.08,1],rotate:[-2,2,-2]}} transition={{duration:1.8,repeat:Infinity}} className="inline-flex rounded-xl bg-accent px-4 py-2 text-xs font-black uppercase tracking-[.2em] text-white shadow-[0_0_35px_hsl(var(--accent)/.55)]">⚡ Inventory changes constantly</motion.div>
              <h1 className="mt-5 text-[clamp(3.7rem,9vw,8rem)] font-black leading-[.78] tracking-[-.075em]">BIG<br/><span className="text-gradient-orange animate-gradient">DEALS.</span><br/>NO WAIT.</h1>
              <motion.p animate={{opacity:[.65,1,.65]}} transition={{duration:2,repeat:Infinity}} className="mt-6 text-lg font-bold text-foreground">One-off liquidation finds. When they're gone, they're gone.</motion.p>
              <div className="mt-7 flex gap-3"><Button asChild size="lg" className="rounded-full px-8 font-black"><Link to="/shop">SHOP THE DROP <ArrowRight className="ml-2 h-4 w-4"/></Link></Button></div>
            </motion.div>
            <div className="relative z-10 min-h-[470px] sm:min-h-[560px]">
              <motion.div animate={{rotate:[-5,-2,-5],y:[0,-18,0]}} transition={{duration:4,repeat:Infinity,ease:"easeInOut"}} className="absolute left-[2%] top-[8%] z-20 rounded-2xl bg-primary px-5 py-3 text-3xl font-black text-primary-foreground shadow-2xl">40–70%<span className="block text-xs tracking-[.2em]">OFF RETAIL</span></motion.div>
              {heroDeals.map((deal,i)=>{ const img=cleanImages(deal.images)[0]; const pos=["left-[15%] top-[16%] w-[62%] rotate-[-5deg]","right-[0%] top-[3%] w-[43%] rotate-[7deg]","right-[4%] bottom-[2%] w-[48%] rotate-[-4deg]","left-[0%] bottom-[0%] w-[38%] rotate-[5deg]","left-[33%] top-[38%] w-[48%] rotate-[2deg]"][i]; return <motion.div key={deal.facebook_id} initial={{opacity:0,scale:.5,y:120}} animate={{opacity:1,scale:1,y:[0,-12,0]}} transition={{opacity:{delay:.15*i,duration:.5},scale:{delay:.15*i,duration:.55,type:"spring"},y:{delay:i*.3,duration:3+i*.35,repeat:Infinity,ease:"easeInOut"}}} className={`absolute ${pos} overflow-hidden rounded-3xl border-2 border-white/15 bg-card p-2 shadow-[0_25px_70px_rgba(0,0,0,.55)]`}>
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-secondary"><ProductImage src={img} alt={deal.title} className="h-full w-full" showProcessingIndicator={false}/></div>
                <div className="flex items-center justify-between gap-2 p-3"><p className="line-clamp-1 text-xs font-black">{deal.title}</p><span className="shrink-0 text-lg font-black text-primary">{formatCatalogPrice(deal.price)}</span></div>
              </motion.div>})}
              <motion.div animate={{rotate:360}} transition={{duration:12,repeat:Infinity,ease:"linear"}} className="absolute right-[8%] top-[44%] z-30 grid h-24 w-24 place-items-center rounded-full border-4 border-dashed border-accent bg-background/90 text-center text-xs font-black uppercase text-accent shadow-[0_0_45px_hsl(var(--accent)/.45)]">NEW<br/>DROPS</motion.div>
            </div>
          </div>
          <div className="overflow-hidden border-t border-primary/25 bg-primary py-3 text-primary-foreground"><div className="deal-ticker-track text-sm font-black uppercase tracking-[.18em]"><span>⚡ JUST LANDED</span><span>✦ LIMITED QUANTITY</span><span>⚡ BUFFALO PICKUP</span><span>✦ PRICED TO MOVE</span><span>⚡ JUST LANDED</span><span>✦ LIMITED QUANTITY</span><span>⚡ BUFFALO PICKUP</span><span>✦ PRICED TO MOVE</span></div></div>
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

        <section className="relative overflow-hidden py-14 sm:py-20"><motion.div aria-hidden animate={{x:["-10%","110%"]}} transition={{duration:8,repeat:Infinity,ease:"linear"}} className="pointer-events-none absolute top-10 whitespace-nowrap text-[7rem] font-black italic text-primary/[.035]">SHOP BY DEPARTMENT • SHOP BY DEPARTMENT •</motion.div>
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
                    <Link to={`/shop?dept=${department.slug}`} className="group relative flex min-h-[150px] h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/55 p-4 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.03] hover:border-primary/50 hover:bg-card hover:shadow-[0_18px_55px_hsl(var(--primary)/.18)]">
                      <motion.div whileHover={{rotate:12,scale:1.2}} className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary"><Icon className="h-5 w-5" /></motion.div><div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/0 blur-2xl transition-all duration-300 group-hover:bg-primary/25" />
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
          <motion.div initial={{opacity:0,scale:.94}} whileInView={{opacity:1,scale:1}} viewport={{once:true}} transition={{duration:.65}} className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
            <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-primary/15 blur-[100px]" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">The Crazy Moe difference</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.035em] sm:text-4xl">The kind of prices that make the warehouse trip worth it.</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">Inventory comes from liquidation, returns, open-box and closeout channels. That means selection changes constantly — and the best stuff rarely sits around.</p>
              </div>
              <Button asChild size="lg" className="h-13 rounded-full px-7 font-black"><Link to="/shop">See what's here now <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </div>
            <motion.div aria-hidden animate={{x:["-30%","130%"],rotate:[-8,8]}} transition={{duration:4,repeat:Infinity,repeatDelay:1}} className="pointer-events-none absolute bottom-3 text-6xl font-black italic text-accent/[.07]">WAREHOUSE PRICES</motion.div>
          </motion.div>
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
