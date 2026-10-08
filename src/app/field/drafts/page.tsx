"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileClock,
  ArrowRight,
  Trash2,
  RefreshCw,
  PlusCircle,
  Truck,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { FieldHeader } from "@/components/field/FieldHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { apiFetch } from "@/lib/apiClient";

export default function FieldDraftsPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/submissions?status=INCOMPLETE&onlyMine=true");
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.submissions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this draft?")) return;

    try {
      const res = await apiFetch(`/api/submissions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDrafts((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full min-h-screen bg-slate-50 flex flex-col pb-12">
      <FieldHeader
        currentStep={0}
        title="INCOMPLETE DRAFTS"
        subtitle="Saved drafts & documents in progress"
        backHref="/field"
      />

      <div className="p-4 flex-1">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading drafts...</p>
          </div>
        ) : drafts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 space-y-4 my-8 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
              <FileClock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-navy-900 text-sm">No Pending Drafts</h3>
              <p className="text-xs text-slate-400 mt-1">
                All your vehicle entries have been submitted.
              </p>
            </div>
            <Link
              href="/field/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Entry</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.map((draft) => {
              const docCount = draft.documents?.length || 0;
              const totalDocs = 6;
              const progressPct = Math.round((docCount / totalDocs) * 100);

              return (
                <div
                  key={draft.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-blue-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-navy-900 text-base">
                          {draft.vehicleNumber}
                        </span>
                        <StatusBadge status={draft.status} size="sm" />
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Driver: <strong className="text-slate-800">{draft.driverName}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {draft.companyName}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDeleteDraft(draft.id, e)}
                      title="Delete Draft"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Document Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                      <span>Documents Uploaded</span>
                      <span>
                        {docCount} / {totalDocs} ({progressPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Continue Button */}
                  <Link
                    href={`/field/new?id=${draft.id}`}
                    className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>CONTINUE DRAFT</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
