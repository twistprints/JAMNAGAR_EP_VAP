"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  PlusCircle,
  FileClock,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  Truck,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { apiFetch } from "@/lib/apiClient";

export default function FieldHomePage() {
  const [stats, setStats] = useState<{ incomplete: number; submitted: number }>({
    incomplete: 0,
    submitted: 0,
  });
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    fetchFieldData();
  }, []);

  const fetchFieldData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/submissions?onlyMine=true");
      if (res.ok) {
        const data = await res.json();
        const subs = data.submissions || [];
        const incomplete = subs.filter((s: any) =>
          ["DRAFT", "DOCUMENTS_PENDING"].includes(s.status)
        ).length;
        const submitted = subs.filter((s: any) =>
          ["SUBMITTED", "ADMIN_REVIEW", "APPROVED", "EXPORTED"].includes(s.status)
        ).length;

        setStats({ incomplete, submitted });
        setRecentEntries(subs.slice(0, 4));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full min-h-screen bg-slate-50 flex flex-col pb-12">
      {/* Mobile Header Banner */}
      <div className="bg-navy-900 text-white px-5 pt-6 pb-6 rounded-b-2xl shadow-lg border-b border-navy-800">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-inner">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
              JAMNAGAR PASS
            </h1>
            <p className="text-xs text-blue-200 font-medium">
              Vehicle & Driver Registration
            </p>
          </div>
        </div>

        {/* Reassuring Auto-save Pill */}
        <div className="mt-3 flex items-center gap-2 bg-navy-950/80 border border-blue-500/20 px-3 py-2 rounded-xl text-xs text-blue-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Your information and photographs are automatically saved.</span>
        </div>
      </div>

      {/* Main Action Buttons */}
      <div className="px-4 -mt-2 space-y-3">
        {/* 1. NEW VEHICLE ENTRY BUTTON */}
        <Link
          href="/field/new"
          className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:scale-[0.99] text-white rounded-2xl shadow-lg shadow-blue-600/20 transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <PlusCircle className="w-7 h-7 text-white group-hover:rotate-90 transition-transform duration-300" />
            </div>
            <div>
              <div className="text-base font-bold leading-snug">
                + NEW VEHICLE ENTRY
              </div>
              <div className="text-xs text-blue-100 font-medium">
                Register vehicle & driver documents
              </div>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-blue-200 group-hover:translate-x-1 transition-transform" />
        </Link>

        {/* 2. PENDING / INCOMPLETE DRAFTS */}
        <Link
          href="/field/drafts"
          className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-navy-900 rounded-2xl border border-slate-200 shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <FileClock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold leading-snug">
                PENDING / INCOMPLETE
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Continue saved vehicle drafts
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300">
              {stats.incomplete}
            </span>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 3. SUBMITTED ENTRIES */}
        <Link
          href="/field/submitted"
          className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-navy-900 rounded-2xl border border-slate-200 shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold leading-snug">
                SUBMITTED ENTRIES
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Check status & download backups
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-300">
              {stats.submitted}
            </span>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 4. HELP / INSTRUCTIONS */}
        <button
          onClick={() => setShowHelp(true)}
          className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-navy-900 rounded-2xl border border-slate-200 shadow-sm transition-all group text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold leading-snug">
                HELP / INSTRUCTIONS
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Document guidelines & step-by-step help
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Recent Submissions Section */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Recent Vehicles
          </h2>
          <button
            onClick={fetchFieldData}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {recentEntries.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 text-xs">
            No entries recorded yet. Tap <strong>+ New Vehicle Entry</strong> to start.
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentEntries.map((sub) => (
              <Link
                key={sub.id}
                href={
                  ["DRAFT", "DOCUMENTS_PENDING"].includes(sub.status)
                    ? `/field/new?id=${sub.id}`
                    : `/field/success/${sub.id}`
                }
                className="block bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-navy-900 text-sm">
                      {sub.vehicleNumber}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Driver: <span className="font-medium text-slate-800">{sub.driverName}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {sub.companyName} • {new Date(sub.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={sub.status} size="sm" />
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      {sub.submissionNo}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-navy-900 mb-2 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              Guidelines for Field Staff
            </h3>

            <div className="space-y-3 text-xs text-slate-600 my-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <strong className="text-blue-900 block mb-1">1. Fill Basic Details First</strong>
                Enter the Vehicle Number, Driver Name, Mobile, and Company Name. This creates the initial record.
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="text-slate-900 block mb-1">2. Photograph 6 Documents</strong>
                Take clear photos of:
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-700">
                  <li>RC (Vehicle Registration)</li>
                  <li>PUC Certificate</li>
                  <li>Insurance (Can add multiple pages)</li>
                  <li>Driving Licence</li>
                  <li>Aadhaar Card</li>
                  <li>Driver Passport Photo</li>
                </ul>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <strong className="text-emerald-900 block mb-1">3. Check Detected Info</strong>
                The system will automatically detect document details and highlight any mismatches. You can correct fields if needed.
              </div>

              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                <strong className="text-indigo-900 block mb-1">4. Submit & Download Backup</strong>
                Tap Confirm & Submit. You can immediately download the organized vehicle ZIP backup.
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl font-bold text-xs transition-colors"
            >
              Got it, Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
