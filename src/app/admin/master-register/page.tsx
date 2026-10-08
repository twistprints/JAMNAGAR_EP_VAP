"use client";

import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Mail,
  MailCheck,
  RefreshCw,
  Download,
  AlertCircle,
  Truck,
  User,
  Shield,
  Layers,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";

export default function MasterRegisterPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total: 0,
    approved: 0,
    mailed: 0,
    pending: 0,
    rejected: 0,
  });

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL"); // ALL, PENDING, APPROVED, MAILED
  const [driverFilter, setDriverFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("");

  useEffect(() => {
    fetchBatches();
    fetchRecords();
  }, [selectedBatch, selectedStatus]);

  const fetchBatches = async () => {
    try {
      const res = await apiFetch("/api/batches");
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch (e) {
      console.error("Failed to load batches", e);
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      let url = `/api/pass-pairs?batchId=${selectedBatch}&status=${selectedStatus}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (driverFilter) url += `&driver=${encodeURIComponent(driverFilter)}`;
      if (vehicleFilter) url += `&vehicle=${encodeURIComponent(vehicleFilter)}`;

      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to load pass pairs", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  const handleToggleMailed = async (id: string, currentMailed: boolean) => {
    try {
      setActionLoadingId(id);
      const res = await apiFetch(`/api/pass-pairs/${id}/mail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mailed: !currentMailed }),
      });

      if (res.ok) {
        setToastMessage(
          !currentMailed ? "✓ Pass marked as MAILED" : "✓ Pass status reverted to NOT MAILED"
        );
        setTimeout(() => setToastMessage(null), 3000);
        await fetchRecords();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update mailed status.");
      }
    } catch (e) {
      console.error(e);
      alert("Error updating mailed status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExportMasterSheet = async () => {
    try {
      setExporting(true);
      const res = await apiFetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportType: "MASTER_REGISTER",
          batchId: selectedBatch !== "ALL" ? selectedBatch : undefined,
          status: selectedStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to export Master Register");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `JAMNAGAR_MASTER_REGISTER_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert("Export failed. Please check network.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Operational Control Sheet</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">MASTER REGISTER</h1>
          <p className="text-sm text-slate-300 mt-1">
            Unified control center linking 1:1 EP (Entry Pass) &amp; VAP (Vehicle Pass) across all batches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors"
            title="Refresh Records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
          </button>

          <button
            onClick={handleExportMasterSheet}
            disabled={exporting || records.length === 0}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exporting ? "Exporting..." : "Export Master Sheet (.xlsx)"}</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setSelectedStatus("ALL")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatus === "ALL"
              ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-md"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">TOTAL PASS PAIRS</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <span className="text-[11px] text-slate-400">All registered records</span>
        </div>

        <div
          onClick={() => setSelectedStatus("PENDING")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatus === "PENDING"
              ? "bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-md"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">PENDING VERIFICATION</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">{stats.pending}</div>
          <span className="text-[11px] text-amber-600">Awaiting admin review</span>
        </div>

        <div
          onClick={() => setSelectedStatus("APPROVED")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatus === "APPROVED"
              ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-md"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">APPROVED (READY)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{stats.approved}</div>
          <span className="text-[11px] text-emerald-600">Ready for Excel &amp; ZIP export</span>
        </div>

        <div
          onClick={() => setSelectedStatus("MAILED")}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatus === "MAILED"
              ? "bg-purple-50 border-purple-300 ring-2 ring-purple-500/20 shadow-md"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">MAILED</span>
            <MailCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 mt-1">{stats.mailed}</div>
          <span className="text-[11px] text-purple-600">Dispatched to security / vendors</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by EP Name, Driver, Vehicle Number, Pass Pair ID, Aadhaar..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Batch Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Batch:</span>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber} ({b.recordCount} records)
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="APPROVED">Approved</option>
              <option value="MAILED">Mailed</option>
              <option value="PENDING">Pending</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Master Register Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">Pass Pairs Registry</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-bold">
              {records.length} records shown
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4 text-center">Seq</th>
                <th className="py-3 px-4">Pass Pair ID</th>
                <th className="py-3 px-4">Batch</th>
                <th className="py-3 px-4">EP (Person Name)</th>
                <th className="py-3 px-4">Vehicle Number</th>
                <th className="py-3 px-4">Vehicle Model</th>
                <th className="py-3 px-4">Driver Mobile</th>
                <th className="py-3 px-4">Vendor / Company</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Mailed</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading Master Register records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No pass pair records match the current filters.
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Seq */}
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 bg-slate-50/50">
                      {r.batchSequence || idx + 1}
                    </td>

                    {/* Pass Pair ID */}
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {r.passPairId}
                    </td>

                    {/* Batch */}
                    <td className="py-3 px-4 font-mono text-[11px] font-semibold text-slate-600">
                      {r.batchNumber}
                    </td>

                    {/* EP Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.epName || r.driverName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Aadhaar: {r.aadhaarNumber || "-"}</div>
                    </td>

                    {/* Vehicle Number */}
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-800 border border-slate-200">
                        {r.vehicleNumber}
                      </span>
                    </td>

                    {/* Vehicle Model */}
                    <td className="py-3 px-4 font-medium text-slate-600">
                      {r.vehicleModel || r.vehicleType}
                    </td>

                    {/* Mobile */}
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {r.driverMobile || "-"}
                    </td>

                    {/* Vendor */}
                    <td className="py-3 px-4 font-medium text-slate-600 truncate max-w-[140px]">
                      {r.vendor || r.company}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.overallStatus === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.overallStatus === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {r.overallStatus}
                      </span>
                    </td>

                    {/* Mailed Status */}
                    <td className="py-3 px-4 text-center">
                      {r.mailed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                          <MailCheck className="w-3 h-3" />
                          <span>MAILED</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.overallStatus === "APPROVED" && (
                          <button
                            onClick={() => handleToggleMailed(r.id, r.mailed)}
                            disabled={actionLoadingId === r.id}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                              r.mailed
                                ? "bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-200"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                            }`}
                            title={r.mailed ? "Unmark as mailed" : "Mark as mailed to security"}
                          >
                            <Mail className="w-3 h-3" />
                            <span>{r.mailed ? "Mailed ✓" : "Mark Mailed"}</span>
                          </button>
                        )}

                        <Link
                          href={`/admin/verify/${r.id}`}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                          title="View & Edit Verification"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
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
