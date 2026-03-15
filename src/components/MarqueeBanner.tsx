import { motion } from "framer-motion";

const items = [
  "New drops every week",
  "40–70% off retail",
  "Buffalo pickup only",
  "Open box & closeout deals",
  "Cash & Cash App accepted",
  "Appointment pickup",
];

const marqueeText = items.join(" · ") + " · ";

export function MarqueeBanner() {
  return (
    <div className="relative overflow-hidden bg-primary py-2.5 select-none">
      <div className="flex whitespace-nowrap">
        <motion.div
          animate={{ x: [0, "-50%"] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="flex shrink-0"
        >
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground px-4">
            {marqueeText}
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground px-4">
            {marqueeText}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
