import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Clock, MapPin, Phone, Mail, Facebook, Heart, Star, Truck, Shield, Award, Package, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { NewsletterModal } from "@/components/NewsletterModal";
import { FloatingParticles } from "@/components/FloatingParticles";
import { AnimatedBadge } from "@/components/AnimatedBadge";
import warehouseImage from "@/assets/warehouse.jpg";

const WAREHOUSE_ADDRESS = "74 Houghton Ave, Buffalo, NY 14212";

const About = () => {
  const [newsletterOpen, setNewsletterOpen] = useState(false);

  useEffect(() => {
    document.title = "About Us | Crazy Moe's";
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background particles */}
      <FloatingParticles count={8} />
      
      <Header onNewsletterClick={() => setNewsletterOpen(true)} />
      
      {/* Hero Section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/15 blob animate-blob" />
          <div className="absolute top-1/2 -left-32 w-80 h-80 bg-fun-blue/15 blob-2 animate-blob" style={{ animationDelay: '3s' }} />
          <div className="absolute -bottom-10 right-1/4 w-64 h-64 bg-accent/20 blob animate-blob" style={{ animationDelay: '5s' }} />
        </div>
        
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="animate-bounce-in mb-6">
              <AnimatedBadge variant="deal" className="text-sm">
                <Award className="h-4 w-4" />
                25 Years Established
              </AnimatedBadge>
            </div>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold animate-pop-in opacity-0" style={{ animationDelay: '100ms' }}>
              <span className="text-gradient-animated">About</span>{" "}
              <span className="text-foreground">Crazy Moe's</span>
            </h1>
            <p className="mt-6 text-xl text-muted-foreground animate-fade-in-up opacity-0" style={{ animationDelay: '200ms' }}>
              The original and pioneer in the liquidation business. 25 years established — many others in this industry either learned from Crazy Moe, followed his model, or looked up to him.
            </p>
          </div>
        </div>
      </section>

      {/* About Story Section */}
      <section className="py-12 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-3xl p-8 md:p-12 shadow-card border border-border/50 animate-fade-in-up opacity-0 tilt-3d" style={{ animationDelay: "0.3s" }}>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
                How We Bring You <span className="text-gradient-animated">Unbeatable Deals</span>
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Our inventory comes <strong className="text-foreground">directly from major retail chains</strong> — we specialize in closeouts, liquidation merchandise, open box items, and scratch & dent products. This is how we're able to offer you incredible savings on quality goods.
                </p>
                <p>
                  <strong className="text-foreground">Every item that isn't factory sealed is thoroughly tested</strong> to ensure you're getting a good, functional product. We stand behind everything we sell because your satisfaction is our top priority.
                </p>
                <p>
                  Liquidation inventory offers smart shoppers savings of <strong className="text-primary font-bold">50-90% off retail prices</strong>. You're getting the same brand-name products you'd find at major retailers, just at a fraction of the cost.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-12">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card rounded-3xl p-8 shadow-card border border-border/50 text-center animate-pop-in opacity-0 tilt-3d hover:shadow-fun transition-shadow" style={{ animationDelay: '100ms' }}>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-fun-orange/20 mb-4 group-hover:animate-wiggle">
                <Shield className="h-8 w-8 text-fun-orange animate-bounce-soft" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">Tested & Verified</h3>
              <p className="text-muted-foreground">Every non-sealed item is tested to ensure it works perfectly before it hits our shelves.</p>
            </div>
            <div className="bg-card rounded-3xl p-8 shadow-card border border-border/50 text-center animate-pop-in opacity-0 tilt-3d hover:shadow-fun transition-shadow" style={{ animationDelay: '200ms' }}>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-fun-blue/20 mb-4">
                <Package className="h-8 w-8 text-fun-blue animate-bounce-soft" style={{ animationDelay: "0.2s" }} />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">Direct From Retailers</h3>
              <p className="text-muted-foreground">Our inventory comes straight from major retail chains — closeouts, liquidation, and more.</p>
            </div>
            <div className="bg-card rounded-3xl p-8 shadow-card border border-border/50 text-center animate-pop-in opacity-0 tilt-3d hover:shadow-fun transition-shadow" style={{ animationDelay: '300ms' }}>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-fun-yellow/20 mb-4">
                <Star className="h-8 w-8 text-fun-orange animate-bounce-soft" style={{ animationDelay: "0.4s" }} />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">25 Years Experience</h3>
              <p className="text-muted-foreground">A quarter century of expertise in bringing you the best deals in the business.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Warehouse Location Section */}
      <section className="py-12">
        <div className="container">
          <h2 className="font-display text-3xl font-bold text-center mb-8 animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
            Visit Our <span className="text-gradient-animated">Warehouse</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Warehouse Image */}
            <div className="rounded-3xl overflow-hidden shadow-card animate-pop-in opacity-0 hover:scale-[1.02] transition-transform" style={{ animationDelay: "0.2s" }}>
              <img 
                src={warehouseImage} 
                alt="Crazy Moe's Warehouse - Blue building with rolling metal garage door" 
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info Cards */}
            <div className="space-y-6">
              {/* Location Card */}
              <div className="bg-gradient-to-br from-fun-orange/10 to-fun-yellow/10 rounded-3xl p-8 border border-border/50 animate-pop-in opacity-0 tilt-3d" style={{ animationDelay: "0.3s" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fun-orange/20">
                    <MapPin className="h-6 w-6 text-fun-orange animate-bounce-soft" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-foreground">Our Location</h3>
                </div>
                <p className="text-lg text-foreground font-medium mb-2">{WAREHOUSE_ADDRESS}</p>
                <p className="text-muted-foreground">
                  Blue warehouse building with a rolling metal garage door
                </p>
                <Button asChild className="w-full mt-6 hero-gradient font-bold rounded-xl hover:scale-105 transition-transform hover-shake">
                  <Link to="/schedule-pickup">
                    <Zap className="mr-2 h-4 w-4" />
                    Schedule a Pickup
                  </Link>
                </Button>
              </div>

              {/* Hours Card */}
              <div className="bg-gradient-to-br from-fun-blue/10 to-fun-green/10 rounded-3xl p-8 border border-border/50 animate-pop-in opacity-0 tilt-3d" style={{ animationDelay: "0.4s" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fun-blue/20">
                    <Clock className="h-6 w-6 text-fun-blue animate-bounce-soft" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-foreground">Store Hours</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="font-medium text-foreground">Monday - Friday</span>
                    <span className="text-muted-foreground">9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="font-medium text-foreground">Saturday</span>
                    <span className="text-muted-foreground">9:00 AM - 5:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="font-medium text-foreground">Sunday</span>
                    <span className="text-muted-foreground">10:00 AM - 4:00 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4 animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
              Get in <span className="text-gradient-animated">Touch</span>
            </h2>
            <p className="text-muted-foreground mb-8 animate-fade-in-up opacity-0" style={{ animationDelay: "0.2s" }}>
              Have questions? Message us on Facebook or schedule a pickup visit!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up opacity-0" style={{ animationDelay: "0.3s" }}>
              <Button size="lg" className="hero-gradient font-bold rounded-xl hover:scale-105 transition-transform hover-shake">
                <Facebook className="mr-2 h-5 w-5" />
                Visit Our Facebook
              </Button>
              <Button asChild size="lg" variant="outline" className="font-bold rounded-xl hover:scale-105 transition-transform hover-wobble">
                <Link to="/schedule-pickup">
                  Schedule Pickup
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-10 -z-10" />
        {/* Animated background elements */}
        <div className="absolute top-10 left-10 text-4xl animate-float opacity-40">🛒</div>
        <div className="absolute bottom-10 right-10 text-4xl animate-float opacity-40" style={{ animationDelay: "1s" }}>💰</div>
        <div className="absolute top-1/2 left-1/4 text-3xl animate-float opacity-30" style={{ animationDelay: "0.5s" }}>⭐</div>
        
        <div className="container relative">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4 animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
              Ready to Find Your Next <span className="text-gradient-animated">Treasure?</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 animate-fade-in-up opacity-0" style={{ animationDelay: "0.2s" }}>
              Browse our full inventory and discover amazing deals waiting just for you!
            </p>
            <Button asChild size="lg" className="hero-gradient font-bold text-lg px-8 py-6 rounded-2xl shadow-glow hover:scale-105 transition-all animate-glow-pulse hover-tada">
              <Link to="/shop">
                <Sparkles className="mr-2 h-5 w-5 animate-wiggle" />
                Start Shopping
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
      <NewsletterModal open={newsletterOpen} onOpenChange={setNewsletterOpen} />
    </div>
  );
};

export default About;
