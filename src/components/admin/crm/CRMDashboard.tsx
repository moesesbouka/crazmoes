import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCRMStore } from "@/lib/crmStore";
import { MessageSquare, Users, MessagesSquare, Package, Bot, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

export function CRMDashboard() {
  const messages = useCRMStore((s) => s.messages);

  const stats = useMemo(() => {
    const customers = new Set(messages.map((m) => m.customer_name || m.sender).filter(Boolean));
    const conversations = new Set(messages.map((m) => m.thread_path));
    const products = new Set(messages.filter((m) => m.product && m.product !== 'Unclassified').map((m) => m.product));
    const systemCount = messages.filter((m) => m.system_message === 1).length;
    return {
      total: messages.length,
      customers: customers.size,
      conversations: conversations.size,
      products: products.size,
      systemCount,
    };
  }, [messages]);

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

  const topCustomers = useMemo(() => {
    const map = new Map<string, number>();
    messages.forEach((m) => {
      const name = m.customer_name || m.sender;
      if (name) map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [messages]);

  const recentMessages = useMemo(() => 
    [...messages].filter((m) => m.system_message !== 1).sort((a, b) => b.timestamp_ms - a.timestamp_ms).slice(0, 8),
  [messages]);

  const kpis = [
    { label: 'Total Messages', value: stats.total, icon: MessageSquare, color: 'text-primary' },
    { label: 'Customers', value: stats.customers, icon: Users, color: 'text-green-500' },
    { label: 'Conversations', value: stats.conversations, icon: MessagesSquare, color: 'text-blue-500' },
    { label: 'Products', value: stats.products, icon: Package, color: 'text-yellow-500' },
    { label: 'System Msgs', value: stats.systemCount, icon: Bot, color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="bg-card/60 border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <k.icon className={`h-4 w-4 ${k.color}`} />
                <span className="text-xs text-muted-foreground">{k.label}</span>
              </div>
              <p className="text-2xl font-bold">{k.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card/60 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Messages by Month
            </CardTitle>
          </CardHeader>
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" /> Top Products
            </CardTitle>
          </CardHeader>
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

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card/60 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Customers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topCustomers.map(([name, count]) => (
              <div key={name} className="flex justify-between items-center py-1.5 border-b border-border/30 last:border-0">
                <span className="text-sm truncate">{name}</span>
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentMessages.map((m, i) => (
              <div key={i} className="py-1.5 border-b border-border/30 last:border-0">
                <div className="flex justify-between">
                  <span className="text-xs font-medium">{m.sender}</span>
                  <span className="text-xs text-muted-foreground">{m.message_date}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{m.message_text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
