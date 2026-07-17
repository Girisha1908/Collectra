
"use client";

import Link from "next/link";
import { PackagePlus, PackageCheck, Database, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <p className="text-muted-foreground">Select an operation to begin secure management.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/order-in" className="group">
          <Card className="glass-card relative h-64 flex flex-col items-center justify-center gap-4 text-center border-white/5 transition-all group-hover:glow-orange group-hover:border-primary/50">
            <CardContent className="flex flex-col items-center p-0">
              <div className="mb-4 rounded-2xl bg-primary/10 p-6 group-hover:bg-primary/20 transition-all duration-500 transform group-hover:scale-110 group-hover:-rotate-3">
                <PackagePlus className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Order In</h3>
              <p className="text-sm text-muted-foreground px-4">New storage intake and QR generation</p>
              <ArrowUpRight className="absolute top-6 right-6 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 text-primary" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/order-out" className="group">
          <Card className="glass-card relative h-64 flex flex-col items-center justify-center gap-4 text-center border-white/5 transition-all group-hover:glow-purple group-hover:border-accent/50">
            <CardContent className="flex flex-col items-center p-0">
              <div className="mb-4 rounded-2xl bg-accent/10 p-6 group-hover:bg-accent/20 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-3">
                <PackageCheck className="h-12 w-12 text-accent" />
              </div>
              <h3 className="text-2xl font-bold">Order Out</h3>
              <p className="text-sm text-muted-foreground px-4">Secure release with OTP verification</p>
              <ArrowUpRight className="absolute top-6 right-6 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 text-accent" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6">
        <Link href="/orders" className="group">
          <Card className="glass-card relative h-48 flex flex-col items-center justify-center gap-4 text-center border-white/5 transition-all group-hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] group-hover:border-blue-500/50">
            <CardContent className="flex flex-col items-center p-0">
              <div className="mb-2 rounded-2xl bg-blue-500/10 p-4 group-hover:bg-blue-500/20 transition-all duration-500 transform group-hover:scale-110">
                <Database className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold">Stored Orders</h3>
              <p className="text-sm text-muted-foreground px-4">Browse and manage current locker inventory</p>
              <ArrowUpRight className="absolute top-6 right-6 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 text-blue-500" />
            </CardContent>
          </Card>
        </Link>
      </div>

    </div>
  );
}
