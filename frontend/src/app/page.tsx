"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, User, AlertCircle } from "lucide-react";
import { setAuthToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Authentication failed");
      }

      setAuthToken(data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Background Glows */}
      <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] animate-glow-pulse rounded-full bg-primary/20 blur-[100px]" />
      <div className="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] animate-glow-pulse rounded-full bg-accent/20 blur-[100px]" />
      <div className="absolute top-[20%] right-[10%] h-[30%] w-[30%] animate-glow-pulse rounded-full bg-blue-500/10 blur-[100px]" />

      <Card className="glass relative z-10 w-full max-w-md border-white/10 shadow-2xl transition-all duration-500 hover:shadow-primary/10">
        <CardHeader className="space-y-4 pt-10 text-center">
          <div className="mx-auto flex h-16 w-16 animate-float items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent p-3 shadow-lg glow-orange">
            <Shield className="h-full w-full text-white" />
          </div>
          <div className="space-y-1">
            <CardTitle className="font-headline text-3xl font-bold tracking-tight">Collectra</CardTitle>
            <p className="text-sm text-muted-foreground">Secure Storage & Release Management</p>
          </div>
        </CardHeader>
        <CardContent className="pb-10 pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              <div className="relative group">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  type="text"
                  placeholder="Username"
                  className="bg-white/5 pl-10 border-white/10 transition-all focus:border-primary/50 focus:ring-primary/20"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  type="password"
                  placeholder="Password"
                  className="bg-white/5 pl-10 border-white/10 transition-all focus:border-primary/50 focus:ring-primary/20"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-orange-600 font-semibold shadow-lg glow-orange transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? "Please wait..." : (isRegister ? "Register Account" : "Login to System")}
            </Button>

            <div className="text-center text-sm text-muted-foreground mt-4">
              {isRegister ? "Already have an account? " : "Don't have an account? "}
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-primary hover:underline font-medium focus:outline-none"
              >
                {isRegister ? "Login here" : "Register here"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
