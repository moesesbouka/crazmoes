import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { useCRMStore } from "@/lib/crmStore";

export function CRMSettings() {
  const { ownerName, setOwnerName } = useCRMStore();

  return (
    <Card className="bg-card/60 border-border/40 max-w-lg">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" /> CRM Settings
        </CardTitle>
        <CardDescription>Configure your Messenger CRM preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ownerName" className="text-sm">Business Owner Name</Label>
          <Input
            id="ownerName"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Your name as it appears in Messenger"
          />
          <p className="text-xs text-muted-foreground">
            Used to identify your messages vs customer messages
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
