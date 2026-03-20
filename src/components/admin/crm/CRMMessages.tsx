import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Download, Filter, X, Save, Bookmark } from "lucide-react";
import { useCRMStore, filterMessages, exportToCSV, type CRMMessage } from "@/lib/crmStore";
import { toast } from "sonner";

export function CRMMessages() {
  const { messages, filters, setFilters, resetFilters, filterPresets, saveFilterPreset, loadFilterPreset, deleteFilterPreset } = useCRMStore();
  const [selectedMsg, setSelectedMsg] = useState<CRMMessage | null>(null);
  const [page, setPage] = useState(0);
  const [presetName, setPresetName] = useState('');
  const pageSize = 50;

  const filtered = useMemo(() => filterMessages(messages, filters), [messages, filters]);
  const sorted = useMemo(() => [...filtered].sort((a, b) => b.timestamp_ms - a.timestamp_ms), [filtered]);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(sorted.length / pageSize);

  const uniqueProducts = useMemo(() => [...new Set(messages.map((m) => m.product).filter(Boolean))].sort(), [messages]);
  const uniqueCustomers = useMemo(() => [...new Set(messages.map((m) => m.customer_name).filter(Boolean))].sort(), [messages]);

  const threadMessages = useMemo(() => {
    if (!selectedMsg) return [];
    return messages.filter((m) => m.thread_path === selectedMsg.thread_path).sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  }, [selectedMsg, messages]);

  const handleExport = () => {
    const csv = exportToCSV(filtered);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'crm_export.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} rows`);
  };

  const chipFilters = [
    { key: 'hideSystem', label: 'Hide System', active: filters.hideSystem },
    { key: 'ownerOnly', label: 'My Messages', active: filters.ownerOnly },
    { key: 'customerOnly', label: 'Customer Messages', active: filters.customerOnly },
    { key: 'withAttachments', label: 'With Attachments', active: filters.withAttachments },
    { key: 'unsentOnly', label: 'Unsent Only', active: filters.unsentOnly },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Search + Export */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages, customers, listings..."
            className="pl-9"
            value={filters.search}
            onChange={(e) => { setFilters({ search: e.target.value }); setPage(0); }}
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {chipFilters.map((c) => (
          <Badge
            key={c.key}
            variant={c.active ? "default" : "outline"}
            className="cursor-pointer select-none"
            onClick={() => { setFilters({ [c.key]: !c.active }); setPage(0); }}
          >
            {c.label}
          </Badge>
        ))}
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { resetFilters(); setPage(0); }}>
          <X className="h-3 w-3 mr-1" /> Reset
        </Button>
      </div>

      {/* Dropdown filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filters.product || "__all__"} onValueChange={(v) => { setFilters({ product: v === '__all__' ? '' : v }); setPage(0); }}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="All Products" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Products</SelectItem>
            {uniqueProducts.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.customer_name || "__all__"} onValueChange={(v) => { setFilters({ customer_name: v === '__all__' ? '' : v }); setPage(0); }}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="All Customers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Customers</SelectItem>
            {uniqueCustomers.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="w-[150px] h-8 text-xs" value={filters.dateFrom} onChange={(e) => { setFilters({ dateFrom: e.target.value }); setPage(0); }} />
        <Input type="date" className="w-[150px] h-8 text-xs" value={filters.dateTo} onChange={(e) => { setFilters({ dateTo: e.target.value }); setPage(0); }} />
      </div>

      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {filterPresets.map((p) => (
          <div key={p.id} className="flex items-center gap-1">
            <Badge variant="secondary" className="cursor-pointer text-xs" onClick={() => loadFilterPreset(p.id)}>
              <Bookmark className="h-3 w-3 mr-1" />{p.name}
            </Badge>
            <button className="text-muted-foreground hover:text-destructive" onClick={() => deleteFilterPreset(p.id)}>
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <Input className="h-6 w-24 text-xs" placeholder="Preset name" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => { if (presetName.trim()) { saveFilterPreset(presetName.trim()); setPresetName(''); toast.success('Preset saved'); } }}>
            <Save className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">{sorted.length.toLocaleString()} results</p>

      {/* Table */}
      <Card className="bg-card/60 border-border/40">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  {['Date', 'Customer', 'Sender', 'Product', 'Listing', 'Message'].map((h) => (
                    <th key={h} className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((m, i) => (
                  <tr
                    key={`${m.thread_path}-${m.timestamp_ms}-${i}`}
                    className="border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedMsg(m)}
                  >
                    <td className="py-2 px-3 text-xs whitespace-nowrap">{m.message_date}</td>
                    <td className="py-2 px-3 text-xs truncate max-w-[120px]">{m.customer_name || '-'}</td>
                    <td className="py-2 px-3 text-xs truncate max-w-[120px]">
                      <span className={m.owner_message === 1 ? 'text-primary font-medium' : ''}>{m.sender}</span>
                    </td>
                    <td className="py-2 px-3 text-xs truncate max-w-[120px]">{m.product}</td>
                    <td className="py-2 px-3 text-xs truncate max-w-[150px]">{m.listing_title}</td>
                    <td className="py-2 px-3 text-xs truncate max-w-[250px] text-muted-foreground">{m.message_text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
          <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}

      {/* Detail Drawer */}
      <Sheet open={!!selectedMsg} onOpenChange={() => setSelectedMsg(null)}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
          {selectedMsg && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">{selectedMsg.listing_title || 'Message Detail'}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Sender', selectedMsg.sender],
                    ['Customer', selectedMsg.customer_name || '-'],
                    ['Listing', selectedMsg.listing_title],
                    ['Conversation', selectedMsg.conversation_title],
                    ['Thread', selectedMsg.thread_path],
                    ['Timestamp', selectedMsg.timestamp_iso],
                    ['Attachments', String(selectedMsg.attachments_count)],
                    ['Reactions', String(selectedMsg.reactions_count)],
                    ['Unsent', selectedMsg.is_unsent ? 'Yes' : 'No'],
                    ['Source', selectedMsg.source_file],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm truncate">{val}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Full Message</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedMsg.message_text}</p>
                </div>

                {/* Thread timeline */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Thread ({threadMessages.length} messages)</p>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {threadMessages.map((m, i) => (
                      <div
                        key={i}
                        className={`rounded-lg p-2.5 text-xs ${
                          m.timestamp_ms === selectedMsg.timestamp_ms
                            ? 'bg-primary/10 border border-primary/30'
                            : m.owner_message === 1 ? 'bg-muted/50 ml-8' : 'bg-card mr-8 border border-border/30'
                        }`}
                      >
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{m.sender}</span>
                          <span className="text-muted-foreground">{m.message_time}</span>
                        </div>
                        <p className="text-muted-foreground">{m.message_text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
