import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageSquare, Package, StickyNote, ListFilter } from "lucide-react";
import { useCRMStore, type CRMMessage } from "@/lib/crmStore";
import { useCRMMetadataStore, type ConversationStatus, type CRMTag, CONVERSATION_STATUSES, CRM_TAGS } from "@/lib/crmMetadataStore";
import { StatusBadge, StatusSelect, QuickStatusButtons } from "./StatusBadge";
import { TagBadges, TagEditor } from "./TagBadges";
import { NotesEditor, NotesIndicator } from "./NotesEditor";
import { NextActionDatePicker, NextActionBadge } from "./NextActionDatePicker";
import { CustomerDetailPanel } from "./CustomerDetailPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { isBefore, startOfDay, parseISO, isValid, subDays } from "date-fns";

interface ConvoSummary {
  thread_path: string;
  listing_title: string;
  customer_name: string;
  product: string;
  messageCount: number;
  lastDate: string;
  lastTimestamp: number;
  isOwnerLast: boolean;
  lastCustomerTimestamp: number;
}

type QuickFilter = "all" | "follow-up-queue" | "overdue" | "needs-reply" | "no-response-3d";

export function CRMConversations() {
  const messages = useCRMStore((s) => s.messages);
  const { getConversationMeta, setConversationStatus, toggleConversationTag, setConversationNotes, setConversationNextActionDate } = useCRMMetadataStore();
  const [search, setSearch] = useState('');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "">("");
  const [tagFilter, setTagFilter] = useState<CRMTag | "">("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [customerPanel, setCustomerPanel] = useState<string | null>(null);

  const conversations = useMemo(() => {
    const map = new Map<string, ConvoSummary>();
    const lastOwner = new Map<string, number>();
    messages.forEach((m) => {
      const existing = map.get(m.thread_path);
      if (!existing) {
        map.set(m.thread_path, {
          thread_path: m.thread_path, listing_title: m.listing_title,
          customer_name: m.customer_name || m.sender, product: m.product,
          messageCount: 1, lastDate: m.message_date, lastTimestamp: m.timestamp_ms,
          isOwnerLast: m.owner_message === 1, lastCustomerTimestamp: m.owner_message !== 1 && m.system_message !== 1 ? m.timestamp_ms : 0,
        });
      } else {
        existing.messageCount++;
        if (m.timestamp_ms > existing.lastTimestamp) {
          existing.lastDate = m.message_date; existing.lastTimestamp = m.timestamp_ms;
          existing.isOwnerLast = m.owner_message === 1;
        }
        if (m.owner_message !== 1 && m.system_message !== 1 && m.timestamp_ms > existing.lastCustomerTimestamp) {
          existing.lastCustomerTimestamp = m.timestamp_ms;
        }
        if (!existing.customer_name && m.customer_name) existing.customer_name = m.customer_name;
      }
      if (m.owner_message === 1) {
        const cur = lastOwner.get(m.thread_path) || 0;
        if (m.timestamp_ms > cur) lastOwner.set(m.thread_path, m.timestamp_ms);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  }, [messages]);

  const filtered = useMemo(() => {
    let list = conversations;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => [c.listing_title, c.customer_name, c.product].join(' ').toLowerCase().includes(q));
    }
    if (statusFilter) list = list.filter((c) => getConversationMeta(c.thread_path).status === statusFilter);
    if (tagFilter) list = list.filter((c) => getConversationMeta(c.thread_path).tags.includes(tagFilter));

    const today = startOfDay(new Date());
    const threeDaysAgo = subDays(today, 3).getTime();
    const CLOSED = new Set(['closed', 'sold', 'refunded']);

    switch (quickFilter) {
      case "follow-up-queue":
        list = list.filter((c) => {
          const s = getConversationMeta(c.thread_path).status;
          return s === 'follow-up' || s === 'waiting-on-me' || s === 'active';
        });
        list = [...list].sort((a, b) => {
          const aD = getConversationMeta(a.thread_path).nextActionDate || '\uffff';
          const bD = getConversationMeta(b.thread_path).nextActionDate || '\uffff';
          if (aD !== bD) return aD.localeCompare(bD);
          return b.lastTimestamp - a.lastTimestamp;
        });
        break;
      case "overdue":
        list = list.filter((c) => {
          const meta = getConversationMeta(c.thread_path);
          if (CLOSED.has(meta.status) || !meta.nextActionDate) return false;
          const d = parseISO(meta.nextActionDate);
          return isValid(d) && isBefore(d, today);
        });
        break;
      case "needs-reply":
        list = list.filter((c) => !c.isOwnerLast);
        break;
      case "no-response-3d":
        list = list.filter((c) => {
          const meta = getConversationMeta(c.thread_path);
          if (CLOSED.has(meta.status)) return false;
          return c.lastCustomerTimestamp > 0 && !c.isOwnerLast && c.lastCustomerTimestamp < threeDaysAgo;
        });
        break;
    }
    return list;
  }, [conversations, search, statusFilter, tagFilter, quickFilter, getConversationMeta]);

  const threadMessages = useMemo(() => {
    if (!selectedThread) return [];
    return messages.filter((m) => m.thread_path === selectedThread).sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  }, [selectedThread, messages]);

  if (selectedThread) {
    const convo = conversations.find((c) => c.thread_path === selectedThread);
    const meta = getConversationMeta(selectedThread);
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedThread(null)}>← Back</Button>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{convo?.listing_title || 'Conversation'}</p>
            <p className="text-xs text-muted-foreground">{convo?.customer_name} · {threadMessages.length} messages</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <QuickStatusButtons currentStatus={meta.status} onChange={(v) => setConversationStatus(selectedThread, v)} />
          <div className="w-px h-5 bg-border/40 mx-0.5" />
          <StatusSelect value={meta.status} onChange={(v) => setConversationStatus(selectedThread, v)} compact />
          <TagEditor tags={meta.tags} onToggle={(t) => toggleConversationTag(selectedThread, t)} compact />
          <NotesEditor notes={meta.notes} onChange={(n) => setConversationNotes(selectedThread, n)} compact />
          <NextActionDatePicker value={meta.nextActionDate} onChange={(d) => setConversationNextActionDate(selectedThread, d)} compact />
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setCustomerPanel(convo?.customer_name || null)}>👤 Customer</Button>
        </div>
        {meta.tags.length > 0 && <TagBadges tags={meta.tags} max={6} size="md" />}
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-2">
            {threadMessages.map((m, i) => (
              <div key={i} className={`rounded-xl p-3 max-w-[80%] ${
                m.owner_message === 1 ? 'ml-auto bg-primary/10 text-foreground' :
                m.system_message === 1 ? 'mx-auto bg-muted/30 text-muted-foreground text-center max-w-full text-xs' :
                'bg-card border border-border/40'
              }`}>
                {m.system_message !== 1 && (
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium">{m.sender}</span>
                    <span className="text-xs text-muted-foreground">{m.message_time}</span>
                  </div>
                )}
                <p className="text-sm">{m.message_text}</p>
                {m.attachments_count > 0 && <Badge variant="outline" className="mt-1 text-xs">📎 {m.attachments_count}</Badge>}
              </div>
            ))}
          </div>
        </ScrollArea>
        <CustomerDetailPanel customerName={customerPanel} onClose={() => setCustomerPanel(null)} onOpenThread={(tp) => { setSelectedThread(tp); setCustomerPanel(null); }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search conversations..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v as ConversationStatus)}>
          <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Statuses</SelectItem>
            {CONVERSATION_STATUSES.map((s) => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tagFilter || "__all__"} onValueChange={(v) => setTagFilter(v === "__all__" ? "" : v as CRMTag)}>
          <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="All Tags" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Tags</SelectItem>
            {CRM_TAGS.map((t) => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <ToggleGroup type="single" value={quickFilter} onValueChange={(v) => v && setQuickFilter(v as QuickFilter)} className="justify-start gap-1">
        {([
          { v: "all" as const, label: "All" },
          { v: "follow-up-queue" as const, label: "Follow-up Queue", icon: ListFilter },
          { v: "overdue" as const, label: "Overdue" },
          { v: "needs-reply" as const, label: "Needs Reply" },
          { v: "no-response-3d" as const, label: "No Reply 3d+" },
        ]).map((f) => (
          <ToggleGroupItem key={f.v} value={f.v} className="h-7 px-3 text-xs rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            {f.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <p className="text-xs text-muted-foreground">{filtered.length} conversations</p>
      <div className="space-y-1.5">
        {filtered.map((c) => {
          const meta = getConversationMeta(c.thread_path);
          return (
            <Card key={c.thread_path} className="bg-card/60 border-border/40 hover:border-primary/40 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedThread(c.thread_path)}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="font-semibold text-sm truncate">{c.listing_title || c.thread_path}</p>
                      <StatusBadge status={meta.status} />
                      {meta.nextActionDate && <NextActionBadge date={meta.nextActionDate} />}
                      <NotesIndicator hasNotes={!!meta.notes} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.customer_name} · {c.product} · {c.lastDate}</p>
                    {meta.tags.length > 0 && <div className="mt-1"><TagBadges tags={meta.tags} max={4} /></div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="h-3 w-3" /> {c.messageCount}
                    </div>
                    <QuickStatusButtons currentStatus={meta.status} onChange={(v) => setConversationStatus(c.thread_path, v)} size="xs" />
                    <Button variant="ghost" size="sm" className="h-5 px-1 text-[9px]" onClick={() => setCustomerPanel(c.customer_name)}>👤</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <CustomerDetailPanel customerName={customerPanel} onClose={() => setCustomerPanel(null)} onOpenThread={(tp) => { setSelectedThread(tp); setCustomerPanel(null); }} />
    </div>
  );
}
