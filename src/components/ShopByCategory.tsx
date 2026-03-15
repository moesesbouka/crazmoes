import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import categoryFurniture from "@/assets/category-furniture.jpg";
import categoryHomeImprovement from "@/assets/category-home-improvement.jpg";
import categoryElectronics from "@/assets/category-electronics.jpg";
import categoryKitchen from "@/assets/category-kitchen.jpg";

const categories = [
  {
    name: "Furniture",
    dbCategory: "Furniture",
    description: "Open-box living room, bedroom & patio finds.",
    image: categoryFurniture,
  },
  {
    name: "Home Improvement",
    dbCategory: "Home & Garden",
    description: "Doors, fixtures, hardware & renovation deals.",
    image: categoryHomeImprovement,
  },
  {
    name: "Electronics",
    dbCategory: "Electronics",
    description: "Closeout tech, gadgets & accessories.",
    image: categoryElectronics,
  },
  {
    name: "Kitchen & Appliances",
    dbCategory: "Kitchen & Appliances",
    description: "Scratch-and-dent deals worth the trip.",
    image: categoryKitchen,
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
                <article className="rounded-2xl border border-border bg-card overflow-hidden h-full transition-all duration-500 hover:border-primary/30 glow-border">
                  {/* Category image */}
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-lg font-bold tracking-tight text-foreground drop-shadow-lg">
                        {cat.name}
                      </h3>
                    </div>
                  </div>

                  <div className="p-5 pt-3">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {cat.description}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-primary group-hover:gap-2 transition-all duration-300">
                      Browse deals →
                    </span>
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
