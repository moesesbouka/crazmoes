import { useMemo, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, StickyNote, GripVertical } from "lucide-react";
import { useCRMStore, type CRMMessage } from "@/lib/crmStore";
import { useCRMMetadataStore, CONVERSATION_STATUSES, type ConversationStatus } from "@/lib/crmMetadataStore";
import { StatusBadge } from "./StatusBadge";
import { TagBadges } from "./TagBadges";
import { NextActionBadge } from "./NextActionDatePicker";
import { NotesIndicator } from "./NotesEditor";
import { CustomerDetailPanel } from "./CustomerDetailPanel";

interface PipelineCard {
  thread_path: string;
  customer_name: string;
  listing_title: string;
  lastMessage: string;
  lastDate: string;
  lastTimestamp: number;
  messageCount: number;
  hasAttachments: boolean;
}

export function CRMPipeline() {
  const messages = useCRMStore((s) => s.messages);
  const { getConversationMeta, setConversationStatus, conversationMeta } = useCRMMetadataStore();
  const [dragThread, setDragThread] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ConversationStatus | null>(null);
  const [customerPanel, setCustomerPanel] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);

  const cards = useMemo(() => {
    const map = new Map<string, PipelineCard>();
    for (const m of messages) {
      const existing = map.get(m.thread_path);
      if (!existing) {
        map.set(m.thread_path, {
          thread_path: m.thread_path, customer_name: m.customer_name || m.sender,
          listing_title: m.listing_title, lastMessage: m.message_text,
          lastDate: m.message_date, lastTimestamp: m.timestamp_ms,
          messageCount: 1, hasAttachments: m.attachments_count > 0,
        });
      } else {
        existing.messageCount++;
        if (m.attachments_count > 0) existing.hasAttachments = true;
        if (m.timestamp_ms > existing.lastTimestamp) {
          existing.lastTimestamp = m.timestamp_ms;
          existing.lastMessage = m.message_text;
          existing.lastDate = m.message_date;
        }
      }
    }
    return Array.from(map.values());
  }, [messages]);

  const columns = useMemo(() => {
    const cols = new Map<ConversationStatus, PipelineCard[]>();
    CONVERSATION_STATUSES.forEach((s) => cols.set(s.value, []));
    cards.forEach((c) => {
      const meta = getConversationMeta(c.thread_path);
      const col = cols.get(meta.status) || cols.get("new")!;
      col.push(c);
    });
    cols.forEach((list) => list.sort((a, b) => b.lastTimestamp - a.lastTimestamp));
    return cols;
  }, [cards, getConversationMeta, conversationMeta]);

  const handleDragStart = useCallback((tp: string) => setDragThread(tp), []);
  const handleDragOver = useCallback((e: React.DragEvent, status: ConversationStatus) => {
    e.preventDefault();
    setDragOverCol(status);
  }, []);
  const handleDrop = useCallback((status: ConversationStatus) => {
    if (dragThread) {
      setConversationStatus(dragThread, status);
      setDragThread(null);
    }
    setDragOverCol(null);
  }, [dragThread, setConversationStatus]);
  const handleDragEnd = useCallback(() => { setDragThread(null); setDragOverCol(null); }, []);

  if (messages.length === 0) {
    return <p className="text-center text-muted-foreground py-16">Upload data in CRM tab to see pipeline</p>;
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-4" style={{ minHeight: "calc(100vh - 18rem)" }}>
        {CONVERSATION_STATUSES.map((col) => {
          const list = columns.get(col.value) || [];
          const isDragOver = dragOverCol === col.value;
          return (
            <div
              key={col.value}
              className={`flex-shrink-0 w-[250px] flex flex-col rounded-xl border transition-colors ${
                isDragOver ? "border-primary/60 bg-primary/5" : "border-border/40 bg-secondary/10"
              }`}
              onDragOver={(e) => handleDragOver(e, col.value)}
              onDrop={() => handleDrop(col.value)}
              onDragLeave={() => setDragOverCol(null)}
            >
              {/* Column header */}
              <div className="px-3 py-2.5 border-b border-border/30 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${col.color}`}>{col.label}</span>
                </div>
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-mono">{list.length}</Badge>
              </div>
              {/* Cards */}
              <ScrollArea className="flex-1 p-1.5">
                <div className="space-y-1.5">
                  {list.map((card) => {
                    const meta = getConversationMeta(card.thread_path);
                    const isDragging = dragThread === card.thread_path;
                    return (
                      <div
                        key={card.thread_path}
                        draggable
                        onDragStart={() => handleDragStart(card.thread_path)}
                        onDragEnd={handleDragEnd}
                        className={`rounded-lg border border-border/30 bg-card p-2.5 cursor-grab active:cursor-grabbing transition-all hover:border-primary/30 ${
                          isDragging ? "opacity-40 scale-95" : ""
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          <GripVertical className="h-3 w-3 text-muted-foreground/30 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <button
                              onClick={() => setCustomerPanel(card.customer_name)}
                              className="text-[11px] font-bold text-foreground hover:text-primary truncate block w-full text-left"
                            >
                              {card.customer_name}
                            </button>
                            <p className="text-[10px] text-muted-foreground/70 truncate">{card.listing_title}</p>
                            <p className="text-[9px] text-muted-foreground/40 truncate mt-0.5">{card.lastMessage}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[8px] text-muted-foreground/50">{card.lastDate}</span>
                          <div className="flex items-center gap-1">
                            {meta.nextActionDate && <NextActionBadge date={meta.nextActionDate} />}
                            <NotesIndicator hasNotes={!!meta.notes} />
                            {card.hasAttachments && <Paperclip className="h-2.5 w-2.5 text-muted-foreground/30" />}
                          </div>
                        </div>
                        {meta.tags.length > 0 && (
                          <div className="mt-1"><TagBadges tags={meta.tags} max={3} size="sm" /></div>
                        )}
                      </div>
                    );
                  })}
                  {list.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-[10px] text-muted-foreground/40">Drop here</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
      <CustomerDetailPanel
        customerName={customerPanel}
        onClose={() => setCustomerPanel(null)}
        onOpenThread={(tp) => { setSelectedThread(tp); setCustomerPanel(null); }}
      />
    </>
  );
}
