import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Clock, MapPin, Phone, Facebook, Shield, Package, Star, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { NewsletterModal } from "@/components/NewsletterModal";
import { motion } from "framer-motion";
import warehouseImage from "@/assets/warehouse.jpg";

const WAREHOUSE_ADDRESS = "74 Houghton Ave, Buffalo, NY 14212";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const values = [
  { icon: Shield, title: "Tested & Verified", desc: "Every non-sealed item is tested before it hits our shelves." },
  { icon: Package, title: "Direct From Retailers", desc: "Inventory straight from major retail chains — closeouts, liquidation, and more." },
  { icon: Star, title: "25 Years Experience", desc: "A quarter century of expertise bringing you the best deals." },
];

const About = () => {
  const [newsletterOpen, setNewsletterOpen] = useState(false);

  useEffect(() => {
    document.title = "About Us | Crazy Moe's";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header onNewsletterClick={() => setNewsletterOpen(true)} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div animate={{ x: [0, 20, 0], y: [0, -15, 0] }} transition={{ duration: 12, repeat: Infinity }} className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-primary/[0.06] blur-[100px]" />
        </div>
        <div className="container relative z-10 py-16 md:py-24 text-center">
          <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-xs uppercase tracking-[0.25em] text-primary font-semibold">
            25 years established
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }} className="text-4xl md:text-6xl font-black tracking-tight mt-4">
            About Crazy Moe's
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The original pioneer in the liquidation business. Many others in this industry either learned from Crazy Moe, followed his model, or looked up to him.
          </motion.p>
        </div>
      </section>

      {/* Story */}
      <section className="py-20">
        <div className="container">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="max-w-3xl mx-auto rounded-2xl border border-border bg-card p-8 md:p-12"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-2xl md:text-3xl font-black tracking-tight text-center mb-8">
              How we bring you <span className="text-gradient-orange">unbeatable deals</span>
            </motion.h2>
            <div className="space-y-5 text-muted-foreground leading-relaxed">
              <motion.p variants={fadeUp} custom={1}>
                Our inventory comes <strong className="text-foreground">directly from major retail chains</strong> — we specialize in closeouts, liquidation merchandise, open box items, and scratch & dent products. This is how we're able to offer you incredible savings on quality goods.
              </motion.p>
              <motion.p variants={fadeUp} custom={2}>
                <strong className="text-foreground">Every item that isn't factory sealed is thoroughly tested</strong> to ensure you're getting a good, functional product. We stand behind everything we sell.
              </motion.p>
              <motion.p variants={fadeUp} custom={3}>
                Liquidation inventory offers smart shoppers savings of <strong className="text-primary font-bold">50–90% off retail prices</strong>. Same brand-name products, just at a fraction of the cost.
              </motion.p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="text-xs uppercase tracking-[0.25em] text-primary font-semibold">Why us</span>
            <h2 className="text-3xl font-black tracking-tight mt-2">Built on trust & value.</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="rounded-2xl border border-border bg-card p-7 text-center glow-border"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <v.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold tracking-tight">{v.title}</h3>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Warehouse */}
      <section className="py-20 relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="text-xs uppercase tracking-[0.25em] text-primary font-semibold">Location</span>
            <h2 className="text-3xl font-black tracking-tight mt-2">Visit our warehouse.</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="rounded-2xl overflow-hidden border border-border">
              <img src={warehouseImage} alt="Crazy Moe's Warehouse" className="w-full h-full object-cover" />
            </motion.div>

            <div className="space-y-5">
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-6" style={{ background: "linear-gradient(180deg, hsl(25 95% 53% / 0.06) 0%, hsl(var(--card)) 60%)" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><MapPin className="h-5 w-5 text-primary" /></div>
                  <h3 className="text-xl font-bold tracking-tight">Address</h3>
                </div>
                <p className="text-foreground font-semibold text-lg">{WAREHOUSE_ADDRESS}</p>
                <p className="text-muted-foreground text-sm mt-1">Blue warehouse building with a rolling metal garage door</p>
                <Link to="/schedule-pickup">
                  <Button className="mt-5 w-full rounded-full bg-primary text-primary-foreground font-bold shadow-[0_0_30px_-8px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_40px_-8px_hsl(var(--primary)/0.6)] transition-all duration-300 gap-2">
                    <Zap className="h-4 w-4" /> Schedule a Pickup
                  </Button>
                </Link>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Clock className="h-5 w-5 text-primary" /></div>
                  <h3 className="text-xl font-bold tracking-tight">Store Hours</h3>
                </div>
                <div className="space-y-2.5">
                  {[
                    ["Monday – Friday", "9 AM – 6 PM"],
                    ["Saturday", "9 AM – 5 PM"],
                    ["Sunday", "10 AM – 4 PM"],
                  ].map(([day, hours]) => (
                    <div key={day} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                      <span className="text-sm font-medium text-foreground">{day}</span>
                      <span className="text-sm text-muted-foreground">{hours}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="container">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              Ready to find your next <span className="text-gradient-orange">treasure?</span>
            </h2>
            <p className="text-muted-foreground text-lg mt-4">Browse our full inventory and discover amazing deals.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Link to="/shop">
                <Button className="rounded-full bg-primary text-primary-foreground font-bold px-7 py-6 text-base shadow-[0_0_40px_-8px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_60px_-8px_hsl(var(--primary)/0.7)] transition-all duration-300 gap-2">
                  Start Shopping <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="rounded-full border-border text-foreground hover:bg-secondary px-7 py-6 text-base gap-2">
                  <Facebook className="h-4 w-4" /> Visit Our Facebook
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
      <NewsletterModal open={newsletterOpen} onOpenChange={setNewsletterOpen} />
    </div>
  );
};

export default About;
