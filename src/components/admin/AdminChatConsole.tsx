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
  Clock, Paperclip, ChevronRight, StickyNote
} from "lucide-react";
import { useCRMStore, CRMMessage } from "@/lib/crmStore";
import { useCRMMetadataStore, type ConversationStatus, type CRMTag } from "@/lib/crmMetadataStore";
import { StatusBadge, StatusSelect } from "./crm/StatusBadge";
import { TagBadges, TagEditor } from "./crm/TagBadges";
import { NotesEditor, NotesIndicator } from "./crm/NotesEditor";
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

type InboxFilter = "all" | "recent" | "customer-only" | "attachments" | "has-notes" | "has-tags";

export function AdminChatConsole() {
  const messages = useCRMStore((s) => s.messages);
  const ownerName = useCRMStore((s) => s.ownerName);
  const { getConversationMeta, setConversationStatus, toggleConversationTag, setConversationNotes } = useCRMMetadataStore();
  const [search, setSearch] = useState("");
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [showSystem, setShowSystem] = useState(false);
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("all");
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | "">("");
  const [tagFilter, setTagFilter] = useState<CRMTag | "">("");
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
      case "has-tags": list = list.filter((c) => getConversationMeta(c.summary.thread_path).tags.length > 0); break;
    }
    if (statusFilter) {
      list = list.filter((c) => getConversationMeta(c.summary.thread_path).status === statusFilter);
    }
    if (tagFilter) {
      list = list.filter((c) => getConversationMeta(c.summary.thread_path).tags.includes(tagFilter));
    }
    return list;
  }, [conversations, search, inboxFilter, statusFilter, tagFilter, getConversationMeta]);

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
      <div className="grid md:grid-cols-[360px_1fr] gap-0 h-[calc(100vh-14rem)] border border-border rounded-xl overflow-hidden bg-card">
        {/* ── Left: Conversation List ── */}
        <div className="flex flex-col border-r border-border bg-secondary/20">
          <div className="p-3 border-b border-border space-y-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold flex items-center gap-2">
                <Inbox className="h-4 w-4 text-primary" /> Inbox
              </h2>
              <Badge variant="secondary" className="text-[10px] font-mono">{filteredConversations.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-xs bg-background/50" />
            </div>
            <ToggleGroup type="single" value={inboxFilter} onValueChange={(v) => v && setInboxFilter(v as InboxFilter)} className="justify-start gap-0.5 flex-wrap">
              {[
                { v: "all", label: "All" },
                { v: "recent", label: "Recent", icon: Clock },
                { v: "customer-only", label: "Needs Reply", icon: User },
                { v: "attachments", label: "Files", icon: Paperclip },
                { v: "has-notes", label: "Notes", icon: StickyNote },
              ].map((f) => (
                <ToggleGroupItem key={f.v} value={f.v} className="h-6 px-2 text-[10px] rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  {f.icon && <f.icon className="h-3 w-3 mr-0.5" />}{f.label}
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
                    className={`w-full text-left px-3 py-2 border-b border-border/20 transition-colors ${
                      isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/40 border-l-2 border-l-transparent"
                    }`}
                  >
                    {/* Row 1: name + date */}
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`text-xs font-semibold truncate ${needsReply && !isSelected ? "text-primary" : "text-foreground"}`}>
                        {s.customer_name || "Unknown"}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{s.lastDate}</span>
                    </div>
                    {/* Row 2: listing + status */}
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-[10px] text-muted-foreground truncate flex-1">{s.listing_title || "—"}</span>
                      <StatusBadge status={meta.status} />
                    </div>
                    {/* Row 3: last message + count */}
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-[10px] text-muted-foreground/60 truncate flex-1">
                        {s.isOwnerLast && <span className="text-muted-foreground">You: </span>}{s.lastMessage}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <NotesIndicator hasNotes={!!meta.notes} />
                        {s.hasAttachments && <Paperclip className="h-2.5 w-2.5 text-muted-foreground/40" />}
                        <Badge variant="outline" className="h-4 min-w-[1rem] flex items-center justify-center px-1 text-[9px] font-mono">{s.messageCount}</Badge>
                      </div>
                    </div>
                    {/* Row 4: tags */}
                    {meta.tags.length > 0 && <TagBadges tags={meta.tags} max={3} size="sm" />}
                  </button>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* ── Right: Thread View ── */}
        <div className="flex flex-col overflow-hidden">
          {/* Thread header */}
          <div className="px-4 py-2.5 border-b border-border flex-shrink-0">
            {selectedSummary && selectedMeta ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <User className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{selectedSummary.customer_name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        <Package className="h-3 w-3 inline mr-0.5" />{selectedSummary.listing_title} · {selectedSummary.messageCount} msgs
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch id="show-sys" checked={showSystem} onCheckedChange={setShowSystem} className="scale-75" />
                    <Label htmlFor="show-sys" className="text-[10px] text-muted-foreground cursor-pointer whitespace-nowrap">System</Label>
                  </div>
                </div>
                {/* Quick actions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <StatusSelect value={selectedMeta.status} onChange={(v) => setConversationStatus(selectedThread!, v)} compact />
                  <TagEditor tags={selectedMeta.tags} onToggle={(t) => toggleConversationTag(selectedThread!, t)} compact />
                  <NotesEditor notes={selectedMeta.notes} onChange={(n) => setConversationNotes(selectedThread!, n)} compact />
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setCustomerPanel(selectedSummary.customer_name)}>
                    <User className="h-3 w-3 mr-1" /> Customer
                  </Button>
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
              <div className="px-4 py-3 space-y-1.5">
                {threadMessages.map((msg, i) => {
                  const isOwner = msg.sender === ownerName || msg.owner_message === 1;
                  const isSystem = msg.system_message === 1;
                  const showDateSep = i === 0 || threadMessages[i - 1].message_date !== msg.message_date;

                  return (
                    <div key={i}>
                      {showDateSep && (
                        <div className="flex items-center gap-3 my-3">
                          <div className="flex-1 h-px bg-border/50" />
                          <span className="text-[10px] text-muted-foreground font-medium">{msg.message_date}</span>
                          <div className="flex-1 h-px bg-border/50" />
                        </div>
                      )}
                      {isSystem ? (
                        <div className="text-center py-0.5">
                          <span className="text-[10px] text-muted-foreground/50 bg-muted/20 px-2.5 py-0.5 rounded-full">{msg.message_text}</span>
                        </div>
                      ) : (
                        <div className={`flex ${isOwner ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[72%] rounded-2xl px-3.5 py-2 ${
                            isOwner ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary border border-border rounded-bl-md"
                          }`}>
                            <div className="flex items-baseline justify-between gap-3 mb-0.5">
                              <span className={`text-[10px] font-semibold ${isOwner ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {isOwner ? "You" : msg.sender}
                              </span>
                              <span className={`text-[9px] ${isOwner ? "text-primary-foreground/50" : "text-muted-foreground/60"}`}>
                                {msg.message_time?.slice(0, 5)}
                              </span>
                            </div>
                            <p className="text-[13px] leading-relaxed">{msg.message_text}</p>
                            {msg.attachments_count > 0 && (
                              <div className={`flex items-center gap-1 mt-1 text-[10px] ${isOwner ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                <Paperclip className="h-3 w-3" /> {msg.attachments_count} file{msg.attachments_count > 1 ? "s" : ""}
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
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Select a conversation to view</p>
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
