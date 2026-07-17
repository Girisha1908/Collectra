"use client";

import { Sidebar } from "@/components/Sidebar";

export default function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 relative">
        {/* Subtle page-specific glows */}
        <div className="pointer-events-none fixed top-0 right-0 h-[500px] w-[500px] bg-primary/5 blur-[120px]" />
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
