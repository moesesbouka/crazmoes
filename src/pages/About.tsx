import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Clock, MapPin, Phone, Mail, Facebook, Heart, Star, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

const About = () => {
  useEffect(() => {
    document.title = "About Us | Crazy Moe's";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header onNewsletterClick={() => {}} />
      
      {/* Hero Section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/15 blob animate-blob" />
          <div className="absolute top-1/2 -left-32 w-80 h-80 bg-fun-teal/15 blob-2 animate-blob" style={{ animationDelay: '3s' }} />
          <div className="absolute -bottom-10 right-1/4 w-64 h-64 bg-accent/20 blob animate-blob" style={{ animationDelay: '5s' }} />
        </div>
        
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-fun-purple/10 text-fun-purple px-4 py-1.5 rounded-full text-sm font-bold mb-6 animate-fade-in-up opacity-0">
              <Heart className="h-4 w-4" />
              Welcome to the Family!
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold animate-fade-in-up opacity-0" style={{ animationDelay: '100ms' }}>
              <span className="text-gradient-fun">About</span>{" "}
              <span className="text-foreground">Crazy Moe's</span>
            </h1>
            <p className="mt-6 text-xl text-muted-foreground animate-fade-in-up opacity-0" style={{ animationDelay: '200ms' }}>
              Your neighborhood destination for incredible deals on quality consumer goods. We're passionate about helping you find amazing products at unbeatable prices!
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-12 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card rounded-3xl p-8 shadow-card border border-border/50 text-center animate-fade-in-up opacity-0" style={{ animationDelay: '100ms' }}>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-fun-orange/20 mb-4">
                <Star className="h-8 w-8 text-fun-orange" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">Quality Goods</h3>
              <p className="text-muted-foreground">We carefully select every item to ensure you get the best value for your money.</p>
            </div>
            <div className="bg-card rounded-3xl p-8 shadow-card border border-border/50 text-center animate-fade-in-up opacity-0" style={{ animationDelay: '200ms' }}>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-fun-teal/20 mb-4">
                <Truck className="h-8 w-8 text-fun-teal" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">Fresh Inventory</h3>
              <p className="text-muted-foreground">New items added daily! There's always something new to discover.</p>
            </div>
            <div className="bg-card rounded-3xl p-8 shadow-card border border-border/50 text-center animate-fade-in-up opacity-0" style={{ animationDelay: '300ms' }}>
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-fun-pink/20 mb-4">
                <Heart className="h-8 w-8 text-fun-pink" />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground mb-2">Community First</h3>
              <p className="text-muted-foreground">We love serving our community and building lasting relationships.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Hours & Location */}
      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Hours Card */}
            <div className="bg-gradient-to-br from-fun-teal/10 to-fun-blue/10 rounded-3xl p-8 border border-border/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fun-teal/20">
                  <Clock className="h-6 w-6 text-fun-teal" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground">Store Hours</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-border/50">
                  <span className="font-medium text-foreground">Monday - Friday</span>
                  <span className="text-muted-foreground">9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border/50">
                  <span className="font-medium text-foreground">Saturday</span>
                  <span className="text-muted-foreground">9:00 AM - 5:00 PM</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="font-medium text-foreground">Sunday</span>
                  <span className="text-muted-foreground">10:00 AM - 4:00 PM</span>
                </div>
              </div>
            </div>

            {/* Location Card */}
            <div className="bg-gradient-to-br from-fun-orange/10 to-fun-pink/10 rounded-3xl p-8 border border-border/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fun-orange/20">
                  <MapPin className="h-6 w-6 text-fun-orange" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground">Find Us</h2>
              </div>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Visit us at our location or find us on Facebook Marketplace for the latest inventory!
                </p>
                <div className="space-y-3 mt-6">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground">Contact via Facebook</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground">Message us anytime</span>
                  </div>
                </div>
                <Button className="w-full mt-6 hero-gradient font-bold rounded-xl">
                  <Facebook className="mr-2 h-5 w-5" />
                  Visit Our Facebook Page
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-10 -z-10" />
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Find Your Next Treasure?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Browse our full inventory and discover amazing deals waiting just for you!
            </p>
            <Button size="lg" className="hero-gradient font-bold text-lg px-8 py-6 rounded-2xl shadow-glow hover:scale-105 transition-transform">
              Start Shopping
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
