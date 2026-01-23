import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LogOut, MessageSquare, Calendar, Tags, Users, ShoppingBag, Wrench, Store } from "lucide-react";
import { AdminChatConsole } from "@/components/admin/AdminChatConsole";
import { AdminCategoryManager } from "@/components/admin/AdminCategoryManager";
import { AdminPickupSchedules } from "@/components/admin/AdminPickupSchedules";
import { AdminSubscribers } from "@/components/admin/AdminSubscribers";
import { AdminShopifyInventory } from "@/components/admin/AdminShopifyInventory";
import { AdminMarketplaceInventory } from "@/components/admin/AdminMarketplaceInventory";
import { AdminTools } from "@/components/admin/AdminTools";

const Admin = () => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Admin Dashboard | Crazy Moe's";
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/admin/login");
        return;
      }

      const { data: adminProfile } = await supabase
        .from("admin_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (!adminProfile) {
        await supabase.auth.signOut();
        navigate("/admin/login");
        toast.error("Access denied");
        return;
      }

      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate("/admin/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-gradient">Admin Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue="marketplace" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 max-w-5xl">
            <TabsTrigger value="marketplace" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Marketplace</span>
            </TabsTrigger>
            <TabsTrigger value="chats" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chats</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              <span className="hidden sm:inline">Categories</span>
            </TabsTrigger>
            <TabsTrigger value="pickups" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Pickups</span>
            </TabsTrigger>
            <TabsTrigger value="subscribers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Subscribers</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Shopify</span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Tools</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace">
            <AdminMarketplaceInventory />
          </TabsContent>

          <TabsContent value="chats">
            <AdminChatConsole />
          </TabsContent>

          <TabsContent value="categories">
            <AdminCategoryManager />
          </TabsContent>

          <TabsContent value="pickups">
            <AdminPickupSchedules />
          </TabsContent>

          <TabsContent value="subscribers">
            <AdminSubscribers />
          </TabsContent>

          <TabsContent value="inventory">
            <AdminShopifyInventory />
          </TabsContent>

          <TabsContent value="tools">
            <AdminTools />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
