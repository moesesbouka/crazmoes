import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "1",
    title: "See what's new",
    description:
      "Newest drops, reserve-ready calls to action, and easy sorting by category or deal size.",
  },
  {
    number: "2",
    title: "Check the details",
    description:
      "Condition, brand, defects, and pickup timing all visible above the fold.",
  },
  {
    number: "3",
    title: "Reserve or visit",
    description:
      "One-click reserve, sticky contact bar, map, hours, and payment info to reduce friction.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
          {/* Left: steps */}
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-orange-200 mb-2.5">
              Experience overhaul
            </p>
            <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-black tracking-tight">
              Designed for trust, speed, and action.
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-8">
              {steps.map((step) => (
                <article
                  key={step.number}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <p className="text-[2.6rem] font-black tracking-[-0.05em] text-orange-300">
                    {step.number}
                  </p>
                  <h3 className="text-lg font-bold tracking-tight mt-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          {/* Right: visit card */}
          <aside
            id="visit"
            className="rounded-2xl border border-border p-6 bg-gradient-to-b from-primary/10 to-card"
          >
            <p className="text-xs uppercase tracking-[0.22em] text-orange-200 mb-2.5">
              Store details
            </p>
            <h3 className="text-2xl font-black tracking-tight">
              Make visiting effortless.
            </h3>

            <div className="flex flex-col gap-3 mt-5">
              <div className="rounded-2xl border border-border bg-background/30 p-4 text-muted-foreground">
                📍 74 Houghton Ave, Buffalo, NY 14212
              </div>
              <div className="rounded-2xl border border-border bg-background/30 p-4 text-muted-foreground">
                🕐 Mon–Sat 9am–6pm • Sun 10am–4pm
              </div>
              <div className="rounded-2xl border border-border bg-background/30 p-4 text-muted-foreground">
                💵 Cash or Cash App • Appointment only
              </div>
              <div className="rounded-2xl border border-border bg-background/30 p-4 text-muted-foreground">
                🛵 E-bikes & scooters: test at pickup
              </div>
            </div>

            <div className="mt-5">
              <Link to="/schedule-pickup">
                <Button className="rounded-full bg-foreground text-background font-semibold hover:bg-foreground/90 w-full">
                  Plan Your Visit
                </Button>
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
