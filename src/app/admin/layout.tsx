"use client";

import React, { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [stats, setStats] = useState({ pending: 0, incomplete: 0 });

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000); // 15-sec auto-poll for real-time counter updates
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats({
          pending: data.pending || 0,
          incomplete: data.incomplete || 0,
        });
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="flex-1 flex bg-slate-100 min-h-[calc(100vh-4rem)]">
      <AdminSidebar
        pendingCount={stats.pending}
        incompleteCount={stats.incomplete}
      />
      <main className="flex-1 overflow-x-hidden p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
