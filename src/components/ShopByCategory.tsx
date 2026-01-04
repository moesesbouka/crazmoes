import { ArrowRight, Armchair, Laptop, Wrench, Shirt, Sparkles, Package } from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  { 
    name: "Furniture", 
    icon: Armchair, 
    color: "bg-fun-purple/10 text-fun-purple",
    bgGradient: "from-fun-purple/20 to-fun-purple/5",
    count: "50+ items"
  },
  { 
    name: "Electronics", 
    icon: Laptop, 
    color: "bg-fun-blue/10 text-fun-blue",
    bgGradient: "from-fun-blue/20 to-fun-blue/5",
    count: "80+ items"
  },
  { 
    name: "Tools", 
    icon: Wrench, 
    color: "bg-fun-orange/10 text-fun-orange",
    bgGradient: "from-fun-orange/20 to-fun-orange/5",
    count: "40+ items"
  },
  { 
    name: "Clothing", 
    icon: Shirt, 
    color: "bg-fun-pink/10 text-fun-pink",
    bgGradient: "from-fun-pink/20 to-fun-pink/5",
    count: "60+ items"
  },
  { 
    name: "Home Decor", 
    icon: Sparkles, 
    color: "bg-fun-teal/10 text-fun-teal",
    bgGradient: "from-fun-teal/20 to-fun-teal/5",
    count: "30+ items"
  },
  { 
    name: "All Items", 
    icon: Package, 
    color: "bg-primary/10 text-primary",
    bgGradient: "from-primary/20 to-primary/5",
    count: "500+ items"
  },
];

export function ShopByCategory() {
  return (
    <section className="py-16 bg-gradient-to-b from-muted/30 to-transparent">
      <div className="container">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-fun-teal/10 text-fun-teal px-4 py-1.5 rounded-full text-sm font-bold mb-3">
            🛍️ Browse by Category
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Shop by Category
          </h2>
          <p className="mt-2 text-muted-foreground">Find exactly what you're looking for</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category, index) => (
            <Link 
              key={category.name} 
              to="/shop"
              className="group animate-fade-in-up opacity-0"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${category.bgGradient} p-6 h-full border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-card hover:-translate-y-1`}>
                <div className={`inline-flex p-3 rounded-xl ${category.color} mb-4`}>
                  <category.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display font-bold text-foreground group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{category.count}</p>
                <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
