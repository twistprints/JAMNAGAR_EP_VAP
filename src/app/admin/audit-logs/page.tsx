"use client";

import React, { useEffect, useState } from "react";
import {
  ScrollText,
  Search,
  RefreshCw,
  User,
  Clock,
  Shield,
  FileText,
} from "lucide-react";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/audit-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter((l) => {
    const q = searchTerm.toLowerCase();
    return (
      (l.userName && l.userName.toLowerCase().includes(q)) ||
      l.action.toLowerCase().includes(q) ||
      l.resourceType.toLowerCase().includes(q) ||
      (l.details && l.details.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider mb-1">
            <ScrollText className="w-4 h-4" />
            <span>Security & Compliance Trail</span>
          </div>
          <h1 className="text-xl font-black text-navy-900">
            System Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log recording who created, modified, verified, approved, or exported records
          </p>
        </div>

        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, user, details..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                    No audit logs matching search.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 font-sans font-bold text-navy-900">
                      {log.userName || "System"}
                      {log.user?.role && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {log.user.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-navy-900 text-[10px] border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-sans font-medium">
                      {log.resourceType}
                    </td>
                    <td className="py-3 px-4 font-sans text-xs text-slate-600 max-w-md truncate">
                      {log.details || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
