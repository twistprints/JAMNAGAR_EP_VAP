"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  CheckCircle,
  FileEdit,
  FileSpreadsheet,
  Archive,
  Users,
  Building2,
  ScrollText,
  Settings,
  PlusCircle,
  AlertTriangle,
  Truck,
  Layers,
  FolderArchive,
} from "lucide-react";

export interface AdminSidebarProps {
  pendingCount?: number;
  incompleteCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  pendingCount = 0,
  incompleteCount = 0,
}) => {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin",
    },
    {
      label: "Master Register",
      href: "/admin/master-register",
      icon: Layers,
      highlight: true,
      active: pathname.startsWith("/admin/master-register"),
    },
    {
      label: "Batches",
      href: "/admin/batches",
      icon: FolderArchive,
      active: pathname.startsWith("/admin/batches"),
    },
    {
      label: "Pending Verification",
      href: "/admin/submissions?status=PENDING",
      icon: Clock,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: "bg-amber-500 text-white font-bold",
      active: pathname === "/admin/submissions" && pathname.includes("PENDING"),
    },
    {
      label: "Approved Submissions",
      href: "/admin/submissions?status=APPROVED",
      icon: CheckCircle,
      active: pathname === "/admin/submissions" && pathname.includes("APPROVED"),
    },
    {
      label: "Incomplete Drafts",
      href: "/admin/submissions?status=INCOMPLETE",
      icon: FileEdit,
      badge: incompleteCount > 0 ? incompleteCount : null,
      badgeColor: "bg-slate-500 text-white",
      active: pathname === "/admin/submissions" && pathname.includes("INCOMPLETE"),
    },
    {
      label: "+ Manual / WhatsApp Entry",
      href: "/admin/manual-entry",
      icon: PlusCircle,
      highlight: true,
      active: pathname.startsWith("/admin/manual-entry"),
    },
    {
      label: "Export Excel (EP & VAP)",
      href: "/admin/export",
      icon: FileSpreadsheet,
      active: pathname.startsWith("/admin/export"),
    },
    {
      label: "Vehicle Archive",
      href: "/admin/vehicles",
      icon: Archive,
      active: pathname.startsWith("/admin/vehicles"),
    },
    {
      label: "Drivers Database",
      href: "/admin/drivers",
      icon: Users,
      active: pathname.startsWith("/admin/drivers"),
    },
    {
      label: "Vendors & Contractors",
      href: "/admin/vendors",
      icon: Building2,
      active: pathname.startsWith("/admin/vendors"),
    },
    {
      label: "Audit Logs",
      href: "/admin/audit-logs",
      icon: ScrollText,
      active: pathname.startsWith("/admin/audit-logs"),
    },
    {
      label: "User Management",
      href: "/admin/users",
      icon: Users,
      active: pathname.startsWith("/admin/users"),
    },
    {
      label: "Settings & AI Status",
      href: "/admin/settings",
      icon: Settings,
      active: pathname.startsWith("/admin/settings"),
    },
  ];

  return (
    <aside className="w-64 bg-navy-950 text-slate-300 flex-shrink-0 flex flex-col border-r border-navy-800 min-h-[calc(100vh-4rem)] select-none">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-navy-800/80">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Truck className="w-5 h-5 text-blue-400" />
          <span>ADMIN WORKSPACE</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Jamnagar Reliance Green Zone
        </p>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                item.active
                  ? "bg-blue-600 text-white shadow-sm"
                  : item.highlight
                  ? "bg-navy-800/90 text-blue-300 hover:bg-navy-800 hover:text-white border border-blue-500/30"
                  : "text-slate-300 hover:bg-navy-800/60 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    item.active
                      ? "text-white"
                      : item.highlight
                      ? "text-blue-400"
                      : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== null && item.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    item.badgeColor || "bg-blue-500 text-white"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Mobile Switch Helper */}
      <div className="p-3 border-t border-navy-800/80 bg-navy-900/50">
        <Link
          href="/field"
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-navy-800 hover:bg-navy-700 text-xs font-semibold text-amber-300 border border-amber-500/30 transition-colors"
        >
          📱 Open Mobile Field View
        </Link>
      </div>
    </aside>
  );
};
