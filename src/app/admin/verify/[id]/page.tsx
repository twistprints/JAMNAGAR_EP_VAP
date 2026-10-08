"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Save,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  Download,
  FileText,
  Truck,
  User,
  Building2,
  MapPin,
  Calendar,
  Phone,
  RefreshCw,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { DocumentViewer, DocumentItem } from "@/components/common/DocumentViewer";
import { StatusBadge } from "@/components/admin/StatusBadge";

export default function AdminVerifyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [submission, setSubmission] = useState<any>(null);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("RC");

  // Editable Form Fields State
  const [fields, setFields] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState("");

  // Reject / Return Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [returnToFieldUser, setReturnToFieldUser] = useState(true);

  // Success Feedback Banner
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (id) {
      fetchSubmissionDetails(id);
    }
  }, [id]);

  const fetchSubmissionDetails = async (subId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/submissions/${subId}`);
      if (!res.ok) {
        setFeedback({ type: "error", message: "Submission not found." });
        return;
      }

      const data = await res.json();
      const s = data.submission;
      setSubmission(s);
      setReconciliation(data.reconciliation);
      setRemarks(s.remarks || "");

      // Initialize editable fields with current verified/manual values
      setFields({
        vehicleNumber: s.vehicleNumber || "",
        vehicleType: s.vehicleType || "Truck",
        driverName: s.driverName || "",
        driverMobile: s.driverMobile || "",
        driverDob: s.driverDob || "",
        companyName: s.companyName || "",
        designation: s.designation || "Driver",
        vendorRepresentative: s.vendorRepresentative || "",
        vendorRepMobile: s.vendorRepMobile || "",
        addressTaluka: s.addressTaluka || "",
        addressDistrict: s.addressDistrict || "Jamnagar",
        addressState: s.addressState || "Gujarat",
        addressPincode: s.addressPincode || "",
        areaOfWork: s.areaOfWork || "RG",
        validityRequired: s.validityRequired || "1 Month",
        aadhaarNumber: s.aadhaarNumber || "",
        licenseNumber: s.licenseNumber || "",
        licenseValidTo: s.licenseValidTo || "",
        insurancePolicyNo: s.insurancePolicyNo || "",
        insuranceCompany: s.insuranceCompany || "",
        insuranceValidTo: s.insuranceValidTo || "",
        pucCertificateNo: s.pucCertificateNo || "",
        pucValidTo: s.pucValidTo || "",
        rcOwnerName: s.rcOwnerName || "",
        chassisNumber: s.chassisNumber || "",
        engineNumber: s.engineNumber || "",
      });
    } catch (e: any) {
      console.error(e);
      setFeedback({ type: "error", message: "Failed to load submission." });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  // 1. Save Changes
  const handleSaveChanges = async () => {
    if (!id) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/submissions/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, remarks }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", message: data.error || "Failed to save changes." });
      } else {
        setFeedback({ type: "success", message: "All verification edits saved successfully." });
        setSubmission(data.submission);
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: "Network error while saving." });
    } finally {
      setSaving(false);
    }
  };

  // 2. Final Approval & Next Record
  const handleApproveAndNext = async () => {
    if (!id) return;
    setApproving(true);
    setFeedback(null);

    try {
      // First save any unsaved field changes
      await fetch(`/api/submissions/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, remarks }),
      });

      // Approve and trigger official EP/VAP record generation
      const res = await fetch(`/api/submissions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", message: data.error || "Approval failed." });
        setApproving(false);
        return;
      }

      setFeedback({
        type: "success",
        message: `Submission ${submission.submissionNo} APPROVED! Generating EP/VAP records.`,
      });

      // Fast admin workflow: automatically open next pending submission
      if (data.nextPendingId) {
        setTimeout(() => {
          router.push(`/admin/verify/${data.nextPendingId}`);
        }, 1000);
      } else {
        setTimeout(() => {
          router.push("/admin/submissions?status=APPROVED");
        }, 1200);
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: "Approval error occurred." });
      setApproving(false);
    }
  };

  // 3. Reject / Return
  const handleConfirmReject = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/submissions/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: rejectReason,
          returnToFieldUser,
        }),
      });

      if (res.ok) {
        setShowRejectModal(false);
        router.push("/admin/submissions");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const tabs = [
    { id: "RC", label: "Vehicle RC" },
    { id: "PUC", label: "PUC" },
    { id: "INSURANCE", label: "Insurance" },
    { id: "DRIVING_LICENSE", label: "Driving Licence" },
    { id: "AADHAAR", label: "Driver Aadhaar" },
    { id: "DRIVER_PHOTO", label: "Driver Photo" },
    { id: "ALL", label: "All Fields" },
  ];

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="bg-white p-8 rounded-2xl text-center">
        <p className="text-slate-600 font-bold">Submission not found.</p>
        <Link href="/admin/submissions" className="text-blue-600 text-xs font-bold mt-2 inline-block">
          ← Back to Submissions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb & Status Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/submissions"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Back to submissions"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-navy-900 font-mono">
                VERIFY ENTRY #{submission.submissionNo}
              </h1>
              <StatusBadge status={submission.status} size="md" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Vehicle: <strong className="text-slate-800">{submission.vehicleNumber}</strong> • Driver: <strong className="text-slate-800">{submission.driverName}</strong> • Company: {submission.companyName}
            </p>
          </div>
        </div>

        {/* Source & Actions */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
            {submission.sourceType}
          </span>
          <a
            href={`/api/submissions/${submission.id}/backup`}
            download
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Vehicle ZIP</span>
          </a>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
              : "bg-rose-50 text-rose-800 border-rose-300"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Category Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-navy-900 p-1.5 rounded-xl border border-navy-800 select-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-md scale-[1.02]"
                : "text-blue-200 hover:bg-navy-800 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* 2-COLUMN SIDE-BY-SIDE VERIFICATION WORKSPACE                 */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Editable Verified Fields (7 cols) */}
        <div className="lg:col-span-6 xl:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Verified & Editable Fields
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">
              Administrator Final Authority
            </span>
          </div>

          {/* AI Extraction Status Banner */}
          {(() => {
            const hasGemini = submission?.extractions?.some((e: any) => e.status === "SUCCESS" || e.rawAiResponse?.includes("GEMINI_VISION"));
            if (hasGemini) {
              return (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-bold text-emerald-900 truncate">
                      source: GEMINI_VISION
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded">
                    LIVE AI EXTRACTION
                  </span>
                </div>
              );
            } else {
              return (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="font-bold text-amber-900 truncate">
                      AI EXTRACTION UNAVAILABLE
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded">
                    PRESERVED ORIGINAL PHOTO
                  </span>
                </div>
              );
            }
          })()}

          {/* Form Fields corresponding to Active Tab */}
          <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
            {/* 1. RC Fields */}
            {(activeTab === "RC" || activeTab === "ALL") && (
              <div className="space-y-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-navy-900 uppercase tracking-wide block">
                  Vehicle Registration Details
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      value={fields.vehicleNumber || ""}
                      onChange={(e) => handleFieldChange("vehicleNumber", e.target.value.toUpperCase())}
                      className="w-full font-bold uppercase text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Vehicle Type
                    </label>
                    <input
                      type="text"
                      value={fields.vehicleType || ""}
                      onChange={(e) => handleFieldChange("vehicleType", e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      RC Registered Owner
                    </label>
                    <input
                      type="text"
                      value={fields.rcOwnerName || ""}
                      onChange={(e) => handleFieldChange("rcOwnerName", e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Chassis Number
                    </label>
                    <input
                      type="text"
                      value={fields.chassisNumber || ""}
                      onChange={(e) => handleFieldChange("chassisNumber", e.target.value)}
                      className="w-full font-mono text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. PUC Fields */}
            {(activeTab === "PUC" || activeTab === "ALL") && (
              <div className="space-y-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-navy-900 uppercase tracking-wide block">
                  Pollution Under Control (PUC)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      PUC Certificate No
                    </label>
                    <input
                      type="text"
                      value={fields.pucCertificateNo || ""}
                      onChange={(e) => handleFieldChange("pucCertificateNo", e.target.value)}
                      className="w-full font-mono text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      PUC Valid Up To
                    </label>
                    <input
                      type="text"
                      value={fields.pucValidTo || ""}
                      onChange={(e) => handleFieldChange("pucValidTo", e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. Insurance Fields */}
            {(activeTab === "INSURANCE" || activeTab === "ALL") && (
              <div className="space-y-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-navy-900 uppercase tracking-wide block">
                  Commercial Insurance Details
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Insurance Policy No
                    </label>
                    <input
                      type="text"
                      value={fields.insurancePolicyNo || ""}
                      onChange={(e) => handleFieldChange("insurancePolicyNo", e.target.value)}
                      className="w-full font-mono text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Insurance Expiry Date
                    </label>
                    <input
                      type="text"
                      value={fields.insuranceValidTo || ""}
                      onChange={(e) => handleFieldChange("insuranceValidTo", e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Insurance Company
                  </label>
                  <input
                    type="text"
                    value={fields.insuranceCompany || ""}
                    onChange={(e) => handleFieldChange("insuranceCompany", e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* 4. Licence Fields */}
            {(activeTab === "DRIVING_LICENSE" || activeTab === "ALL") && (
              <div className="space-y-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-navy-900 uppercase tracking-wide block">
                  Driving Licence Details
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Driver Full Name
                    </label>
                    <input
                      type="text"
                      value={fields.driverName || ""}
                      onChange={(e) => handleFieldChange("driverName", e.target.value)}
                      className="w-full font-bold text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Licence Number
                    </label>
                    <input
                      type="text"
                      value={fields.licenseNumber || ""}
                      onChange={(e) => handleFieldChange("licenseNumber", e.target.value)}
                      className="w-full font-mono text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="text"
                      value={fields.driverDob || ""}
                      onChange={(e) => handleFieldChange("driverDob", e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Licence Validity Expiry
                    </label>
                    <input
                      type="text"
                      value={fields.licenseValidTo || ""}
                      onChange={(e) => handleFieldChange("licenseValidTo", e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. Aadhaar Fields */}
            {(activeTab === "AADHAAR" || activeTab === "ALL") && (
              <div className="space-y-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-navy-900 uppercase tracking-wide block">
                  Aadhaar Card Details
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Aadhaar Number
                    </label>
                    <input
                      type="text"
                      value={fields.aadhaarNumber || ""}
                      onChange={(e) => handleFieldChange("aadhaarNumber", e.target.value)}
                      placeholder="XXXX XXXX 1234"
                      className="w-full font-mono font-bold text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Driver Mobile
                    </label>
                    <input
                      type="tel"
                      value={fields.driverMobile || ""}
                      onChange={(e) => handleFieldChange("driverMobile", e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                      Taluka
                    </label>
                    <input
                      type="text"
                      value={fields.addressTaluka || ""}
                      onChange={(e) => handleFieldChange("addressTaluka", e.target.value)}
                      className="w-full text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                      District
                    </label>
                    <input
                      type="text"
                      value={fields.addressDistrict || ""}
                      onChange={(e) => handleFieldChange("addressDistrict", e.target.value)}
                      className="w-full text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={fields.addressPincode || ""}
                      onChange={(e) => handleFieldChange("addressPincode", e.target.value)}
                      className="w-full text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 6. Company & Area of Work (EP/VAP Mapping) */}
            {(activeTab === "DRIVER_PHOTO" || activeTab === "ALL") && (
              <div className="space-y-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-navy-900 uppercase tracking-wide block">
                  EP / VAP Pass Parameters
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={fields.companyName || ""}
                      onChange={(e) => handleFieldChange("companyName", e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Designation
                    </label>
                    <select
                      value={fields.designation || "Driver"}
                      onChange={(e) => handleFieldChange("designation", e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="Driver">Driver</option>
                      <option value="Owner">Owner</option>
                      <option value="Manager">Manager</option>
                      <option value="Worker">Worker</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Area of Work
                    </label>
                    <select
                      value={fields.areaOfWork || "RG"}
                      onChange={(e) => handleFieldChange("areaOfWork", e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-blue-700"
                    >
                      <option value="RG">RG (Reliance Green)</option>
                      <option value="AF">AF (Area Factory)</option>
                      <option value="R&R">R&R</option>
                      <option value="LC1">LC1</option>
                      <option value="Jetty">Jetty Marine</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Validity
                    </label>
                    <select
                      value={fields.validityRequired || "1 Month"}
                      onChange={(e) => handleFieldChange("validityRequired", e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="1 Month">1 Month</option>
                      <option value="3 Months">3 Months</option>
                      <option value="6 Months">6 Months</option>
                      <option value="1 Year">1 Year</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Document Viewer (5 cols) */}
        <div className="lg:col-span-6 xl:col-span-6 sticky top-20">
          <DocumentViewer
            documents={submission.documents as DocumentItem[]}
            currentCategory={activeTab}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* BOTTOM FIXED ADMIN ACTION BAR                                */}
      {/* ============================================================ */}
      <div className="sticky bottom-0 z-30 bg-navy-950/95 backdrop-blur text-white p-4 rounded-2xl border border-navy-800 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-200">
            Keyboard: <kbd className="bg-navy-800 px-1.5 py-0.5 rounded text-[10px] font-mono">Tab</kbd> between fields
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Reject / Return Button */}
          <button
            type="button"
            onClick={() => setShowRejectModal(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <XCircle className="w-4 h-4" />
            <span>Reject / Return</span>
          </button>

          {/* Save Changes Button */}
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={saving}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Edits"}</span>
          </button>

          {/* Approve & Next Button (Primary Action) */}
          <button
            type="button"
            onClick={handleApproveAndNext}
            disabled={approving}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {approving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Approving...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>APPROVE & NEXT →</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Reject / Return Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-navy-900 mb-2 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              Return for Correction or Reject
            </h3>

            <p className="text-xs text-slate-600 mb-4">
              Specify the reason why this vehicle entry cannot be approved at this time:
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Insurance document is blurry or expired. Please retake photo."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none mb-4"
            />

            <div className="flex items-center gap-2 mb-5">
              <input
                type="checkbox"
                id="returnToField"
                checked={returnToFieldUser}
                onChange={(e) => setReturnToFieldUser(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="returnToField" className="text-xs text-slate-700 font-medium cursor-pointer">
                Return to field staff for correction (re-upload documents)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmReject}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
