import { ArrowRight, Armchair, Laptop, Wrench, Shirt, Sparkles, Package, UtensilsCrossed, Car, Heart, Baby, Briefcase, PawPrint } from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  { 
    name: "Furniture", 
    icon: Armchair, 
    color: "bg-fun-blue/10 text-fun-blue",
    bgGradient: "from-fun-blue/20 to-fun-blue/5",
    count: "50+ items"
  },
  { 
    name: "Electronics", 
    icon: Laptop, 
    color: "bg-fun-yellow/10 text-fun-orange",
    bgGradient: "from-fun-yellow/20 to-fun-yellow/5",
    count: "80+ items"
  },
  { 
    name: "Tools", 
    icon: Wrench, 
    color: "bg-fun-red/10 text-fun-red",
    bgGradient: "from-fun-red/20 to-fun-red/5",
    count: "40+ items"
  },
  { 
    name: "Kitchen", 
    icon: UtensilsCrossed, 
    color: "bg-fun-green/10 text-fun-green",
    bgGradient: "from-fun-green/20 to-fun-green/5",
    count: "60+ items"
  },
  { 
    name: "Home & Garden", 
    icon: Sparkles, 
    color: "bg-secondary/10 text-secondary",
    bgGradient: "from-secondary/20 to-secondary/5",
    count: "30+ items"
  },
  { 
    name: "Sports", 
    icon: Shirt, 
    color: "bg-fun-orange/10 text-fun-orange",
    bgGradient: "from-fun-orange/20 to-fun-orange/5",
    count: "45+ items"
  },
  { 
    name: "Automotive", 
    icon: Car, 
    color: "bg-fun-blue/10 text-fun-blue",
    bgGradient: "from-fun-blue/20 to-fun-blue/5",
    count: "25+ items"
  },
  { 
    name: "Baby & Kids", 
    icon: Baby, 
    color: "bg-fun-yellow/10 text-fun-orange",
    bgGradient: "from-fun-yellow/20 to-fun-yellow/5",
    count: "35+ items"
  },
  { 
    name: "Pet Supplies", 
    icon: PawPrint, 
    color: "bg-fun-green/10 text-fun-green",
    bgGradient: "from-fun-green/20 to-fun-green/5",
    count: "20+ items"
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
    <section className="py-16 bg-gradient-to-b from-muted/30 to-transparent relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -left-20 top-20 w-40 h-40 bg-fun-yellow/10 rounded-full blur-3xl animate-blob" />
      <div className="absolute -right-20 bottom-20 w-40 h-40 bg-fun-blue/10 rounded-full blur-3xl animate-blob" style={{ animationDelay: "-3s" }} />
      
      <div className="container relative">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-fun-blue/10 text-fun-blue px-4 py-1.5 rounded-full text-sm font-bold mb-3 animate-bounce-in">
            🛍️ Browse by Category
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
            Shop by <span className="text-gradient-animated">Category</span>
          </h2>
          <p className="mt-2 text-muted-foreground animate-fade-in-up opacity-0" style={{ animationDelay: "0.2s" }}>Find exactly what you're looking for</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((category, index) => (
            <Link 
              key={category.name} 
              to="/shop"
              className="group animate-pop-in opacity-0"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${category.bgGradient} p-6 h-full border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-card hover:-translate-y-2 tilt-3d`}>
                <div className={`inline-flex p-3 rounded-xl ${category.color} mb-4 group-hover:animate-wiggle`}>
                  <category.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display font-bold text-foreground group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{category.count}</p>
                <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-2 transition-all duration-300" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
