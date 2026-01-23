import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/safeClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, Clock, User, Phone, Package } from "lucide-react";
import { format } from "date-fns";

interface PickupSchedule {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  product_title: string;
  product_handle: string | null;
  pickup_date: string;
  pickup_time: string;
  notes: string | null;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled"];

export function AdminPickupSchedules() {
  const [schedules, setSchedules] = useState<PickupSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("pickup_schedules")
      .select("*")
      .order("pickup_date", { ascending: true });

    if (data) setSchedules(data);
    setIsLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("pickup_schedules")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      );

      toast.success("Status updated");
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
      case "confirmed":
        return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      case "completed":
        return "bg-green-500/10 text-green-600 border-green-500/30";
      case "cancelled":
        return "bg-red-500/10 text-red-600 border-red-500/30";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading schedules...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Pickup Schedules
        </CardTitle>
        <CardDescription>
          Manage customer pickup appointments
        </CardDescription>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No pickup schedules yet
          </p>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="p-4 rounded-lg border bg-card space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{schedule.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {schedule.customer_phone}
                      {schedule.customer_email && (
                        <>
                          <span>•</span>
                          {schedule.customer_email}
                        </>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(schedule.status)}>
                    {schedule.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span>{schedule.product_title}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(schedule.pickup_date), "MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{schedule.pickup_time}</span>
                  </div>
                </div>

                {schedule.notes && (
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    {schedule.notes}
                  </p>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <span className="text-sm text-muted-foreground">Update status:</span>
                  <Select
                    value={schedule.status}
                    onValueChange={(value) => updateStatus(schedule.id, value)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
