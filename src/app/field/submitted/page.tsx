"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  FileArchive,
  RefreshCw,
  Search,
  ExternalLink,
  Truck,
  PlusCircle,
  Download,
} from "lucide-react";
import { FieldHeader } from "@/components/field/FieldHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { apiFetch } from "@/lib/apiClient";

export default function FieldSubmittedPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/submissions?onlyMine=true");
      if (res.ok) {
        const data = await res.json();
        // Filter out drafts, keep submitted/reviewed/approved
        const submittedOnly = (data.submissions || []).filter(
          (s: any) => !["DRAFT", "DOCUMENTS_PENDING"].includes(s.status)
        );
        setSubmissions(submittedOnly);
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
      s.companyName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-md mx-auto w-full min-h-screen bg-slate-50 flex flex-col pb-12">
      <FieldHeader
        currentStep={0}
        title="SUBMITTED ENTRIES"
        subtitle="Track verification status & download backups"
        backHref="/field"
      />

      <div className="p-4 flex-1 space-y-3">
        {/* Search Box */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search vehicle, driver, ID..."
            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
          />
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading submitted entries...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 space-y-4 my-8 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-navy-900 text-sm">No Submitted Records</h3>
              <p className="text-xs text-slate-400 mt-1">
                Completed submissions will appear here with live admin verification updates.
              </p>
            </div>
            <Link
              href="/field/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Vehicle Entry</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((sub) => (
              <div
                key={sub.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-blue-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy-900 text-base">
                        {sub.vehicleNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5">
                      Driver: <strong className="text-slate-900">{sub.driverName}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {sub.companyName} • Area: <strong className="text-blue-700">{sub.areaOfWork}</strong>
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <StatusBadge status={sub.status} size="sm" />
                    <span className="text-[10px] text-slate-400 font-mono mt-1">
                      {sub.submissionNo}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <Link
                    href={`/field/success/${sub.id}`}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-navy-900 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                    <span>View Record</span>
                  </Link>

                  <a
                    href={`/api/submissions/${sub.id}/backup`}
                    download
                    className="py-2 px-3 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-300" />
                    <span>Download ZIP</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
