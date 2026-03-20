import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Inbox, User, Search, MessageSquare, Package, Upload,
  Clock, Paperclip, StickyNote, ListFilter
} from "lucide-react";
import { useCRMStore, CRMMessage } from "@/lib/crmStore";
import { useCRMMetadataStore, type ConversationStatus, type CRMTag } from "@/lib/crmMetadataStore";
import { StatusBadge, StatusSelect, QuickStatusButtons } from "./crm/StatusBadge";
import { TagBadges, TagEditor } from "./crm/TagBadges";
import { NotesEditor, NotesIndicator } from "./crm/NotesEditor";
import { NextActionDatePicker, NextActionBadge } from "./crm/NextActionDatePicker";
import { CustomerDetailPanel } from "./crm/CustomerDetailPanel";

interface ConversationSummary {
  thread_path: string;
  customer_name: string;
  listing_title: string;
  lastMessage: string;
  lastSender: string;
  lastDate: string;
  lastTimestamp: number;
  messageCount: number;
  customerMessageCount: number;
  hasAttachments: boolean;
  isOwnerLast: boolean;
}

type InboxFilter = "all" | "recent" | "customer-only" | "attachments" | "has-notes" | "follow-up-queue";

export function AdminChatConsole() {
  const messages = useCRMStore((s) => s.messages);
  const ownerName = useCRMStore((s) => s.ownerName);
  const { getConversationMeta, setConversationStatus, toggleConversationTag, setConversationNotes, setConversationNextActionDate } = useCRMMetadataStore();
  const [search, setSearch] = useState("");
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [showSystem, setShowSystem] = useState(false);
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("all");
  const [customerPanel, setCustomerPanel] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversations = useMemo(() => {
    const map = new Map<string, { messages: CRMMessage[]; summary: ConversationSummary }>();
    for (const m of messages) {
      const key = m.thread_path;
      if (!map.has(key)) {
        map.set(key, {
          messages: [],
          summary: {
            thread_path: key, customer_name: m.customer_name, listing_title: m.listing_title,
            lastMessage: "", lastSender: "", lastDate: "", lastTimestamp: 0,
            messageCount: 0, customerMessageCount: 0, hasAttachments: false, isOwnerLast: false,
          },
        });
      }
      const entry = map.get(key)!;
      entry.messages.push(m);
      entry.summary.messageCount++;
      if (m.owner_message !== 1 && m.system_message !== 1) entry.summary.customerMessageCount++;
      if (m.attachments_count > 0) entry.summary.hasAttachments = true;
      if (m.timestamp_ms > entry.summary.lastTimestamp) {
        entry.summary.lastTimestamp = m.timestamp_ms;
        entry.summary.lastMessage = m.message_text;
        entry.summary.lastSender = m.sender;
        entry.summary.lastDate = m.message_date;
        entry.summary.isOwnerLast = m.owner_message === 1;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.summary.lastTimestamp - a.summary.lastTimestamp);
  }, [messages]);

  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.summary.customer_name.toLowerCase().includes(q) ||
        c.summary.listing_title.toLowerCase().includes(q) ||
        c.summary.lastMessage.toLowerCase().includes(q)
      );
    }
    const now = Date.now();
    switch (inboxFilter) {
      case "recent": list = list.filter((c) => now - c.summary.lastTimestamp < 3 * 86400000); break;
      case "customer-only": list = list.filter((c) => !c.summary.isOwnerLast); break;
      case "attachments": list = list.filter((c) => c.summary.hasAttachments); break;
      case "has-notes": list = list.filter((c) => getConversationMeta(c.summary.thread_path).notes); break;
      case "follow-up-queue":
        list = list.filter((c) => {
          const meta = getConversationMeta(c.summary.thread_path);
          return meta.status === 'follow-up' || meta.status === 'waiting-on-me';
        });
        // Sort: next action date ascending (empty last), then latest message descending
        list = [...list].sort((a, b) => {
          const aMeta = getConversationMeta(a.summary.thread_path);
          const bMeta = getConversationMeta(b.summary.thread_path);
          const aDate = aMeta.nextActionDate || '\uffff';
          const bDate = bMeta.nextActionDate || '\uffff';
          if (aDate !== bDate) return aDate.localeCompare(bDate);
          return b.summary.lastTimestamp - a.summary.lastTimestamp;
        });
        break;
    }
    return list;
  }, [conversations, search, inboxFilter, getConversationMeta]);

  const threadMessages = useMemo(() => {
    if (!selectedThread) return [];
    const conv = conversations.find((c) => c.summary.thread_path === selectedThread);
    if (!conv) return [];
    let msgs = [...conv.messages];
    if (!showSystem) msgs = msgs.filter((m) => m.system_message !== 1);
    return msgs.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  }, [selectedThread, conversations, showSystem]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [threadMessages]);

  if (messages.length === 0) {
    return (
      <Card className="border-dashed border-2 border-border/50 bg-card/30">
        <CardContent className="p-16 flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <p className="font-semibold text-lg">No conversation data</p>
          <p className="text-sm text-muted-foreground">Upload a Messenger CSV in the <strong>CRM</strong> tab first.</p>
        </CardContent>
      </Card>
    );
  }

  const selectedSummary = selectedThread ? conversations.find((c) => c.summary.thread_path === selectedThread)?.summary : null;
  const selectedMeta = selectedThread ? getConversationMeta(selectedThread) : null;

  return (
    <>
      <div className="grid md:grid-cols-[340px_1fr] gap-0 h-[calc(100vh-14rem)] border border-border rounded-xl overflow-hidden bg-card">
        {/* ── Left: Conversation List ── */}
        <div className="flex flex-col border-r border-border bg-secondary/10">
          <div className="p-2.5 border-b border-border space-y-1.5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xs font-semibold flex items-center gap-1.5">
                <Inbox className="h-3.5 w-3.5 text-primary" /> Inbox
              </h2>
              <Badge variant="secondary" className="text-[9px] font-mono h-4 px-1.5">{filteredConversations.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-7 h-7 text-[11px] bg-background/50" />
            </div>
            <ToggleGroup type="single" value={inboxFilter} onValueChange={(v) => v && setInboxFilter(v as InboxFilter)} className="justify-start gap-0.5 flex-wrap">
              {([
                { v: "all" as const, label: "All", icon: null },
                { v: "follow-up-queue" as const, label: "Follow-up Q", icon: ListFilter },
                { v: "customer-only" as const, label: "Needs Reply", icon: User },
                { v: "recent" as const, label: "Recent", icon: Clock },
                { v: "has-notes" as const, label: "Notes", icon: StickyNote },
                { v: "attachments" as const, label: "Files", icon: Paperclip },
              ]).map((f) => (
                <ToggleGroupItem key={f.v} value={f.v} className="h-5 px-1.5 text-[9px] rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  {f.icon && <f.icon className="h-2.5 w-2.5 mr-0.5" />}{f.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <ScrollArea className="flex-1">
            {filteredConversations.length === 0 ? (
              <p className="p-4 text-muted-foreground text-xs text-center">No conversations match</p>
            ) : (
              filteredConversations.map((conv) => {
                const s = conv.summary;
                const isSelected = selectedThread === s.thread_path;
                const meta = getConversationMeta(s.thread_path);
                const needsReply = !s.isOwnerLast;
                return (
                  <button
                    key={s.thread_path}
                    onClick={() => setSelectedThread(s.thread_path)}
                    className={`w-full text-left px-2.5 py-2 border-b border-border/15 transition-colors ${
                      isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/30 border-l-2 border-l-transparent"
                    }`}
                  >
                    {/* Row 1: customer name + date */}
                    <div className="flex items-center justify-between gap-1 mb-px">
                      <span className={`text-[12px] font-bold truncate leading-tight ${needsReply && !isSelected ? "text-primary" : "text-foreground"}`}>
                        {s.customer_name || "Unknown"}
                      </span>
                      <span className="text-[9px] text-muted-foreground/70 whitespace-nowrap flex-shrink-0">{s.lastDate}</span>
                    </div>
                    {/* Row 2: listing */}
                    <div className="flex items-center gap-1 mb-px">
                      <span className="text-[10px] text-muted-foreground/80 truncate leading-tight">{s.listing_title || "—"}</span>
                    </div>
                    {/* Row 3: preview + count */}
                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                      <p className="text-[10px] text-muted-foreground/50 truncate flex-1 leading-tight">
                        {s.isOwnerLast && <span className="text-muted-foreground/70">You: </span>}{s.lastMessage}
                      </p>
                      <span className="text-[9px] text-muted-foreground/40 font-mono flex-shrink-0">{s.messageCount}</span>
                    </div>
                    {/* Row 4: status + tags + indicators */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <StatusBadge status={meta.status} />
                      {meta.nextActionDate && <NextActionBadge date={meta.nextActionDate} />}
                      <NotesIndicator hasNotes={!!meta.notes} />
                      {s.hasAttachments && <Paperclip className="h-2.5 w-2.5 text-muted-foreground/30" />}
                      {meta.tags.length > 0 && <TagBadges tags={meta.tags} max={2} size="sm" />}
                    </div>
                  </button>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* ── Right: Thread View ── */}
        <div className="flex flex-col overflow-hidden">
          {/* Sticky thread header */}
          <div className="px-4 py-2 border-b border-border flex-shrink-0 bg-card sticky top-0 z-10">
            {selectedSummary && selectedMeta ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => setCustomerPanel(selectedSummary.customer_name)}
                      className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 hover:bg-primary/25 transition-colors"
                    >
                      <User className="h-3.5 w-3.5 text-primary" />
                    </button>
                    <div className="min-w-0">
                      <button
                        onClick={() => setCustomerPanel(selectedSummary.customer_name)}
                        className="text-sm font-bold truncate block hover:text-primary transition-colors"
                      >
                        {selectedSummary.customer_name || "Unknown"}
                      </button>
                      <p className="text-[10px] text-muted-foreground/70 truncate">
                        {selectedSummary.listing_title} · {selectedSummary.messageCount} msgs
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Switch id="show-sys" checked={showSystem} onCheckedChange={setShowSystem} className="scale-[0.6]" />
                      <Label htmlFor="show-sys" className="text-[9px] text-muted-foreground/60 cursor-pointer">Sys</Label>
                    </div>
                  </div>
                </div>
                {/* Quick actions bar */}
                <div className="flex items-center gap-1 flex-wrap">
                  <QuickStatusButtons currentStatus={selectedMeta.status} onChange={(v) => setConversationStatus(selectedThread!, v)} size="xs" />
                  <div className="w-px h-4 bg-border/40 mx-0.5" />
                  <StatusSelect value={selectedMeta.status} onChange={(v) => setConversationStatus(selectedThread!, v)} compact />
                  <TagEditor tags={selectedMeta.tags} onToggle={(t) => toggleConversationTag(selectedThread!, t)} compact />
                  <NotesEditor notes={selectedMeta.notes} onChange={(n) => setConversationNotes(selectedThread!, n)} compact />
                  <NextActionDatePicker value={selectedMeta.nextActionDate} onChange={(d) => setConversationNextActionDate(selectedThread!, d)} compact />
                </div>
                {selectedMeta.tags.length > 0 && <TagBadges tags={selectedMeta.tags} max={6} size="md" />}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">Select a conversation</p>
            )}
          </div>

          {/* Messages */}
          {selectedThread ? (
            <ScrollArea className="flex-1">
              <div className="px-4 py-3 space-y-1">
                {threadMessages.map((msg, i) => {
                  const isOwner = msg.sender === ownerName || msg.owner_message === 1;
                  const isSystem = msg.system_message === 1;
                  const showDateSep = i === 0 || threadMessages[i - 1].message_date !== msg.message_date;

                  return (
                    <div key={i}>
                      {showDateSep && (
                        <div className="flex items-center gap-3 my-2.5">
                          <div className="flex-1 h-px bg-border/40" />
                          <span className="text-[9px] text-muted-foreground/60 font-medium">{msg.message_date}</span>
                          <div className="flex-1 h-px bg-border/40" />
                        </div>
                      )}
                      {isSystem ? (
                        <div className="text-center py-0.5">
                          <span className="text-[9px] text-muted-foreground/40 bg-muted/15 px-2 py-0.5 rounded-full">{msg.message_text}</span>
                        </div>
                      ) : (
                        <div className={`flex ${isOwner ? "justify-end" : "justify-start"} mb-0.5`}>
                          <div className={`max-w-[72%] rounded-2xl px-3 py-1.5 ${
                            isOwner
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-secondary/80 border border-border/50 rounded-bl-sm"
                          }`}>
                            <div className="flex items-baseline justify-between gap-3 mb-px">
                              <span className={`text-[9px] font-semibold ${isOwner ? "text-primary-foreground/60" : "text-foreground/70"}`}>
                                {isOwner ? "You" : msg.sender}
                              </span>
                              <span className={`text-[8px] ${isOwner ? "text-primary-foreground/40" : "text-muted-foreground/50"}`}>
                                {msg.message_time?.slice(0, 5)}
                              </span>
                            </div>
                            <p className="text-[12px] leading-relaxed">{msg.message_text}</p>
                            {msg.attachments_count > 0 && (
                              <div className={`flex items-center gap-1 mt-0.5 text-[9px] ${isOwner ? "text-primary-foreground/50" : "text-muted-foreground/60"}`}>
                                <Paperclip className="h-2.5 w-2.5" /> {msg.attachments_count} file{msg.attachments_count > 1 ? "s" : ""}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-15" />
                <p className="text-sm text-muted-foreground/60">Select a conversation to view</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <CustomerDetailPanel
        customerName={customerPanel}
        onClose={() => setCustomerPanel(null)}
        onOpenThread={(tp) => { setSelectedThread(tp); setCustomerPanel(null); }}
      />
    </>
  );
}
