import { Calendar, MessageSquare, MapPin, Bike, Sofa, Microwave, Tag, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PICKUP_STEPS = [
  {
    icon: MessageSquare,
    title: "Browse & reserve",
    description: "message the item(s) you want",
    color: "bg-fun-blue/20",
    iconColor: "text-fun-blue",
  },
  {
    icon: Calendar,
    title: "Choose a pickup window",
    description: "we confirm a time",
    color: "bg-fun-green/20",
    iconColor: "text-fun-green",
  },
  {
    icon: MapPin,
    title: "Address after confirmation",
    description: "sent once you're on the way (or with a small hold deposit)",
    color: "bg-fun-yellow/20",
    iconColor: "text-fun-orange",
  },
];

const CATEGORY_SHORTCUTS = [
  { label: "E-Bikes & Scooters", icon: Bike, href: "/shop" },
  { label: "Furniture", icon: Sofa, href: "/shop" },
  { label: "Small Appliances", icon: Microwave, href: "/shop" },
  { label: "Under $25 / Quick Deals", icon: Tag, href: "/shop" },
];

export function PickupInfoSection() {
  return (
    <section id="pickup-info" className="py-16 md:py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-fun-blue/10 rounded-full blur-3xl" />
      </div>

      <div className="container">
        <div className="mx-auto max-w-4xl">
          {/* Section header */}
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-gradient-animated mb-4">
              How Pickup Works
            </h2>
            <p className="text-lg text-muted-foreground font-medium">
              (Appointment Only)
            </p>
          </div>

          {/* 3 Steps */}
          <div className="grid gap-6 md:grid-cols-3 mb-10">
            {PICKUP_STEPS.map((step, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl p-6 shadow-card hover:shadow-fun transition-all duration-300 animate-pop-in opacity-0 tilt-3d"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${step.color} mb-4`}>
                  <step.icon className={`h-7 w-7 ${step.iconColor}`} />
                </div>
                <h3 className="font-display font-bold text-lg text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          {/* Bold notice */}
          <div className="text-center mb-10">
            <p className="text-xl md:text-2xl font-bold text-foreground">
              🚫 No walk-ins. Appointment pickup only.
            </p>
          </div>

          {/* Policies block */}
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 mb-12 border border-border/50">
            <h3 className="font-display font-bold text-lg text-foreground mb-4 text-center">
              📋 Policies
            </h3>
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div className="bg-background/50 rounded-xl p-4">
                <p className="font-semibold text-foreground mb-1">💵 Payment</p>
                <p className="text-muted-foreground">Cash or Cash App</p>
              </div>
              <div className="bg-background/50 rounded-xl p-4">
                <p className="font-semibold text-foreground mb-1">🔒 Holds</p>
                <p className="text-muted-foreground">
                  Small Cash App deposit holds items (applies to total). Otherwise first confirmed pickup.
                </p>
              </div>
              <div className="bg-background/50 rounded-xl p-4">
                <p className="font-semibold text-foreground mb-1">🛵 E-bikes/scooters</p>
                <p className="text-muted-foreground">Test at pickup</p>
              </div>
            </div>
          </div>

          {/* Category shortcuts */}
          <div className="text-center">
            <h3 className="font-display font-bold text-lg text-foreground mb-6">
              🔥 Popular Categories
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {CATEGORY_SHORTCUTS.map((cat, i) => (
                <Link key={i} to={cat.href}>
                  <Button
                    variant="outline"
                    className="rounded-xl font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 hover:scale-105 group"
                  >
                    <cat.icon className="h-4 w-4 mr-2" />
                    {cat.label}
                    <ArrowRight className="h-4 w-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
