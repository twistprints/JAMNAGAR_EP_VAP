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
  Lock,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiResult, setGeminiResult] = useState<any>(null);

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
          <span>System Configuration &amp; Service Health</span>
        </div>
        <h1 className="text-xl font-black text-navy-900">
          Production Architecture &amp; Service Status
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor server-side Gemini Vision OCR integration, Supabase Authentication, and private document storage.
        </p>
      </div>

      {/* AI Extraction Engine Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Gemini Multimodal AI OCR Engine
          </h2>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
            Pipeline Active
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          The document understanding pipeline executes high-accuracy multimodal OCR extraction directly in memory on document buffers. 
          Extracted fields are cross-referenced with vehicle registration and driver records for automated mismatch detection.
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
                Model: {geminiResult.model || "gemini-3.8-flash"}
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
          Production Storage &amp; Auth Architecture
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold block flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              Authentication Authority
            </span>
            <span className="font-bold text-navy-900 block text-sm">
              Supabase Auth (Cloud Authority)
            </span>
            <span className="text-slate-500 text-[11px] block">
              Role Governance &amp; Dual Portal Access Control
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold block flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              Document Storage
            </span>
            <span className="font-mono font-bold text-navy-900 block text-sm truncate">
              Supabase Storage: jamnagar-documents
            </span>
            <span className="text-slate-500 text-[11px] block">
              Private signed URLs (300s expiry) • Zero disk writes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
