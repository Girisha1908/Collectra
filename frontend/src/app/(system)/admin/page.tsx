
"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  Package,
  CheckCircle2,
  AlertTriangle,
  Users,
  Activity,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

type StatusRow = { status: string; count: number };
type DayRow = { day: string; count: number };

type AnalyticsPayload = {
  byStatus: StatusRow[];
  ordersPerDay: DayRow[];
  ordersCollectedPerDay: DayRow[];
  avgReleaseSeconds: number | null;
};

function countFor(statuses: StatusRow[], key: string): number {
  return statuses.find((s) => s.status === key)?.count ?? 0;
}

function mergeTrend(a: AnalyticsPayload) {
  const days = new Set<string>([
    ...a.ordersPerDay.map((d) => d.day),
    ...a.ordersCollectedPerDay.map((d) => d.day),
  ]);
  const sorted = [...days].sort();
  return sorted.map((day) => {
    const stored = a.ordersPerDay.find((d) => d.day === day)?.count ?? 0;
    const collected = a.ordersCollectedPerDay.find((d) => d.day === day)?.count ?? 0;
    return {
      name: day.slice(5),
      stored,
      collected,
      orders: stored + collected,
    };
  });
}

export default function AdminPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: payload } = await api.get<AnalyticsPayload>("/api/analytics?days=30");
        if (!cancelled) setData(payload);
      } catch (err: unknown) {
        const msg =
          axios.isAxiosError(err) && err.response?.data && typeof err.response.data === "object"
            ? String((err.response.data as { error?: string }).error ?? err.message)
            : "Failed to load analytics";
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dailyBar = useMemo(() => {
    if (!data) return [];
    return data.ordersPerDay.map((d) => ({
      name: d.day.slice(5),
      orders: d.count,
    }));
  }, [data]);

  const areaData = useMemo(() => (data ? mergeTrend(data) : []), [data]);

  const totals = useMemo(() => {
    if (!data) return { total: 0, stored: 0, collected: 0, overdue: 0 };
    const { byStatus } = data;
    const stored = countFor(byStatus, "stored");
    const collected = countFor(byStatus, "collected");
    const overdue = countFor(byStatus, "overdue");
    const total = byStatus.reduce((s, r) => s + r.count, 0);
    return { total, stored, collected, overdue };
  }, [data]);

  const avgHours =
    data?.avgReleaseSeconds != null ? (data.avgReleaseSeconds / 3600).toFixed(1) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading analytics…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-destructive">
        {error ?? "No data"}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Institutional Analytics</h1>
          <p className="text-muted-foreground">Comprehensive system performance and order metrics.</p>
        </div>
        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary gap-2 p-2">
          <Activity className="h-4 w-4" /> Live API
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card border-white/5 hover:border-primary/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.total}</div>
            <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> All-time in database
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5 hover:border-blue-500/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Currently Stored</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.stored}</div>
            <p className="text-xs text-muted-foreground mt-1">Status: stored</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5 hover:border-green-500/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collected Orders</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.collected}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg release time: {avgHours != null ? `${avgHours}h` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5 hover:border-destructive/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Orders</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.overdue}</div>
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              Requires security attention
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass border-white/5">
          <CardHeader>
            <CardTitle>Daily Order Traffic</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                  cursor={{ fill: "#ffffff05" }}
                />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass border-white/5">
          <CardHeader>
            <CardTitle>Inflow vs. Outflow Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="colorStored" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="stored"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorStored)"
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  stroke="hsl(var(--accent))"
                  fillOpacity={1}
                  fill="url(#colorCollected)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
