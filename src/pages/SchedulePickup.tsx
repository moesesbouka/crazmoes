import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Clock, Building, CalendarIcon, Phone } from "lucide-react";
import { format, addDays, isSunday, isSaturday } from "date-fns";
import { fetchAllProducts, ShopifyProduct } from "@/lib/shopify";
import warehouseImage from "@/assets/warehouse.jpg";
import { NewsletterModal } from "@/components/NewsletterModal";

const WAREHOUSE_ADDRESS = "74 Houghton Ave, Buffalo, NY 14212";
const WAREHOUSE_DESCRIPTION = "Blue warehouse building with a rolling metal garage door";

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

const SchedulePickup = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
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
    fetchAllProducts().then(setProducts);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct || !selectedDate || !selectedTime || !customerName || !customerPhone) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const product = products.find(p => p.node.handle === selectedProduct);
      
      const { error } = await supabase.from("pickup_schedules").insert({
        customer_name: customerName,
        customer_email: customerEmail || null,
        customer_phone: customerPhone,
        product_title: product?.node.title || selectedProduct,
        product_handle: selectedProduct,
        pickup_date: format(selectedDate, "yyyy-MM-dd"),
        pickup_time: selectedTime,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success("Pickup scheduled successfully!", {
        description: `We'll see you on ${format(selectedDate, "MMMM d, yyyy")} at ${selectedTime}`,
      });

      // Reset form
      setSelectedProduct("");
      setSelectedDate(undefined);
      setSelectedTime("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setNotes("");
    } catch (error: any) {
      toast.error("Failed to schedule pickup", {
        description: error.message,
      });
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

      {/* Hero Section */}
      <section className="py-12 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/15 blob animate-blob" />
        </div>
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold">
              <span className="text-gradient-fun">Schedule</span>{" "}
              <span className="text-foreground">Your Pickup</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Reserve a time to pick up your items from our warehouse
            </p>
          </div>
        </div>
      </section>

      <main className="container pb-16">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Warehouse Info */}
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="aspect-video relative">
                <img
                  src={warehouseImage}
                  alt="Crazy Moe's Warehouse"
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Building className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-display font-bold text-lg">Our Warehouse</h3>
                    <p className="text-muted-foreground">{WAREHOUSE_DESCRIPTION}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 mb-4">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-display font-bold">Address</h3>
                    <p className="text-muted-foreground">{WAREHOUSE_ADDRESS}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-display font-bold">Pickup Hours</h3>
                    <p className="text-muted-foreground">Monday - Saturday: 9:00 AM - 5:00 PM</p>
                    <p className="text-muted-foreground">Sunday: By appointment only</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scheduling Form */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Schedule Your Visit
              </CardTitle>
              <CardDescription>
                Fill out the form below to reserve your pickup time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="product">Item to Pick Up *</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select the item you're picking up" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.node.handle} value={product.node.handle}>
                          {product.node.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Preferred Date *</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={disabledDays}
                    className="rounded-md border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Preferred Time *</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name *</Label>
                    <Input
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions or questions..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full hero-gradient" disabled={isSubmitting}>
                  {isSubmitting ? "Scheduling..." : "Schedule Pickup"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
      <NewsletterModal open={newsletterOpen} onOpenChange={setNewsletterOpen} />
    </div>
  );
};

export default SchedulePickup;
