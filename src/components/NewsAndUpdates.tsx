import { Megaphone, Clock, MapPin, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

export function NewsAndUpdates() {
  return (
    <section className="py-16 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute -left-20 top-0 w-40 h-40 bg-accent/20 blob-2 -z-10" />
      <div className="absolute -right-20 bottom-0 w-56 h-56 bg-fun-teal/10 blob -z-10" />
      
      <div className="container">
        <div className="grid md:grid-cols-2 gap-8">
          {/* News Card */}
          <div className="bg-card rounded-3xl p-8 shadow-card border border-border/50 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/10 rounded-full" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold mb-4">
                <Megaphone className="h-4 w-4" />
                Latest News
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-3">
                Big Restock Coming!
              </h3>
              <p className="text-muted-foreground mb-6">
                We're receiving a massive shipment of new inventory this week! Electronics, furniture, home goods, and much more. Follow us on Facebook to be the first to know!
              </p>
              <Link to="/about">
                <Button className="hero-gradient font-bold">
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-fun-teal/10 to-fun-blue/10 rounded-2xl p-6 border border-border/50">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fun-teal/20 shrink-0">
                  <Clock className="h-6 w-6 text-fun-teal" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-foreground">Store Hours</h4>
                  <p className="text-muted-foreground text-sm mt-1">
                    Mon - Sat: 9am - 6pm<br />
                    Sunday: 10am - 4pm
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-fun-orange/10 to-fun-pink/10 rounded-2xl p-6 border border-border/50">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fun-orange/20 shrink-0">
                  <MapPin className="h-6 w-6 text-fun-orange" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-foreground">Find Us</h4>
                  <p className="text-muted-foreground text-sm mt-1">
                    Visit our Facebook Marketplace page or come see us in person!
                  </p>
                  <Link to="/about" className="inline-flex items-center text-sm font-bold text-primary mt-2 hover:underline">
                    Get Directions
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
