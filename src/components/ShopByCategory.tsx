import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Armchair, Wrench, Tv, ChefHat } from "lucide-react";

const categories = [
  {
    name: "Furniture",
    dbCategory: "Furniture",
    description: "Open-box and overstock living room, bedroom, and patio finds.",
    icon: Armchair,
    gradient: "from-amber-500/20 to-orange-600/10",
  },
  {
    name: "Home Improvement",
    dbCategory: "Home & Garden",
    description: "Doors, fixtures, hardware, and renovation bargains.",
    icon: Wrench,
    gradient: "from-emerald-500/20 to-teal-600/10",
  },
  {
    name: "Electronics",
    dbCategory: "Electronics",
    description: "Closeout tech deals, gadgets, and accessories.",
    icon: Tv,
    gradient: "from-blue-500/20 to-indigo-600/10",
  },
  {
    name: "Kitchen & Appliances",
    dbCategory: "Kitchen & Appliances",
    description: "Scratch-and-dent and closeout deals worth the trip.",
    icon: ChefHat,
    gradient: "from-rose-500/20 to-pink-600/10",
  },
];

export function ShopByCategory() {
  return (
    <section id="categories" className="py-24 relative">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="text-xs uppercase tracking-[0.25em] text-primary font-semibold">
            Shop by category
          </span>
          <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-black tracking-tight mt-2">
            Find exactly what you need.
          </h2>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto">
            Browse by department to discover deals tailored to your project.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Link to={`/shop?cat=${encodeURIComponent(cat.dbCategory)}`} className="group block h-full">
                <article className="rounded-2xl border border-border bg-card p-6 h-full transition-all duration-500 hover:border-primary/30 glow-border relative overflow-hidden">
                  {/* Background gradient on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-5 group-hover:bg-primary/10 transition-colors duration-300">
                      <cat.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight group-hover:text-foreground transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                </article>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
