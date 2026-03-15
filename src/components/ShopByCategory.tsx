import { Link } from "react-router-dom";

const categories = [
  {
    name: "Furniture",
    dbCategory: "Furniture",
    description: "Open-box and overstock living room, bedroom, and patio finds.",
  },
  {
    name: "Home Improvement",
    dbCategory: "Home & Garden",
    description: "Doors, fixtures, hardware, and renovation bargains.",
  },
  {
    name: "Electronics",
    dbCategory: "Electronics",
    description: "Closeout tech deals, gadgets, and accessories.",
  },
  {
    name: "Kitchen & Appliances",
    dbCategory: "Kitchen & Appliances",
    description: "Scratch-and-dent and closeout deals worth the trip.",
  },
];

export function ShopByCategory() {
  return (
    <section
      id="categories"
      className="py-20 border-t border-b border-border bg-foreground/[0.03]"
    >
      <div className="container">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.22em] text-orange-200 mb-2.5">
            Shop by category
          </p>
          <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-black tracking-tight">
            Guide shoppers instead of making them hunt.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={`/shop?cat=${encodeURIComponent(cat.dbCategory)}`}
              className="group"
            >
              <article className="rounded-2xl border border-border bg-card p-5 h-full transition-all duration-200 hover:-translate-y-1 hover:border-foreground/20">
                <div className="aspect-[4/3] rounded-[20px] bg-gradient-to-br from-secondary to-muted mb-4" />
                <h3 className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">
                  {cat.name}
                </h3>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  {cat.description}
                </p>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
