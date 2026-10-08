"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Download,
  Share2,
  PlusCircle,
  Truck,
  ShieldCheck,
  FileArchive,
  ArrowRight,
  Home,
  RefreshCw,
} from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

export default function FieldSuccessPage() {
  const params = useParams();
  const id = params?.id as string;
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchSubmission();
    }
  }, [id]);

  const fetchSubmission = async () => {
    try {
      const res = await apiFetch(`/api/submissions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSubmission(data.submission);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = () => {
    if (!id) return;
    setDownloading(true);
    window.location.href = `/api/submissions/${id}/backup`;
    setTimeout(() => {
      setDownloading(false);
      setSavedFeedback("ZIP archive downloaded to device storage.");
    }, 1500);
  };

  const handleSaveToDevice = async () => {
    if (!submission) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Jamnagar Pass - ${submission.vehicleNumber}`,
          text: `Jamnagar Reliance Pass submission ${submission.submissionNo} for Vehicle ${submission.vehicleNumber} (${submission.driverName}).`,
          url: window.location.href,
        });
        setSavedFeedback("Shared / saved successfully.");
      } catch (e) {
        handleDownloadBackup();
      }
    } else {
      handleDownloadBackup();
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex items-center justify-center p-6">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto w-full min-h-screen bg-slate-50 flex flex-col p-4">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xl text-center space-y-5 my-auto">
        {/* Animated Check Icon */}
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-12 h-12 animate-bounce" />
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            LEVEL 1 VERIFICATION COMPLETE
          </span>
          <h1 className="text-xl font-extrabold text-navy-900 mt-2">
            Submitted for Admin Review
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Vehicle registration and document photographs have been safely uploaded.
          </p>
        </div>

        {/* Submission Details Card */}
        {submission && (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-left text-xs space-y-2">
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">Submission ID</span>
              <span className="font-mono font-bold text-navy-900">
                {submission.submissionNo}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">Vehicle Number</span>
              <span className="font-bold text-navy-900">{submission.vehicleNumber}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">Driver</span>
              <span className="font-semibold text-slate-800">{submission.driverName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Documents Stored</span>
              <span className="font-bold text-emerald-700">
                {submission.documents?.length || 0} Original Photos
              </span>
            </div>
          </div>
        )}

        {savedFeedback && (
          <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs rounded-xl font-medium">
            ✓ {savedFeedback}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          {/* 1. Download Backup ZIP */}
          <button
            onClick={handleDownloadBackup}
            disabled={downloading}
            className="w-full py-3.5 px-4 bg-navy-900 hover:bg-navy-800 active:bg-navy-950 text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <FileArchive className="w-4 h-4 text-blue-400" />
            <span>
              {downloading
                ? "Preparing ZIP Backup..."
                : `DOWNLOAD VEHICLE BACKUP (${submission?.normalizedVehicleNo || "DOCS"}.zip)`}
            </span>
          </button>

          {/* 2. Save To Device */}
          <button
            onClick={handleSaveToDevice}
            className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-navy-900 font-bold text-xs rounded-2xl border border-slate-300 shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <Share2 className="w-4 h-4 text-slate-600" />
            <span>SAVE / SHARE DOCUMENT RECORD</span>
          </button>

          {/* 3. Register New Vehicle Entry */}
          <Link
            href="/field/new"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all block text-center"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ REGISTER ANOTHER VEHICLE</span>
          </Link>

          {/* Back to Field Home */}
          <Link
            href="/field"
            className="w-full py-2.5 text-slate-500 hover:text-navy-900 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Back to Field Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
