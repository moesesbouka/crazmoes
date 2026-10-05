import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import { ChatWidget } from "./components/ChatWidget";

const Shop = lazy(() => import("./pages/Shop"));
const About = lazy(() => import("./pages/About"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const SchedulePickup = lazy(() => import("./pages/SchedulePickup"));
const ProductScraper = lazy(() => import("./pages/ProductScraper"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminSetup = lazy(() => import("./pages/AdminSetup"));
const Admin = lazy(() => import("./pages/Admin"));
const BulkPoster = lazy(() => import("./pages/BulkPoster"));
const CrazyMoeCRMv2 = lazy(() => import("./pages/CrazyMoeCRMv2"));
const PartnerDeal = lazy(() => import("./pages/PartnerDeal"));
const ForChrissy = lazy(() => import("./pages/ForChrissy"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-[70vh] bg-background" />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/about" element={<About />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/schedule-pickup" element={<SchedulePickup />} />
          <Route path="/scraper" element={<ProductScraper />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/setup" element={<AdminSetup />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/bulk-poster" element={<BulkPoster />} />
          <Route path="/admin/crm-v2" element={<CrazyMoeCRMv2 />} />
          <Route path="/partner-deal" element={<PartnerDeal />} />
          <Route path="/for-chrissy" element={<ForChrissy />} />
          <Route path="/for-chrissy.html" element={<ForChrissy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        <ChatWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
