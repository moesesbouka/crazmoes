import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Inbox, User, Search, MessageSquare, Package, Upload } from "lucide-react";
import { format } from "date-fns";
import { useCRMStore, CRMMessage } from "@/lib/crmStore";

interface ConversationSummary {
  thread_path: string;
  customer_name: string;
  listing_title: string;
  lastMessage: string;
  lastDate: string;
  lastTimestamp: number;
  messageCount: number;
}

export function AdminChatConsole() {
  const messages = useCRMStore((s) => s.messages);
  const ownerName = useCRMStore((s) => s.ownerName);
  const [search, setSearch] = useState("");
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [showSystem, setShowSystem] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Group messages into conversations by thread_path
  const conversations = useMemo(() => {
    const map = new Map<string, { messages: CRMMessage[]; summary: ConversationSummary }>();

    for (const m of messages) {
      const key = m.thread_path;
      if (!map.has(key)) {
        map.set(key, {
          messages: [],
          summary: {
            thread_path: key,
            customer_name: m.customer_name,
            listing_title: m.listing_title,
            lastMessage: "",
            lastDate: "",
            lastTimestamp: 0,
            messageCount: 0,
          },
        });
      }
      const entry = map.get(key)!;
      entry.messages.push(m);
      entry.summary.messageCount++;
      if (m.timestamp_ms > entry.summary.lastTimestamp) {
        entry.summary.lastTimestamp = m.timestamp_ms;
        entry.summary.lastMessage = m.message_text;
        entry.summary.lastDate = m.message_date;
      }
    }

    const list = Array.from(map.values());
    // Sort newest first
    list.sort((a, b) => b.summary.lastTimestamp - a.summary.lastTimestamp);
    return list;
  }, [messages]);

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.summary.customer_name.toLowerCase().includes(q) ||
        c.summary.listing_title.toLowerCase().includes(q) ||
        c.summary.lastMessage.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  // Get thread messages
  const threadMessages = useMemo(() => {
    if (!selectedThread) return [];
    const conv = conversations.find((c) => c.summary.thread_path === selectedThread);
    if (!conv) return [];
    let msgs = [...conv.messages];
    if (!showSystem) msgs = msgs.filter((m) => m.system_message !== 1);
    msgs.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
    return msgs;
  }, [selectedThread, conversations, showSystem]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

  // Empty state when no CRM data
  if (messages.length === 0) {
    return (
      <Card className="border-dashed border-2 border-border/50 bg-card/30">
        <CardContent className="p-16 flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <p className="font-semibold text-lg">No conversation data</p>
          <p className="text-sm text-muted-foreground">
            Upload a Messenger CSV in the <strong>CRM</strong> tab first to populate your inbox.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedSummary = selectedThread
    ? conversations.find((c) => c.summary.thread_path === selectedThread)?.summary
    : null;

  return (
    <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-16rem)]">
      {/* Conversation List */}
      <Card className="md:col-span-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Inbox
            <Badge variant="secondary" className="ml-auto">{filteredConversations.length}</Badge>
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <p className="p-4 text-muted-foreground text-sm text-center">No conversations found</p>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.summary.thread_path}
                onClick={() => setSelectedThread(conv.summary.thread_path)}
                className={`w-full p-4 text-left border-b border-border/50 hover:bg-muted/50 transition-colors ${
                  selectedThread === conv.summary.thread_path ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-sm truncate">{conv.summary.customer_name || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{conv.summary.listing_title || "No listing"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 truncate">{conv.summary.lastMessage}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {conv.summary.lastDate}
                    </p>
                    <Badge variant="outline" className="text-[10px] mt-1">{conv.summary.messageCount}</Badge>
                  </div>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* Thread View */}
      <Card className="md:col-span-2 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-lg">
              {selectedSummary ? (
                <div>
                  <span>{selectedSummary.customer_name || "Unknown"}</span>
                  <span className="text-sm font-normal text-muted-foreground ml-2">— {selectedSummary.listing_title}</span>
                </div>
              ) : (
                "Select a conversation"
              )}
            </CardTitle>
            {selectedThread && (
              <div className="flex items-center gap-2">
                <Switch id="show-system" checked={showSystem} onCheckedChange={setShowSystem} />
                <Label htmlFor="show-system" className="text-xs text-muted-foreground">System msgs</Label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
          {selectedThread ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {threadMessages.map((msg, i) => {
                const isOwner = msg.sender === ownerName || msg.owner_message === 1;
                const isSystem = msg.system_message === 1;

                if (isSystem) {
                  return (
                    <div key={i} className="text-center">
                      <span className="text-[11px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                        {msg.message_text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={i} className={`flex ${isOwner ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isOwner
                          ? "hero-gradient text-primary-foreground"
                          : "bg-card border border-border"
                      }`}
                    >
                      <p className="text-xs font-medium opacity-80 mb-0.5">{msg.sender}</p>
                      <p className="text-sm">{msg.message_text}</p>
                      <p className="text-[10px] opacity-60 mt-1">
                        {msg.message_date} {msg.message_time}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Select a conversation to view the thread</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
