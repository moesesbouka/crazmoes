import { ArrowRight, MapPin, Star, TrendingUp, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MarketplaceListing } from "@/lib/supabase-listings";

interface HeroSectionProps {
  featuredListing?: MarketplaceListing | null;
}

function getFirstImage(images: unknown): string | null {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") return images[0];
  return null;
}

function formatPrice(price: number | null): string {
  if (!price || price === 0) return "Make Offer";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const stats = [
  { value: "40-70%", label: "Off Retail", icon: TrendingUp },
  { value: "500+", label: "Items Listed", icon: Package },
  { value: "4.9★", label: "Customer Rating", icon: Star },
];

export function HeroSection({ featuredListing }: HeroSectionProps) {
  const featuredImage = featuredListing ? getFirstImage(featuredListing.images) : null;

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px]"
        />
        <motion.div
          animate={{ x: [0, -25, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-48 -left-24 w-[600px] h-[600px] rounded-full bg-primary/[0.06] blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, 15, 0], y: [0, -15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/2 w-[300px] h-[300px] rounded-full bg-accent/[0.04] blur-[80px]"
        />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="container relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-16 py-16 lg:py-0"
        >
          {/* Left: messaging */}
          <div className="flex flex-col justify-center">
            <motion.div variants={itemVariants}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/[0.08] text-primary text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                Truckload liquidation • Open box • Closeout
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-[clamp(2.8rem,7vw,5.5rem)] font-black leading-[0.9] tracking-[-0.04em] mt-6"
            >
              <span className="text-gradient-white">Big brand deals</span>
              <br />
              <span className="text-gradient-orange">without big box</span>
              <br />
              <span className="text-gradient-white">prices.</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-7 max-w-lg text-muted-foreground text-lg leading-relaxed"
            >
              Premium open-box and closeout inventory at{" "}
              <span className="text-foreground font-semibold">40–70% off retail</span>.
              Appointment pickup in Buffalo, NY — new drops every week.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap gap-3 mt-8">
              <Link to="/shop">
                <Button className="rounded-full bg-primary text-primary-foreground font-bold px-7 py-6 text-base shadow-[0_0_40px_-8px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_60px_-8px_hsl(var(--primary)/0.7)] hover:scale-[1.02] transition-all duration-300 gap-2">
                  Browse Latest Arrivals
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#visit">
                <Button
                  variant="outline"
                  className="rounded-full border-border text-foreground hover:bg-secondary px-7 py-6 text-base gap-2 hover:scale-[1.02] transition-all duration-300"
                >
                  <MapPin className="h-4 w-4" />
                  Get Directions
                </Button>
              </a>
            </motion.div>

            {/* Stats row */}
            <motion.div variants={itemVariants} className="flex gap-6 mt-10">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <stat.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-black tracking-tight text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: featured deal card */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col gap-4"
          >
            <motion.article
              whileHover={{ y: -4, transition: { duration: 0.3 } }}
              className="relative rounded-2xl border border-border bg-card p-6 glow-border overflow-hidden"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 shimmer pointer-events-none rounded-2xl" />

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Featured deal</p>
                    <h3 className="text-xl font-bold tracking-tight mt-1.5 line-clamp-1">
                      {featuredListing?.title || "Premium Closeout Deal"}
                    </h3>
                  </div>
                  <motion.span
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="shrink-0 bg-primary/15 text-primary px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap"
                  >
                    Up to 70% off
                  </motion.span>
                </div>

                <div className="rounded-xl aspect-[4/3] overflow-hidden bg-secondary group">
                  {featuredImage ? (
                    <img
                      src={featuredImage}
                      alt={featuredListing?.title || "Featured deal"}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                      <Package className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  {[
                    { label: "Condition", value: featuredListing?.condition || "New in box" },
                    { label: "Pickup", value: "Buffalo, NY" },
                    { label: "Price", value: featuredListing ? formatPrice(featuredListing.price) : "$499" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-secondary/80 p-3.5">
                      <p className="text-muted-foreground text-[0.7rem] uppercase tracking-wider">{item.label}</p>
                      <p className="font-bold text-sm mt-1">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.article>

            {/* Trust mini cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Fresh stock", desc: "New arrivals with timestamps and limited-quantity urgency." },
                { label: "Fast pickup", desc: "Reserve buttons, sticky contact, and map-first store info." },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className="rounded-2xl border border-border bg-card p-5 glow-border"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    {i === 0 ? (
                      <TrendingUp className="h-4 w-4 text-primary" />
                    ) : (
                      <MapPin className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <p className="text-lg font-bold tracking-tight">{card.label}</p>
                  <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
                    {card.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
