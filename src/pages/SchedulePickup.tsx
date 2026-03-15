import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Clock, Building, CalendarIcon, Phone, DollarSign, Bike } from "lucide-react";
import { format, addDays } from "date-fns";
import { fetchActiveListings, MarketplaceListing } from "@/lib/supabase-listings";
import { motion } from "framer-motion";
import warehouseImage from "@/assets/warehouse.jpg";
import { NewsletterModal } from "@/components/NewsletterModal";

const WAREHOUSE_ADDRESS = "74 Houghton Ave, Buffalo, NY 14212";

const TIME_SLOTS = [
  "9:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 1:00 PM",
  "1:00 PM - 2:00 PM",
  "2:00 PM - 3:00 PM",
  "3:00 PM - 4:00 PM",
  "4:00 PM - 5:00 PM",
];

const storeInfo = [
  { icon: MapPin, text: WAREHOUSE_ADDRESS },
  { icon: Clock, text: "Mon–Sat 9am–6pm · Sun 10am–4pm" },
  { icon: DollarSign, text: "Cash or Cash App · Appointment only" },
  { icon: Bike, text: "E-bikes & scooters: test at pickup" },
];

const SchedulePickup = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newsletterOpen, setNewsletterOpen] = useState(false);

  useEffect(() => {
    document.title = "Schedule Pickup | Crazy Moe's";
    fetchActiveListings().then((data) => setListings(data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || !selectedDate || !selectedTime || !customerName || !customerPhone) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const listing = listings.find(l => l.facebook_id === selectedProduct);

      const { error } = await supabase.from("pickup_schedules").insert({
        customer_name: customerName,
        customer_email: customerEmail || null,
        customer_phone: customerPhone,
        product_title: listing?.title || selectedProduct,
        product_handle: selectedProduct,
        pickup_date: format(selectedDate, "yyyy-MM-dd"),
        pickup_time: selectedTime,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success("Pickup scheduled successfully!", {
        description: `We'll see you on ${format(selectedDate, "MMMM d, yyyy")} at ${selectedTime}`,
      });

      setSelectedProduct("");
      setSelectedDate(undefined);
      setSelectedTime("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setNotes("");
    } catch (error: any) {
      toast.error("Failed to schedule pickup", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabledDays = (date: Date) => {
    return date < new Date() || date > addDays(new Date(), 30);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onNewsletterClick={() => setNewsletterOpen(true)} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div animate={{ x: [0, 20, 0], y: [0, -15, 0] }} transition={{ duration: 12, repeat: Infinity }} className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-primary/[0.06] blur-[100px]" />
        </div>
        <div className="container relative z-10 py-14 md:py-20 text-center">
          <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-xs uppercase tracking-[0.25em] text-primary font-semibold">
            Appointment pickup
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }} className="text-4xl md:text-5xl font-black tracking-tight mt-3">
            Schedule Your Pickup
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
            Reserve a time to pick up your items from our Buffalo warehouse.
          </motion.p>
        </div>
      </section>

      <main className="container py-12 pb-20">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Warehouse info */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="space-y-5">
            <div className="rounded-2xl border border-border overflow-hidden">
              <div className="aspect-video">
                <img src={warehouseImage} alt="Crazy Moe's Warehouse" className="w-full h-full object-cover" />
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Building className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold">Our Warehouse</h3>
                    <p className="text-sm text-muted-foreground">Blue warehouse building with a rolling metal garage door</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6" style={{ background: "linear-gradient(180deg, hsl(25 95% 53% / 0.06) 0%, hsl(var(--card)) 60%)" }}>
              <h3 className="font-bold text-lg mb-4">Store details</h3>
              <div className="space-y-3">
                {storeInfo.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3.5 text-sm text-muted-foreground"
                  >
                    <item.icon className="h-4 w-4 text-primary shrink-0" />
                    {item.text}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Form */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Schedule Your Visit</h2>
                <p className="text-sm text-muted-foreground">Fill out the form to reserve your pickup time</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="product" className="text-sm font-semibold">Item to Pick Up *</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="rounded-xl bg-secondary/50 border-border">
                    <SelectValue placeholder="Select the item you're picking up" />
                  </SelectTrigger>
                  <SelectContent>
                    {listings.map((listing) => (
                      <SelectItem key={listing.facebook_id} value={listing.facebook_id}>
                        {listing.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Preferred Date *</Label>
                <div className="rounded-xl border border-border overflow-hidden">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={disabledDays}
                    className="!rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time" className="text-sm font-semibold">Preferred Time *</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="rounded-xl bg-secondary/50 border-border">
                    <SelectValue placeholder="Select a time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold">Your Name *</Label>
                  <Input id="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" required className="rounded-xl bg-secondary/50 border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(555) 123-4567" className="pl-10 rounded-xl bg-secondary/50 border-border" required />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Email (optional)</Label>
                <Input id="email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="john@example.com" className="rounded-xl bg-secondary/50 border-border" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-semibold">Additional Notes</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions or questions..." rows={3} className="rounded-xl bg-secondary/50 border-border" />
              </div>

              <Button
                type="submit"
                className="w-full rounded-full bg-primary text-primary-foreground font-bold py-6 text-base shadow-[0_0_30px_-8px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_40px_-8px_hsl(var(--primary)/0.6)] transition-all duration-300"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Scheduling..." : "Schedule Pickup"}
              </Button>
            </form>
          </motion.div>
        </div>
      </main>

      <Footer />
      <NewsletterModal open={newsletterOpen} onOpenChange={setNewsletterOpen} />
    </div>
  );
};

export default SchedulePickup;
