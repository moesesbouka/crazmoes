import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, MessageSquare, MessagesSquare, Package, Calendar, Clock } from "lucide-react";
import { useCRMStore, type CRMMessage } from "@/lib/crmStore";
import { useCRMMetadataStore, type CRMTag } from "@/lib/crmMetadataStore";
import { TagEditor, TagBadges } from "./TagBadges";
import { NotesEditor } from "./NotesEditor";
import { StatusBadge } from "./StatusBadge";

interface CustomerDetailPanelProps {
  customerName: string | null;
  onClose: () => void;
  onOpenThread?: (threadPath: string) => void;
}

export function CustomerDetailPanel({ customerName, onClose, onOpenThread }: CustomerDetailPanelProps) {
  const messages = useCRMStore((s) => s.messages);
  const { getCustomerMeta, toggleCustomerTag, setCustomerNotes, getConversationMeta } = useCRMMetadataStore();

  const data = useMemo(() => {
    if (!customerName) return null;
    const custMsgs = messages.filter((m) => m.customer_name === customerName || (m.owner_message !== 1 && m.sender === customerName));
    if (!custMsgs.length) return null;

    const threads = new Map<string, { listing: string; count: number; lastTs: number; lastDate: string }>();
    const products = new Set<string>();
    let firstTs = Infinity, lastTs = 0, firstDate = '', lastDate = '';

    custMsgs.forEach((m) => {
      if (m.product) products.add(m.product);
      if (m.timestamp_ms < firstTs) { firstTs = m.timestamp_ms; firstDate = m.message_date; }
      if (m.timestamp_ms > lastTs) { lastTs = m.timestamp_ms; lastDate = m.message_date; }
      const t = threads.get(m.thread_path);
      if (!t) threads.set(m.thread_path, { listing: m.listing_title, count: 1, lastTs: m.timestamp_ms, lastDate: m.message_date });
      else { t.count++; if (m.timestamp_ms > t.lastTs) { t.lastTs = m.timestamp_ms; t.lastDate = m.message_date; } }
    });

    const convos = Array.from(threads.entries())
      .map(([tp, d]) => ({ threadPath: tp, ...d }))
      .sort((a, b) => b.lastTs - a.lastTs);

    const recentMsgs = [...custMsgs]
      .filter((m) => m.system_message !== 1)
      .sort((a, b) => b.timestamp_ms - a.timestamp_ms)
      .slice(0, 10);

    return { totalMessages: custMsgs.length, totalConversations: threads.size, products: Array.from(products), firstDate, lastDate, convos, recentMsgs };
  }, [customerName, messages]);

  if (!customerName || !data) return null;

  const meta = getCustomerMeta(customerName);

  return (
    <Sheet open={!!customerName} onOpenChange={() => onClose()}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-hidden flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base truncate">{customerName}</SheetTitle>
              <p className="text-[11px] text-muted-foreground">
                {data.totalMessages} messages · {data.totalConversations} conversations
              </p>
            </div>
          </div>
          {meta.tags.length > 0 && <TagBadges tags={meta.tags} max={5} size="md" />}
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-5">
            {/* Actions */}
            <div className="flex flex-wrap gap-1.5">
              <TagEditor tags={meta.tags} onToggle={(t) => toggleCustomerTag(customerName, t)} />
              <NotesEditor notes={meta.notes} onChange={(n) => setCustomerNotes(customerName, n)} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: MessageSquare, label: "Total Messages", value: data.totalMessages },
                { icon: MessagesSquare, label: "Conversations", value: data.totalConversations },
                { icon: Calendar, label: "First Contact", value: data.firstDate },
                { icon: Clock, label: "Last Active", value: data.lastDate },
              ].map((s) => (
                <div key={s.label} className="bg-secondary/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <s.icon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-sm font-semibold">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Products */}
            {data.products.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Products Discussed</p>
                <div className="flex flex-wrap gap-1">
                  {data.products.map((p) => (
                    <Badge key={p} variant="outline" className="text-[10px]">
                      <Package className="h-2.5 w-2.5 mr-1" />{p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Conversations */}
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Conversations</p>
              <div className="space-y-1.5">
                {data.convos.map((c) => {
                  const cMeta = getConversationMeta(c.threadPath);
                  return (
                    <button
                      key={c.threadPath}
                      onClick={() => onOpenThread?.(c.threadPath)}
                      className="w-full text-left bg-secondary/30 hover:bg-secondary/60 rounded-lg px-3 py-2 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium truncate">{c.listing || c.threadPath}</span>
                        <StatusBadge status={cMeta.status} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{c.count} msgs · {c.lastDate}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recent Messages */}
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Recent Messages</p>
              <div className="space-y-1.5">
                {data.recentMsgs.map((m, i) => (
                  <div key={i} className="bg-secondary/30 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-medium ${m.owner_message === 1 ? "text-primary" : ""}`}>{m.sender}</span>
                      <span className="text-[9px] text-muted-foreground">{m.message_date} {m.message_time?.slice(0, 5)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.message_text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes preview */}
            {meta.notes && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Notes</p>
                <p className="text-xs bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 whitespace-pre-wrap">{meta.notes}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
