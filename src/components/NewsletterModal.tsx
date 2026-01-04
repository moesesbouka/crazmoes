import { useState } from "react";
import { Mail, X, Sparkles, Bell, Tag, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface NewsletterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewsletterModal({ open, onOpenChange }: NewsletterModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [preferences, setPreferences] = useState({
    newInventory: true,
    flashSales: true,
    weeklyDigest: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    toast.success("You're subscribed!", {
      description: "You'll receive updates based on your preferences.",
    });
    
    setEmail("");
    setName("");
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full hero-gradient shadow-glow">
            <Bell className="h-7 w-7 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center font-display text-2xl">
            Stay Updated
          </DialogTitle>
          <DialogDescription className="text-center">
            Get notified about new inventory, flash sales, and exclusive deals.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Input
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-card"
            />
          </div>
          
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-card"
            />
          </div>
          
          <div className="space-y-3 rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium">Notification preferences:</p>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={preferences.newInventory}
                  onCheckedChange={(checked) =>
                    setPreferences((p) => ({ ...p, newInventory: !!checked }))
                  }
                />
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">New inventory alerts</span>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={preferences.flashSales}
                  onCheckedChange={(checked) =>
                    setPreferences((p) => ({ ...p, flashSales: !!checked }))
                  }
                />
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Flash sale notifications</span>
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={preferences.weeklyDigest}
                  onCheckedChange={(checked) =>
                    setPreferences((p) => ({ ...p, weeklyDigest: !!checked }))
                  }
                />
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Weekly digest</span>
                </div>
              </label>
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full hero-gradient hover:opacity-90 transition-opacity"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Subscribing..." : "Subscribe"}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            We respect your privacy. Unsubscribe anytime.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
