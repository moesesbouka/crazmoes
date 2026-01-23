import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/safeClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Mail, Check, X } from "lucide-react";
import { format } from "date-fns";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  pref_latest_inventory: boolean;
  pref_flash_sales: boolean;
  pref_new_arrivals: boolean;
  subscribed_at: string;
}

export function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false });

    if (data) setSubscribers(data);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading subscribers...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Users className="h-5 w-5" />
          Newsletter Subscribers
          <Badge variant="secondary" className="ml-2">
            {subscribers.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Customers who signed up for marketing updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        {subscribers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No subscribers yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Email</th>
                  <th className="text-left py-3 px-2 font-medium">Name</th>
                  <th className="text-center py-3 px-2 font-medium">Latest Inventory</th>
                  <th className="text-center py-3 px-2 font-medium">Flash Sales</th>
                  <th className="text-center py-3 px-2 font-medium">New Arrivals</th>
                  <th className="text-left py-3 px-2 font-medium">Subscribed</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {sub.email}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {sub.name || "-"}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {sub.pref_latest_inventory ? (
                        <Check className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {sub.pref_flash_sales ? (
                        <Check className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {sub.pref_new_arrivals ? (
                        <Check className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">
                      {format(new Date(sub.subscribed_at), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
