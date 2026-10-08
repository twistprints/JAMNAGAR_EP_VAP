"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Download,
  Calendar,
  RefreshCw,
  PlusCircle,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";

export default function AdminSubmissionsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading submissions...</p>
        </div>
      }
    >
      <AdminSubmissionsContent />
    </Suspense>
  );
}

function AdminSubmissionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "ALL";
  const initialSource = searchParams.get("source") || "ALL";

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [sourceFilter, setSourceFilter] = useState(initialSource);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter, sourceFilter, dateFilter]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      let url = `/api/submissions?status=${statusFilter}&source=${sourceFilter}`;
      if (dateFilter) url += `&date=${dateFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = submissions.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      s.vehicleNumber.toLowerCase().includes(q) ||
      s.driverName.toLowerCase().includes(q) ||
      s.submissionNo.toLowerCase().includes(q) ||
      s.companyName.toLowerCase().includes(q) ||
      (s.driverMobile && s.driverMobile.includes(q))
    );
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleExportSelected = async (type: "EP" | "VAP" | "EP_VAP") => {
    if (selectedIds.length === 0) {
      alert("Please select at least one record to export.");
      return;
    }

    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportType: type,
          filter: "SELECTED",
          selectedIds,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `JAMNAGAR_${type}_SELECTED_${new Date().toISOString().split("T")[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const err = await res.json();
        alert(err.error || "Export failed.");
      }
    } catch (e) {
      alert("Network error during export.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Batch Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-navy-900">
            All Vehicle Submissions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, filter, verify, and export EP & VAP permits
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 text-xs">
              <span className="font-bold text-blue-900">
                {selectedIds.length} Selected
              </span>
              <button
                onClick={() => handleExportSelected("EP_VAP")}
                disabled={exporting}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {exporting ? "Generating..." : "Export EP + VAP Excel"}
              </button>
            </div>
          )}

          <Link
            href="/admin/manual-entry"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Manual Entry</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "All" },
            { id: "PENDING", label: "Pending Review" },
            { id: "APPROVED", label: "Approved" },
            { id: "INCOMPLETE", label: "Incomplete" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-navy-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Source Filter, Date Picker & Search */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
          >
            <option value="ALL">All Sources</option>
            <option value="SOURCE_APP">Field App</option>
            <option value="SOURCE_WHATSAPP">WhatsApp</option>
            <option value="SOURCE_MANUAL">Manual</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          />

          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vehicle, driver, ID..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            onClick={fetchSubmissions}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Submissions Master Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      filtered.length > 0 &&
                      selectedIds.length === filtered.length
                    }
                    className="rounded text-blue-600"
                  />
                </th>
                <th className="py-3 px-3">Submission ID</th>
                <th className="py-3 px-3">Vehicle Number</th>
                <th className="py-3 px-3">Driver Details</th>
                <th className="py-3 px-3">Company Name</th>
                <th className="py-3 px-3">Source</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No submissions found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => (
                  <tr
                    key={sub.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      selectedIds.includes(sub.id) ? "bg-blue-50/40" : ""
                    }`}
                  >
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(sub.id)}
                        onChange={() => handleToggleSelect(sub.id)}
                        className="rounded text-blue-600"
                      />
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-navy-900">
                      {sub.submissionNo}
                    </td>
                    <td className="py-3 px-3 font-bold text-navy-900">
                      {sub.vehicleNumber}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {sub.vehicleType}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900">{sub.driverName}</span>
                      {sub.driverMobile && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {sub.driverMobile}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate font-medium text-slate-600">
                      {sub.companyName}
                    </td>
                    <td className="py-3 px-3">
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
                    <td className="py-3 px-3">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {new Date(sub.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/verify/${sub.id}`}
                          className="px-3 py-1 bg-navy-900 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                          Verify
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
