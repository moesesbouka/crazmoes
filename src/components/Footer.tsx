import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="relative pt-20 pb-10">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr] gap-12 mb-14"
        >
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Crazy Moe's" className="h-10 w-auto" />
              <div>
                <p className="font-black text-lg tracking-tight text-foreground">Crazy Moe's</p>
                <p className="text-xs text-muted-foreground">Buffalo Pickup Deals</p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Premium open-box & closeout inventory at 40–70% off retail. Appointment pickup in Buffalo, NY.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 font-semibold">Navigate</p>
            <nav className="flex flex-col gap-2.5">
              {[
                { to: "/shop", label: "Inventory" },
                { to: "/about", label: "About" },
                { to: "/schedule-pickup", label: "Schedule Pickup" },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Store info */}
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4 font-semibold">Visit us</p>
            <div className="space-y-2.5 text-sm text-muted-foreground">
              <p>74 Houghton Ave</p>
              <p>Buffalo, NY 14212</p>
              <p>Mon–Sat 9–6, Sun 10–4</p>
              <p className="text-primary font-semibold">Cash & Cash App</p>
            </div>
          </div>
        </motion.div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Crazy Moe's — Buffalo Pickup Deals</p>
          <p>Built with ❤️ in Buffalo</p>
        </div>
      </div>
    </footer>
  );
}
