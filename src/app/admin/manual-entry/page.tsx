"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Upload,
  PlusCircle,
  Truck,
  Sparkles,
  ArrowRight,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Trash2,
} from "lucide-react";

export default function AdminManualEntryPage() {
  const router = useRouter();
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("Truck");
  const [driverName, setDriverName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [sourceType, setSourceType] = useState<"SOURCE_WHATSAPP" | "SOURCE_MANUAL">(
    "SOURCE_WHATSAPP"
  );
  const [remarks, setRemarks] = useState("Received via WhatsApp logistics group");

  // Selected files map { [category]: File[] }
  const [filesMap, setFilesMap] = useState<Record<string, File[]>>({});
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { key: "RC", label: "Vehicle RC" },
    { key: "PUC", label: "PUC Certificate" },
    { key: "INSURANCE", label: "Insurance Schedule" },
    { key: "DRIVING_LICENSE", label: "Driving Licence" },
    { key: "AADHAAR", label: "Driver Aadhaar" },
    { key: "DRIVER_PHOTO", label: "Driver Portrait Photo" },
  ];

  const handleFileSelect = (category: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFilesMap((prev) => ({
        ...prev,
        [category]: [...(prev[category] || []), ...selectedFiles],
      }));
    }
  };

  const handleRemoveFile = (category: string, index: number) => {
    setFilesMap((prev) => {
      const updated = [...(prev[category] || [])];
      updated.splice(index, 1);
      return { ...prev, [category]: updated };
    });
  };

  const handleProcessEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim()) {
      setError("Please enter the vehicle number.");
      return;
    }

    setLoading(true);
    setError(null);
    setProcessingStatus("Creating vehicle record in system...");

    try {
      // 1. Create Base Submission Record
      const subRes = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleNumber: vehicleNumber.trim().toUpperCase(),
          vehicleType,
          driverName: driverName.trim() || "Driver (WhatsApp Entry)",
          companyName: companyName.trim() || "Logistics Vendor",
          sourceType,
          remarks,
          currentStep: 3,
        }),
      });

      const subData = await subRes.json();
      if (!subRes.ok) {
        setError(subData.error || "Failed to create vehicle record.");
        setLoading(false);
        return;
      }

      const submissionId = subData.submission.id;

      // 2. Upload and Run AI Extraction on all selected files
      let uploadedCount = 0;
      for (const [category, files] of Object.entries(filesMap)) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setProcessingStatus(`Uploading & AI extracting ${category} (file ${i + 1}/${files.length})...`);

          const form = new FormData();
          form.append("file", file);
          form.append("submissionId", submissionId);
          form.append("category", category);
          form.append("pageNumber", (i + 1).toString());

          await fetch("/api/documents/upload", {
            method: "POST",
            body: form,
          });
          uploadedCount++;
        }
      }

      setProcessingStatus("AI extraction complete! Redirecting to verification...");

      // 3. Immediately redirect to side-by-side verification screen!
      setTimeout(() => {
        router.push(`/admin/verify/${submissionId}`);
      }, 800);
    } catch (err: any) {
      setError("An error occurred while uploading documents.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 text-purple-700 font-bold text-xs uppercase tracking-wider mb-1">
          <MessageSquare className="w-4 h-4" />
          <span>Manual & WhatsApp Intake Pipeline</span>
        </div>
        <h1 className="text-xl font-black text-navy-900">
          Manual / WhatsApp Vehicle Entry
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Upload documents received from WhatsApp or paper. The AI extraction pipeline will extract all fields and place the vehicle into Admin Review.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Intake Form */}
      <form onSubmit={handleProcessEntry} className="space-y-5">
        {/* Basic Vehicle Intake Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            1. Basic Vehicle & Source Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vehicle Number <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="e.g. GJ 10 AB 1234"
                className="w-full px-3 py-2 text-sm font-bold uppercase rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vehicle Type
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="Truck">Truck</option>
                <option value="Hydra Crane">Hydra Crane</option>
                <option value="Tanker">Tanker</option>
                <option value="Trailer">Trailer</option>
                <option value="Pickup">Pickup</option>
                <option value="Car">Car / SUV</option>
                <option value="Other">Other Equipment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Intake Source
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-purple-900"
              >
                <option value="SOURCE_WHATSAPP">WhatsApp Document Stream</option>
                <option value="SOURCE_MANUAL">Physical / Manual Paper</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Driver Name (Optional, AI will extract from Aadhaar/Licence)
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Leave blank for AI auto-detection"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Company Name (Optional)
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Leave blank for auto-detection"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Multi-Document Upload Grid */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              2. Batch Upload WhatsApp Documents
            </h2>
            <span className="text-xs text-slate-400">
              Select one or multiple photos for each document
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const fileList = filesMap[cat.key] || [];

              return (
                <div
                  key={cat.key}
                  className={`p-3.5 rounded-xl border transition-all ${
                    fileList.length > 0
                      ? "border-emerald-300 bg-emerald-50/20"
                      : "border-slate-200 bg-slate-50/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">{cat.label}</span>
                    {fileList.length > 0 && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {fileList.length} files
                      </span>
                    )}
                  </div>

                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileSelect(cat.key, e)}
                    />
                    <div className="py-2.5 px-3 rounded-lg border border-dashed border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50/30 text-center transition-colors text-xs font-semibold text-blue-700 flex items-center justify-center gap-1.5">
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{fileList.length > 0 ? "Add More" : "Choose Files"}</span>
                    </div>
                  </label>

                  {/* Selected file names */}
                  {fileList.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {fileList.map((f, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[10px] bg-white p-1 rounded border border-slate-200"
                        >
                          <span className="truncate max-w-[140px] text-slate-700 font-mono">
                            {f.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(cat.key, idx)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit & AI Extract Button */}
        <div className="bg-navy-900 p-5 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div>
            <div className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Automated OCR & Document Understanding Pipeline</span>
            </div>
            <p className="text-xs text-blue-200 mt-0.5">
              {processingStatus || "Will extract vehicle, driver, insurance, and licence data automatically."}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? (
              <span>Extracting & Processing...</span>
            ) : (
              <>
                <span>EXTRACT DATA & OPEN VERIFICATION</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
