"use client";

import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  History,
  FileCheck,
  RefreshCw,
  AlertCircle,
  Image as ImageIcon,
  Archive,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Truck,
  FolderArchive,
} from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

export default function AdminExportPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "DATE_RANGE">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [vehicleNumberBackup, setVehicleNumberBackup] = useState("");

  const [validationData, setValidationData] = useState<any>(null);
  const [loadingValidation, setLoadingValidation] = useState(true);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBatches();
    fetchExportHistory();
  }, []);

  useEffect(() => {
    fetchValidation();
  }, [selectedBatch, dateFilter, startDate, endDate]);

  const fetchBatches = async () => {
    try {
      const res = await apiFetch("/api/batches");
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchValidation = async () => {
    try {
      setLoadingValidation(true);
      setError(null);
      let url = `/api/export/validation?filter=${dateFilter}`;
      if (selectedBatch !== "ALL") {
        url += `&batchId=${selectedBatch}`;
      }
      if (dateFilter === "DATE_RANGE" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setValidationData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingValidation(false);
    }
  };

  const fetchExportHistory = async () => {
    try {
      const res = await apiFetch("/api/export/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.batches || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = async (type: "EP" | "VAP" | "PHOTOS" | "BATCH" | "MASTER_REGISTER" | "ALL" | "VEHICLE_BACKUP") => {
    if (type === "VEHICLE_BACKUP") {
      if (!vehicleNumberBackup.trim()) {
        setError("Please enter a vehicle registration number to download its backup archive.");
        return;
      }
    } else if (type !== "MASTER_REGISTER") {
      if (!validationData || validationData.approvedCount === 0) {
        setError("No approved records available to export for the selected filter.");
        return;
      }
    }

    setDownloadingType(type);
    setError(null);

    try {
      const res = await apiFetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportType: type,
          batchId: selectedBatch !== "ALL" ? selectedBatch : undefined,
          filter: dateFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          vehicleNumber: vehicleNumberBackup || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Failed to generate export file.");
        setDownloadingType(null);
        return;
      }

      const dateStr = new Date().toISOString().split("T")[0];
      let downloadFilename = `JAMNAGAR_EXPORT_${dateStr}.zip`;
      if (type === "EP") downloadFilename = `JAMNAGAR_EP_${dateStr}.xlsx`;
      if (type === "VAP") downloadFilename = `JAMNAGAR_VAP_${dateStr}.xlsx`;
      if (type === "PHOTOS") downloadFilename = `JAMNAGAR_PHOTOS_${dateStr}.zip`;
      if (type === "MASTER_REGISTER") downloadFilename = `JAMNAGAR_MASTER_REGISTER_${dateStr}.xlsx`;
      if (type === "VEHICLE_BACKUP") downloadFilename = `${vehicleNumberBackup.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}_BACKUP_${dateStr}.zip`;

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await fetchExportHistory();
    } catch (e: any) {
      setError("Network error during export.");
    } finally {
      setDownloadingType(null);
    }
  };

  const approvedCount = validationData?.approvedCount || 0;
  const isValid = validationData?.valid ?? false;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider mb-1">
          <FileSpreadsheet className="w-4 h-4" />
          <span>PRODUCTION EXCEL &amp; PHOTO EXPORT CENTER</span>
        </div>
        <h1 className="text-2xl font-black text-navy-900">
          EP &amp; VAP Pass Master Export Hub
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Generates exact master-template Excel files (using NEW VAP &amp; EP formats), Master Register sheet, and sequence-numbered photo archives ({`1_Driver.jpg, 2_Driver.jpg, ...`}).
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-start gap-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div>
            <strong className="block font-bold text-rose-900 mb-0.5">Export Alert</strong>
            <span className="break-words whitespace-pre-line">{error}</span>
          </div>
        </div>
      )}

      {/* Filter & Batch Selection Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
              1. Select Batch &amp; Date Scope
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Filter records by specific batch or export globally across all batches.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Batch Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700">
              <span>Batch:</span>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="bg-transparent focus:outline-none font-bold text-slate-900 cursor-pointer"
              >
                <option value="ALL">All Batches (Global)</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchNumber} ({b.recordCount} records)
                  </option>
                ))}
              </select>
            </div>

            {/* Date Scope Pills */}
            <button
              type="button"
              onClick={() => setDateFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                dateFilter === "ALL"
                  ? "bg-navy-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Approved ({loadingValidation ? "..." : approvedCount})
            </button>

            <button
              type="button"
              onClick={() => setDateFilter("TODAY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                dateFilter === "TODAY"
                  ? "bg-navy-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Today Only
            </button>
          </div>
        </div>
      </div>

      {/* Validation Status Strip */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between text-xs transition-all ${
          loadingValidation
            ? "bg-slate-50 border-slate-200 text-slate-500"
            : approvedCount === 0
            ? "bg-amber-50 border-amber-200 text-amber-800"
            : "bg-emerald-50 border-emerald-200 text-emerald-800"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {loadingValidation ? (
            <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
          ) : approvedCount === 0 ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          )}

          <div>
            <span className="font-bold">
              {loadingValidation
                ? "Checking sequence integrity..."
                : approvedCount === 0
                ? "No approved pass pairs found in this selection."
                : `✓ ${approvedCount} Approved Pass Pair${approvedCount === 1 ? "" : "s"} Verified & Ready for Export`}
            </span>
            <span className="block text-[11px] opacity-80">
              1:1 EP-VAP mapping strictly linked with sequence ordering.
            </span>
          </div>
        </div>

        <button
          onClick={fetchValidation}
          className="p-1.5 hover:bg-black/5 rounded-lg transition-colors"
          title="Recheck Validation"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingValidation ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Export Action Cards (Grid Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CARD 1: EP EXCEL */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-navy-900">EP Master Excel</h3>
            <span className="text-[11px] text-blue-600 font-mono font-bold block mb-1">
              {selectedBatch !== "ALL" ? `${selectedBatch}_EP.xlsx` : "JAMNAGAR_ALL_EP.xlsx"}
            </span>
            <p className="text-xs text-slate-500">
              Uses <code className="text-slate-800">LATEST EP FORMAT.xlsx</code> starting at Row 11. Column F (photo) is left <strong>strictly blank</strong>.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => handleExport("EP")}
              disabled={approvedCount === 0 || downloadingType === "EP"}
              className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingType === "EP" ? "Generating..." : "Download EP Excel"}</span>
            </button>
          </div>
        </div>

        {/* CARD 2: VAP EXCEL */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-navy-900">VAP Master Excel</h3>
            <span className="text-[11px] text-emerald-600 font-mono font-bold block mb-1">
              {selectedBatch !== "ALL" ? `${selectedBatch}_VAP.xlsx` : "JAMNAGAR_ALL_VAP.xlsx"}
            </span>
            <p className="text-xs text-slate-500">
              Uses <code className="text-slate-800">LATEST VAP FORMAT.xlsx</code> with 14 full columns starting at Row 3.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => handleExport("VAP")}
              disabled={approvedCount === 0 || downloadingType === "VAP"}
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingType === "VAP" ? "Generating..." : "Download VAP Excel"}</span>
            </button>
          </div>
        </div>

        {/* CARD 3: EP PHOTOS ZIP */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center mb-3">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-navy-900">EP Photos ZIP Archive</h3>
            <span className="text-[11px] text-purple-600 font-mono font-bold block mb-1">
              {selectedBatch !== "ALL" ? `${selectedBatch}_PHOTOS.zip` : "JAMNAGAR_ALL_PHOTOS.zip"}
            </span>
            <p className="text-xs text-slate-500">
              All passport photos strictly named <code className="text-slate-800">{`{seq}_{DriverName}.jpg`}</code>.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => handleExport("PHOTOS")}
              disabled={approvedCount === 0 || downloadingType === "PHOTOS"}
              className="w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingType === "PHOTOS" ? "Packaging..." : "Download Photos ZIP"}</span>
            </button>
          </div>
        </div>

        {/* CARD 4: MASTER REGISTER SHEET */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-navy-900">Master Register Sheet</h3>
            <span className="text-[11px] text-amber-600 font-mono font-bold block mb-1">
              JAMNAGAR_MASTER_REGISTER.xlsx
            </span>
            <p className="text-xs text-slate-500">
              Complete operational control workbook containing all 23 audit columns, status, and dispatch metadata.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => handleExport("MASTER_REGISTER")}
              disabled={downloadingType === "MASTER_REGISTER"}
              className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingType === "MASTER_REGISTER" ? "Generating..." : "Export Master Register"}</span>
            </button>
          </div>
        </div>

        {/* CARD 5: COMPLETE BATCH / GLOBAL PACKAGE */}
        <div className="bg-gradient-to-br from-slate-900 to-navy-900 text-white rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center mb-3">
              <Archive className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Full Export Bundle (.zip)</h3>
            <span className="text-[11px] text-blue-300 font-mono font-bold block mb-1">
              {selectedBatch !== "ALL" ? `${selectedBatch}_COMPLETE.zip` : "JAMNAGAR_EXPORT.zip"}
            </span>
            <p className="text-xs text-slate-300">
              All-in-one ZIP containing EP.xlsx, VAP.xlsx, Master_Register.xlsx, Photos folder, and manifest.json.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <button
              onClick={() => handleExport(selectedBatch !== "ALL" ? "BATCH" : "ALL")}
              disabled={downloadingType === "ALL" || downloadingType === "BATCH"}
              className="w-full py-2.5 px-3 bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingType === "ALL" || downloadingType === "BATCH" ? "Bundling..." : "Export Complete ZIP"}</span>
            </button>
          </div>
        </div>

        {/* CARD 6: VEHICLE BACKUP ARCHIVE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mb-3">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-navy-900">Vehicle Document Backup</h3>
            <p className="text-xs text-slate-500 mb-2">
              Download all uploaded original documents (RC, PUC, Insurance, License) for a specific vehicle.
            </p>
            <input
              type="text"
              value={vehicleNumberBackup}
              onChange={(e) => setVehicleNumberBackup(e.target.value)}
              placeholder="e.g. GJ-10-AB-1234"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => handleExport("VEHICLE_BACKUP")}
              disabled={!vehicleNumberBackup.trim() || downloadingType === "VEHICLE_BACKUP"}
              className="w-full py-2.5 px-3 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingType === "VEHICLE_BACKUP" ? "Downloading..." : "Download Vehicle Archive"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
