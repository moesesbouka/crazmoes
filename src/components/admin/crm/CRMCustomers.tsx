import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User, MessageSquare, MessagesSquare, Package } from "lucide-react";
import { useCRMStore } from "@/lib/crmStore";

interface CustomerSummary {
  name: string;
  messageCount: number;
  conversationCount: number;
  latestDate: string;
  latestTimestamp: number;
  products: Set<string>;
}

export function CRMCustomers() {
  const { messages, setFilters } = useCRMStore();
  const [search, setSearch] = useState('');

  const customers = useMemo(() => {
    const map = new Map<string, CustomerSummary>();
    messages.forEach((m) => {
      const name = m.customer_name || (m.owner_message !== 1 ? m.sender : '');
      if (!name) return;
      const existing = map.get(name);
      if (!existing) {
        map.set(name, {
          name,
          messageCount: 1,
          conversationCount: 0,
          latestDate: m.message_date,
          latestTimestamp: m.timestamp_ms,
          products: new Set(m.product ? [m.product] : []),
        });
      } else {
        existing.messageCount++;
        if (m.timestamp_ms > existing.latestTimestamp) {
          existing.latestDate = m.message_date;
          existing.latestTimestamp = m.timestamp_ms;
        }
        if (m.product) existing.products.add(m.product);
      }
    });
    // Count conversations per customer
    const threadMap = new Map<string, Set<string>>();
    messages.forEach((m) => {
      const name = m.customer_name || (m.owner_message !== 1 ? m.sender : '');
      if (!name) return;
      if (!threadMap.has(name)) threadMap.set(name, new Set());
      threadMap.get(name)!.add(m.thread_path);
    });
    map.forEach((c) => { c.conversationCount = threadMap.get(c.name)?.size || 0; });
    return Array.from(map.values()).sort((a, b) => b.messageCount - a.messageCount);
  }, [messages]);

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customers, search]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search customers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} customers</p>
      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((c) => (
          <Card
            key={c.name}
            className="bg-card/60 border-border/40 hover:border-primary/40 cursor-pointer transition-colors"
            onClick={() => setFilters({ customer_name: c.name })}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">Last active: {c.latestDate}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" /> {c.messageCount} msgs
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessagesSquare className="h-3 w-3" /> {c.conversationCount} convos
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Package className="h-3 w-3" /> {c.products.size} products
                    </div>
                  </div>
                  {c.products.size > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Array.from(c.products).slice(0, 3).map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                      ))}
                      {c.products.size > 3 && <Badge variant="outline" className="text-xs">+{c.products.size - 3}</Badge>}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
