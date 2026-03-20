import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, MessageSquare } from "lucide-react";
import { useCRMStore, type CRMMessage } from "@/lib/crmStore";

interface ConvoSummary {
  thread_path: string;
  listing_title: string;
  customer_name: string;
  product: string;
  messageCount: number;
  lastDate: string;
  lastTimestamp: number;
}

export function CRMConversations() {
  const messages = useCRMStore((s) => s.messages);
  const ownerName = useCRMStore((s) => s.ownerName);
  const [search, setSearch] = useState('');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);

  const conversations = useMemo(() => {
    const map = new Map<string, ConvoSummary>();
    messages.forEach((m) => {
      const existing = map.get(m.thread_path);
      if (!existing) {
        map.set(m.thread_path, {
          thread_path: m.thread_path,
          listing_title: m.listing_title,
          customer_name: m.customer_name || m.sender,
          product: m.product,
          messageCount: 1,
          lastDate: m.message_date,
          lastTimestamp: m.timestamp_ms,
        });
      } else {
        existing.messageCount++;
        if (m.timestamp_ms > existing.lastTimestamp) {
          existing.lastDate = m.message_date;
          existing.lastTimestamp = m.timestamp_ms;
        }
        if (!existing.customer_name && m.customer_name) existing.customer_name = m.customer_name;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  }, [messages]);

  const filtered = useMemo(() => {
    if (!search) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) =>
      [c.listing_title, c.customer_name, c.product, c.thread_path].join(' ').toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const threadMessages = useMemo(() => {
    if (!selectedThread) return [];
    return messages.filter((m) => m.thread_path === selectedThread).sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  }, [selectedThread, messages]);

  if (selectedThread) {
    const convo = conversations.find((c) => c.thread_path === selectedThread);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedThread(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <p className="font-medium text-sm">{convo?.listing_title || 'Conversation'}</p>
            <p className="text-xs text-muted-foreground">{convo?.customer_name} · {threadMessages.length} messages</p>
          </div>
        </div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {threadMessages.map((m, i) => (
            <div
              key={i}
              className={`rounded-xl p-3 max-w-[80%] ${
                m.owner_message === 1
                  ? 'ml-auto bg-primary/10 text-foreground'
                  : m.system_message === 1
                    ? 'mx-auto bg-muted/30 text-muted-foreground text-center max-w-full text-xs'
                    : 'bg-card border border-border/40'
              }`}
            >
              {m.system_message !== 1 && (
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-medium">{m.sender}</span>
                  <span className="text-xs text-muted-foreground">{m.message_time}</span>
                </div>
              )}
              <p className="text-sm">{m.message_text}</p>
              {m.attachments_count > 0 && (
                <Badge variant="outline" className="mt-1 text-xs">📎 {m.attachments_count} attachment{m.attachments_count > 1 ? 's' : ''}</Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search conversations..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} conversations</p>
      <div className="space-y-2">
        {filtered.map((c) => (
          <Card
            key={c.thread_path}
            className="bg-card/60 border-border/40 hover:border-primary/40 cursor-pointer transition-colors"
            onClick={() => setSelectedThread(c.thread_path)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{c.listing_title || c.thread_path}</p>
                <p className="text-xs text-muted-foreground truncate">{c.customer_name} · {c.product}</p>
              </div>
              <div className="text-right ml-4 shrink-0">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" /> {c.messageCount}
                </div>
                <p className="text-xs text-muted-foreground">{c.lastDate}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
