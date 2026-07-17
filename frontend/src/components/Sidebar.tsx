
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Home,
  PackagePlus,
  PackageCheck,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const menuItems = [
  { icon: Home, label: "Home Dashboard", href: "/dashboard" },
  { icon: PackagePlus, label: "Order In", href: "/order-in" },
  { icon: PackageCheck, label: "Order Out", href: "/order-out" },
  { icon: Database, label: "Stored Orders", href: "/orders" },
  { icon: LayoutDashboard, label: "Admin Analytics", href: "/admin" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { toast } = useToast();
  const [hasToken, setHasToken] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sync = () => setHasToken(!!getAuthToken());
    sync();
    // Re-check when the tab becomes visible or localStorage changes in another tab
    window.addEventListener("storage", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("storage", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post<{ token: string }>("/api/auth/login", {
        username: username.trim(),
        password,
      });
      setAuthToken(data.token);
      setHasToken(true);
      setPassword("");
      toast({ title: "Signed in", description: "You can use Order In / Out and Admin." });
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data && typeof err.response.data === "object"
          ? String((err.response.data as { error?: string }).error ?? err.message)
          : "Login failed";
      toast({ variant: "destructive", title: "Login failed", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setHasToken(false);
    toast({ title: "Signed out" });
  };

  return (
    <div className="sidebar-gradient fixed left-0 top-0 flex h-full w-64 flex-col border-r border-white/5 p-4 z-40">
      <div className="flex items-center gap-3 px-2 py-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-lg glow-orange">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Collectra</h2>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Secure System</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 pt-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300",
                isActive
                  ? "bg-primary/10 text-primary shadow-[inset_0_0_10px_rgba(255,165,0,0.1)] border-l-4 border-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                  isActive ? "text-primary glow-orange" : "text-muted-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-white/5 pt-4">
        {hasToken ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        ) : (
          <form onSubmit={handleLogin} className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">API login</p>
            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-9 bg-white/5 border-white/10 text-sm"
              autoComplete="username"
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 bg-white/5 border-white/10 text-sm"
              autoComplete="current-password"
              required
            />
            <Button type="submit" size="sm" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        )}
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-xl px-2 py-2 text-xs font-medium text-muted-foreground transition-all hover:text-white"
        >
          Exit app
        </Link>
      </div>
    </div>
  );
}
