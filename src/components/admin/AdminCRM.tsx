import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, MessageSquare, MessagesSquare, Users, Settings } from "lucide-react";
import { useCRMStore } from "@/lib/crmStore";
import { CRMUpload } from "./crm/CRMUpload";
import { CRMDashboard } from "./crm/CRMDashboard";
import { CRMMessages } from "./crm/CRMMessages";
import { CRMConversations } from "./crm/CRMConversations";
import { CRMCustomers } from "./crm/CRMCustomers";
import { CRMSettings } from "./crm/CRMSettings";

export function AdminCRM() {
  const messages = useCRMStore((s) => s.messages);

  return (
    <div className="space-y-6">
      <CRMUpload />

      {messages.length > 0 ? (
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 max-w-2xl">
            <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs">
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" /> Messages
            </TabsTrigger>
            <TabsTrigger value="conversations" className="flex items-center gap-1.5 text-xs">
              <MessagesSquare className="h-3.5 w-3.5" /> Conversations
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" /> Customers
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5 text-xs">
              <Settings className="h-3.5 w-3.5" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><CRMDashboard /></TabsContent>
          <TabsContent value="messages"><CRMMessages /></TabsContent>
          <TabsContent value="conversations"><CRMConversations /></TabsContent>
          <TabsContent value="customers"><CRMCustomers /></TabsContent>
          <TabsContent value="settings"><CRMSettings /></TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-medium text-muted-foreground">No data loaded</p>
          <p className="text-sm text-muted-foreground mt-1">Upload a CSV or load the demo dataset to get started</p>
        </div>
      )}
    </div>
  );
}
