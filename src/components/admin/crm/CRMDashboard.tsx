import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCRMStore } from "@/lib/crmStore";
import { useCRMMetadataStore, CONVERSATION_STATUSES, CRM_TAGS, getStatusDef, getTagDef } from "@/lib/crmMetadataStore";
import { MessageSquare, Users, MessagesSquare, Package, TrendingUp, CheckCircle, Clock, Star, StickyNote, Tag, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";
import { isBefore, parseISO, startOfDay, isValid } from "date-fns";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

export function CRMDashboard() {
  const messages = useCRMStore((s) => s.messages);
  const { conversationMeta, customerMeta } = useCRMMetadataStore();

  const stats = useMemo(() => {
    const customers = new Set(messages.map((m) => m.customer_name || m.sender).filter(Boolean));
    const conversations = new Set(messages.map((m) => m.thread_path));
    const products = new Set(messages.filter((m) => m.product && m.product !== 'Unclassified').map((m) => m.product));
    return { total: messages.length, customers: customers.size, conversations: conversations.size, products: products.size };
  }, [messages]);

  const crmStats = useMemo(() => {
    const allThreads = new Set(messages.map((m) => m.thread_path));
    let sold = 0, followUp = 0, withNotes = 0, overdue = 0;
    const statusCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();
    const today = startOfDay(new Date());

    allThreads.forEach((tp) => {
      const meta = conversationMeta[tp];
      if (!meta) return;
      if (meta.status === 'sold') sold++;
      if (meta.status === 'follow-up') followUp++;
      if (meta.notes) withNotes++;
      if (meta.nextActionDate) {
        const d = parseISO(meta.nextActionDate);
        if (isValid(d) && isBefore(d, today)) overdue++;
      }
      statusCounts.set(meta.status, (statusCounts.get(meta.status) || 0) + 1);
      meta.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1));
    });

    const vipCustomers = Object.values(customerMeta).filter((c) => c.tags.includes('vip')).length;

    const statusData = Array.from(statusCounts.entries())
      .map(([status, count]) => ({ name: getStatusDef(status).label, value: count }))
      .sort((a, b) => b.value - a.value);

    const tagData = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ name: getTagDef(tag).label, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return { sold, followUp, vipCustomers, withNotes, overdue, statusData, tagData };
  }, [messages, conversationMeta, customerMeta]);

  const monthData = useMemo(() => {
    const map = new Map<string, number>();
    messages.forEach((m) => { if (m.month_bucket) map.set(m.month_bucket, (map.get(m.month_bucket) || 0) + 1); });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
  }, [messages]);

  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    messages.forEach((m) => { if (m.product) map.set(m.product, (map.get(m.product) || 0) + 1); });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [messages]);

  const kpis = [
    { label: 'Messages', value: stats.total, icon: MessageSquare, color: 'text-primary' },
    { label: 'Customers', value: stats.customers, icon: Users, color: 'text-green-500' },
    { label: 'Conversations', value: stats.conversations, icon: MessagesSquare, color: 'text-blue-500' },
    { label: 'Products', value: stats.products, icon: Package, color: 'text-yellow-500' },
  ];

  const crmKpis = [
    { label: 'Sold', value: crmStats.sold, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Follow-up', value: crmStats.followUp, icon: Clock, color: 'text-purple-400' },
    { label: 'VIP Customers', value: crmStats.vipCustomers, icon: Star, color: 'text-amber-400' },
    { label: 'With Notes', value: crmStats.withNotes, icon: StickyNote, color: 'text-orange-400' },
    { label: 'Overdue', value: crmStats.overdue, icon: AlertTriangle, color: crmStats.overdue > 0 ? 'text-red-400' : 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      {/* Message KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="bg-card/60 border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><k.icon className={`h-4 w-4 ${k.color}`} /><span className="text-xs text-muted-foreground">{k.label}</span></div>
              <p className="text-2xl font-bold">{k.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CRM Operational KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {crmKpis.map((k) => (
          <Card key={k.label} className={`bg-card/60 border-border/40 ${k.label === 'Overdue' && crmStats.overdue > 0 ? 'border-red-500/40' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1"><k.icon className={`h-4 w-4 ${k.color}`} /><span className="text-xs text-muted-foreground">{k.label}</span></div>
              <p className="text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* By Status */}
        <Card className="bg-card/60 border-border/40">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Tag className="h-4 w-4" /> By Status</CardTitle></CardHeader>
          <CardContent>
            {crmStats.statusData.length > 0 ? (
              <div className="space-y-2">
                {crmStats.statusData.map((s) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <span className="text-xs">{s.name}</span>
                    <Badge variant="outline" className="text-xs font-mono">{s.value}</Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground text-center py-6">No statuses set yet</p>}
          </CardContent>
        </Card>

        {/* Top Tags */}
        <Card className="bg-card/60 border-border/40">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Tag className="h-4 w-4" /> Top Tags</CardTitle></CardHeader>
          <CardContent>
            {crmStats.tagData.length > 0 ? (
              <div className="space-y-2">
                {crmStats.tagData.map((t) => (
                  <div key={t.name} className="flex items-center justify-between">
                    <span className="text-xs">{t.name}</span>
                    <Badge variant="outline" className="text-xs font-mono">{t.value}</Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground text-center py-6">No tags set yet</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card/60 border-border/40">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Messages by Month</CardTitle></CardHeader>
          <CardContent>
            {monthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No data</p>}
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/40">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Package className="h-4 w-4" /> Top Products</CardTitle></CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={topProducts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name }) => name.slice(0, 15)}>
                    {topProducts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No data</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
