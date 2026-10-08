"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  FileEdit,
  MessageSquare,
  AlertTriangle,
  PlusCircle,
  FileSpreadsheet,
  RefreshCw,
  Search,
  ArrowRight,
  Truck,
  Database,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  Layers,
} from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>({
    pending: 0,
    approvedToday: 0,
    incomplete: 0,
    manualEntries: 0,
    totalSubmissions: 0,
    mismatches: 0,
  });
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, subsRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/submissions"),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (subsRes.ok) {
        const subsData = await subsRes.json();
        setSubmissions(subsData.submissions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pendingSubmissions = submissions.filter((s) =>
    ["SUBMITTED", "ADMIN_REVIEW", "READY_FOR_FIELD_VERIFICATION"].includes(s.status)
  );

  const filteredSubmissions = submissions.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      s.vehicleNumber.toLowerCase().includes(q) ||
      s.driverName.toLowerCase().includes(q) ||
      s.submissionNo.toLowerCase().includes(q) ||
      s.companyName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Operational Master Control
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-navy-900 mt-1">
            Jamnagar Pass Verification Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Reliance Green Work Areas • Entry Permit (EP) &amp; Vehicle Access Permit (VAP)
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/admin/master-register"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Master Register</span>
          </Link>

          <Link
            href="/admin/manual-entry"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Manual / WhatsApp Entry</span>
          </Link>

          <Link
            href="/admin/export"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Center</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Verification"
          count={stats.pending}
          icon={Clock}
          color="amber"
          subtitle="Awaiting Level 2 Admin review"
          href="/admin/submissions?status=PENDING"
          urgent={stats.pending > 0}
        />

        <StatCard
          title="Approved Today"
          count={stats.approvedToday}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Ready for EP/VAP Excel export"
          href="/admin/submissions?status=APPROVED"
        />

        <StatCard
          title="Incomplete Drafts"
          count={stats.incomplete}
          icon={FileEdit}
          color="slate"
          subtitle="Field entries in progress"
          href="/admin/submissions?status=INCOMPLETE"
        />

        <StatCard
          title="Manual / WhatsApp"
          count={stats.manualEntries}
          icon={MessageSquare}
          color="blue"
          subtitle="WhatsApp document entries"
          href="/admin/submissions?source=SOURCE_WHATSAPP"
        />
      </div>

      {/* Urgent Pending Review Action Card (if any pending) */}
      {pendingSubmissions.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-5 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-7 h-7 text-white animate-spin" style={{ animationDuration: "8s" }} />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                {pendingSubmissions.length} Submissions Ready for Side-by-Side Verification
              </h2>
              <p className="text-xs text-amber-100 mt-0.5">
                Next in queue: <strong>{pendingSubmissions[0].vehicleNumber}</strong> ({pendingSubmissions[0].driverName})
              </p>
            </div>
          </div>

          <Link
            href={`/admin/verify/${pendingSubmissions[0].id}`}
            className="px-5 py-3 bg-white text-amber-900 font-extrabold text-xs rounded-xl shadow-md hover:bg-amber-50 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <span>Start Quick Verification</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Main Table: Recent Vehicle Submissions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-navy-900">
              Recent Submissions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing all vehicle submissions with live AI extraction status
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search vehicle, driver, ID..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              onClick={fetchDashboardData}
              title="Refresh"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Submission ID</th>
                <th className="py-3 px-4">Vehicle Number</th>
                <th className="py-3 px-4">Driver Name</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Mismatches</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No submissions matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">
                      {sub.submissionNo}
                    </td>
                    <td className="py-3 px-4 font-bold text-navy-900">
                      {sub.vehicleNumber}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {sub.vehicleType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900">{sub.driverName}</span>
                      {sub.driverMobile && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {sub.driverMobile}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate font-medium text-slate-600">
                      {sub.companyName}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          sub.sourceType === "SOURCE_WHATSAPP"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : sub.sourceType === "SOURCE_MANUAL"
                            ? "bg-purple-50 text-purple-800 border-purple-300"
                            : "bg-blue-50 text-blue-800 border-blue-300"
                        }`}
                      >
                        {sub.sourceType === "SOURCE_WHATSAPP"
                          ? "WhatsApp"
                          : sub.sourceType === "SOURCE_MANUAL"
                          ? "Manual"
                          : "Field App"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      {sub.mismatchCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold border border-amber-300 text-[10px]">
                          <AlertTriangle className="w-3 h-3" />
                          {sub.mismatchCount} Mismatch
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium text-[10px]">
                          ✓ Verified
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/verify/${sub.id}`}
                          className="px-3 py-1 bg-navy-900 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                          Verify Record
                        </Link>
                        <a
                          href={`/api/submissions/${sub.id}/backup`}
                          download
                          title="Download Vehicle ZIP Backup"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
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
