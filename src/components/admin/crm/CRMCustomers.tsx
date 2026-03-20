import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, User, MessageSquare, MessagesSquare, Package, StickyNote } from "lucide-react";
import { useCRMStore } from "@/lib/crmStore";
import { useCRMMetadataStore, type CRMTag, CRM_TAGS, CONVERSATION_STATUSES } from "@/lib/crmMetadataStore";
import { TagBadges, TagEditor } from "./TagBadges";
import { NotesIndicator } from "./NotesEditor";
import { CustomerDetailPanel } from "./CustomerDetailPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface CustomerSummary {
  name: string;
  messageCount: number;
  conversationCount: number;
  latestDate: string;
  latestTimestamp: number;
  products: Set<string>;
}

type QuickFilter = "all" | "has-notes" | "has-tags";

export function CRMCustomers() {
  const { messages } = useCRMStore();
  const { getCustomerMeta, getConversationMeta } = useCRMMetadataStore();
  const [search, setSearch] = useState('');
  const [customerPanel, setCustomerPanel] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<CRMTag | "">("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  const customers = useMemo(() => {
    const map = new Map<string, CustomerSummary>();
    messages.forEach((m) => {
      const name = m.customer_name || (m.owner_message !== 1 ? m.sender : '');
      if (!name) return;
      const existing = map.get(name);
      if (!existing) {
        map.set(name, { name, messageCount: 1, conversationCount: 0, latestDate: m.message_date, latestTimestamp: m.timestamp_ms, products: new Set(m.product ? [m.product] : []) });
      } else {
        existing.messageCount++;
        if (m.timestamp_ms > existing.latestTimestamp) { existing.latestDate = m.message_date; existing.latestTimestamp = m.timestamp_ms; }
        if (m.product) existing.products.add(m.product);
      }
    });
    const threadMap = new Map<string, Set<string>>();
    messages.forEach((m) => {
      const name = m.customer_name || (m.owner_message !== 1 ? m.sender : '');
      if (!name) return;
      if (!threadMap.has(name)) threadMap.set(name, new Set());
      threadMap.get(name)!.add(m.thread_path);
    });
    map.forEach((c) => { c.conversationCount = threadMap.get(c.name)?.size || 0; });
    return Array.from(map.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [messages]);

  const filtered = useMemo(() => {
    let list = customers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (tagFilter) list = list.filter((c) => getCustomerMeta(c.name).tags.includes(tagFilter));
    if (quickFilter === "has-notes") list = list.filter((c) => getCustomerMeta(c.name).notes);
    if (quickFilter === "has-tags") list = list.filter((c) => getCustomerMeta(c.name).tags.length > 0);
    return list;
  }, [customers, search, tagFilter, quickFilter, getCustomerMeta]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={tagFilter || "__all__"} onValueChange={(v) => setTagFilter(v === "__all__" ? "" : v as CRMTag)}>
          <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="All Tags" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Tags</SelectItem>
            {CRM_TAGS.map((t) => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <ToggleGroup type="single" value={quickFilter} onValueChange={(v) => v && setQuickFilter(v as QuickFilter)} className="justify-start gap-1">
        <ToggleGroupItem value="all" className="h-7 px-3 text-xs rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">All</ToggleGroupItem>
        <ToggleGroupItem value="has-notes" className="h-7 px-3 text-xs rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          <StickyNote className="h-3 w-3 mr-1" /> With Notes
        </ToggleGroupItem>
        <ToggleGroupItem value="has-tags" className="h-7 px-3 text-xs rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Tagged</ToggleGroupItem>
      </ToggleGroup>
      <p className="text-xs text-muted-foreground">{filtered.length} customers</p>
      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((c) => {
          const meta = getCustomerMeta(c.name);
          return (
            <Card key={c.name} className="bg-card/60 border-border/40 hover:border-primary/40 cursor-pointer transition-colors" onClick={() => setCustomerPanel(c.name)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      <NotesIndicator hasNotes={!!meta.notes} />
                    </div>
                    <p className="text-xs text-muted-foreground">Last active: {c.latestDate}</p>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare className="h-3 w-3" /> {c.messageCount}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><MessagesSquare className="h-3 w-3" /> {c.conversationCount}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><Package className="h-3 w-3" /> {c.products.size}</div>
                    </div>
                    {meta.tags.length > 0 && <div className="mt-1.5"><TagBadges tags={meta.tags} max={4} size="sm" /></div>}
                    {c.products.size > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {Array.from(c.products).slice(0, 2).map((p) => (
                          <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                        ))}
                        {c.products.size > 2 && <Badge variant="outline" className="text-[10px]">+{c.products.size - 2}</Badge>}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <CustomerDetailPanel customerName={customerPanel} onClose={() => setCustomerPanel(null)} />
    </div>
  );
}
