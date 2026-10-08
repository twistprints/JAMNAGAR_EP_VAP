"use client";

import React, { useState } from "react";
import {
  Settings,
  Sparkles,
  Database,
  Shield,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiResult, setGeminiResult] = useState<any>(null);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (res.ok) {
        setSeedSuccess(true);
        setTimeout(() => setSeedSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSeeding(false);
    }
  };

  const handleTestExtraction = async () => {
    setTestingGemini(true);
    setGeminiResult(null);

    try {
      const res = await fetch("/api/gemini/status");
      const data = await res.json();
      setGeminiResult(data);
    } catch (e: any) {
      setGeminiResult({
        configured: false,
        success: false,
        message: e?.message || "Failed to reach Gemini status endpoint.",
      });
    } finally {
      setTestingGemini(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider mb-1">
          <Settings className="w-4 h-4" />
          <span>System Configuration & AI Status</span>
        </div>
        <h1 className="text-xl font-black text-navy-900">
          Settings & Environment Status
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Verify server-side Gemini Vision OCR integration, database storage, and operational parameters.
        </p>
      </div>

      {seedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Demo Jamnagar vehicle records and pass entries populated!</span>
        </div>
      )}

      {/* AI Extraction Engine Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Gemini Vision AI / Document Extraction Pipeline
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
            Pipeline Active
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          The document understanding system uses Gemini Vision API configured server-side via the secure{" "}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-blue-700">GEMINI_API_KEY</code> environment variable.
          When an API key is provided, high-precision multimodal OCR extraction is executed server-side.
          If running in offline or initial testing mode, the system automatically uses the intelligent fallback engine so that workflows never break.
        </p>

        <div className="pt-2">
          <button
            onClick={handleTestExtraction}
            disabled={testingGemini}
            className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingGemini ? "animate-spin" : ""}`} />
            <span>{testingGemini ? "Testing Pipeline..." : "Test AI Extraction Service"}</span>
          </button>
        </div>

        {geminiResult && (
          <div className={`p-4 rounded-xl border space-y-1.5 text-xs ${
            geminiResult.success
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 font-bold ${
                geminiResult.success ? "text-emerald-800" : "text-amber-800"
              }`}>
                {geminiResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                )}
                <span>
                  {geminiResult.success
                    ? "source: GEMINI_VISION (Active)"
                    : "AI EXTRACTION UNAVAILABLE"}
                </span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white border font-bold">
                Model: {geminiResult.model || "gemini-2.5-flash"}
              </span>
            </div>
            <p className="text-slate-700 font-medium">{geminiResult.message}</p>
          </div>
        )}
      </div>

      {/* Database & Storage Architecture Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-blue-600" />
          Document Storage & File System
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">
              Database Engine
            </span>
            <span className="font-bold text-navy-900 mt-1 block">
              Prisma ORM (SQLite / PostgreSQL Ready)
            </span>
            <span className="text-slate-500 text-[11px]">
              file:./jamnagar_pass.db (Persistent Relational SQL)
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">
              Document Archive Path
            </span>
            <span className="font-mono font-bold text-navy-900 mt-1 block truncate">
              ./uploads/JAMNAGAR/[DATE]/[VEHICLE_NO]/
            </span>
            <span className="text-slate-500 text-[11px]">
              Original images preserved uncompressed
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-navy-900">Populate Sample Records</h3>
            <p className="text-[11px] text-slate-500">
              Inject sample Jamnagar trucks, cranes, drivers, and pending submissions for demo verification.
            </p>
          </div>

          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            {seeding ? "Seeding..." : "Load Demo Records"}
          </button>
        </div>
      </div>
    </div>
  );
}
