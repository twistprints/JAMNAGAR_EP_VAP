"use client";

import React, { useEffect, useState } from "react";
import {
  Layers,
  PlusCircle,
  FileSpreadsheet,
  Download,
  Image as ImageIcon,
  Archive,
  RefreshCw,
  Clock,
  CheckCircle2,
  MailCheck,
  Calendar,
  ExternalLink,
  ChevronRight,
  FolderArchive,
} from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";

export default function BatchesDashboardPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/batches");
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async () => {
    try {
      setCreatingBatch(true);
      const res = await apiFetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "Jamnagar Reliance Green Pass Event",
          eventDate: new Date().toISOString().split("T")[0],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setToastMessage(`✓ Created ${data.batch.batchNumber} successfully!`);
        setTimeout(() => setToastMessage(null), 3500);
        await fetchBatches();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create batch.");
      }
    } catch (e) {
      console.error(e);
      alert("Error creating batch.");
    } finally {
      setCreatingBatch(false);
    }
  };

  const handleExport = async (batchId: string, batchNumber: string, type: "EP" | "VAP" | "PHOTOS" | "BATCH") => {
    try {
      setDownloadingId(batchId);
      setDownloadingType(type);

      const res = await apiFetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportType: type,
          batchId: batchId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || `Failed to export ${type}`);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];

      if (type === "EP") {
        a.download = `${batchNumber}_EP_${dateStr}.xlsx`;
      } else if (type === "VAP") {
        a.download = `${batchNumber}_VAP_${dateStr}.xlsx`;
      } else if (type === "PHOTOS") {
        a.download = `${batchNumber}_PHOTOS_${dateStr}.zip`;
      } else {
        a.download = `${batchNumber}_COMPLETE_${dateStr}.zip`;
      }

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert("Export failed. Please check network.");
    } finally {
      setDownloadingId(null);
      setDownloadingType(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
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
            <span>Submission Batches</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">BATCH MANAGEMENT DASHBOARD</h1>
          <p className="text-sm text-slate-300 mt-1">
            Independent batch workflows with reset sequence numbers ($1..N$) and isolated operational exports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBatches}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors"
            title="Refresh Batches"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
          </button>

          <button
            onClick={handleCreateBatch}
            disabled={creatingBatch}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{creatingBatch ? "Creating Batch..." : "+ Create New Batch"}</span>
          </button>
        </div>
      </div>

      {/* Batches Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
            Loading batch statistics...
          </div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No Batches Created Yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-4">
              Click &quot;+ Create New Batch&quot; to initialize BATCH-001 for vehicle and pass management.
            </p>
            <button
              onClick={handleCreateBatch}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
            >
              + Create BATCH-001
            </button>
          </div>
        ) : (
          batches.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Batch Identification */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex flex-col items-center justify-center font-bold">
                    <span className="text-[10px] uppercase text-blue-500">Batch</span>
                    <span className="text-base leading-none font-mono">
                      {b.batchNumber.replace("BATCH-", "")}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 font-mono">{b.batchNumber}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {b.recordCount} Total Records
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {b.eventDate || new Date(b.createdAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">{b.eventName}</span>
                    </div>
                  </div>
                </div>

                {/* Status Counters */}
                <div className="flex items-center gap-3 py-2 px-4 bg-slate-50 rounded-xl border border-slate-200/70 text-xs">
                  <div className="text-center px-2">
                    <span className="text-[10px] font-bold text-amber-600 uppercase block">Pending</span>
                    <span className="font-bold text-amber-700 text-sm font-mono">{b.pendingCount}</span>
                  </div>
                  <div className="h-6 w-[1px] bg-slate-200" />
                  <div className="text-center px-2">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase block">Approved</span>
                    <span className="font-bold text-emerald-700 text-sm font-mono">{b.approvedCount}</span>
                  </div>
                  <div className="h-6 w-[1px] bg-slate-200" />
                  <div className="text-center px-2">
                    <span className="text-[10px] font-bold text-purple-600 uppercase block">Mailed</span>
                    <span className="font-bold text-purple-700 text-sm font-mono">{b.mailedCount}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/master-register?batchId=${b.id}`}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    <span>View Pass Pairs</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </Link>

                  <button
                    onClick={() => handleExport(b.id, b.batchNumber, "EP")}
                    disabled={b.approvedCount === 0 || downloadingId === b.id}
                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 flex items-center gap-1.5 transition-colors disabled:opacity-40"
                    title="Export EP Excel (Blank Photos)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                    <span>EP (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => handleExport(b.id, b.batchNumber, "VAP")}
                    disabled={b.approvedCount === 0 || downloadingId === b.id}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-colors disabled:opacity-40"
                    title="Export New VAP Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>VAP (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => handleExport(b.id, b.batchNumber, "PHOTOS")}
                    disabled={b.approvedCount === 0 || downloadingId === b.id}
                    className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl border border-purple-200 flex items-center gap-1.5 transition-colors disabled:opacity-40"
                    title="Download EP Photos named 1_Name.jpg"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                    <span>Photos (.zip)</span>
                  </button>

                  <button
                    onClick={() => handleExport(b.id, b.batchNumber, "BATCH")}
                    disabled={b.recordCount === 0 || downloadingId === b.id}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5 transition-all disabled:opacity-40"
                    title="Export Complete Batch ZIP (EP, VAP, Master, Photos, Manifest)"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>Export Batch</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
