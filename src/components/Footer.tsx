import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Crazy Moe's — Buffalo Pickup Deals</p>
        <nav className="flex gap-6">
          <Link to="/shop" className="hover:text-foreground transition-colors">Inventory</Link>
          <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
          <Link to="/schedule-pickup" className="hover:text-foreground transition-colors">Schedule Pickup</Link>
        </nav>
      </div>
    </footer>
  );
}
