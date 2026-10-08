"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Truck,
  User,
  Building2,
  MapPin,
  Calendar,
  Phone,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  FileCheck,
  Download,
  Share2,
  Eye,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { FieldHeader } from "@/components/field/FieldHeader";
import { DocumentUploadCard } from "@/components/field/DocumentUploadCard";
import { DocumentViewer, DocumentItem } from "@/components/common/DocumentViewer";
import { apiFetch } from "@/lib/apiClient";

interface SubmissionData {
  id?: string;
  submissionNo?: string;
  vehicleNumber: string;
  vehicleType: string;
  driverName: string;
  driverMobile: string;
  driverDob: string;
  companyName: string;
  designation: string;
  vendorRepresentative: string;
  vendorRepMobile: string;
  addressTaluka: string;
  addressDistrict: string;
  addressState: string;
  addressPincode: string;
  areaOfWork: string;
  validityRequired: string;
  remarks: string;
  currentStep: number;
  documents: Array<{
    id: string;
    category: string;
    fileName: string;
    pageNumber?: number;
  }>;
  extractions?: Array<any>;
}

export default function NewVehicleEntryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <NewVehicleEntryContent />
    </Suspense>
  );
}

function NewVehicleEntryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingId = searchParams.get("id");

  const [step, setStep] = useState(1);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(existingId || null);
  const [submissionNo, setSubmissionNo] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<SubmissionData>({
    vehicleNumber: "",
    vehicleType: "Truck",
    driverName: "",
    driverMobile: "",
    driverDob: "",
    companyName: "",
    designation: "Driver",
    vendorRepresentative: "",
    vendorRepMobile: "",
    addressTaluka: "",
    addressDistrict: "Jamnagar",
    addressState: "Gujarat",
    addressPincode: "",
    areaOfWork: "RG",
    validityRequired: "1 Month",
    remarks: "",
    currentStep: 1,
    documents: [],
  });

  const [reconciliation, setReconciliation] = useState<any>(null);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-fill suggestions
  const [vendorList, setVendorList] = useState<any[]>([]);
  const [driverList, setDriverList] = useState<any[]>([]);

  useEffect(() => {
    fetchVendorsAndDrivers();
    if (existingId) {
      loadExistingSubmission(existingId);
    }
  }, [existingId]);

  const fetchVendorsAndDrivers = async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        apiFetch("/api/vendors"),
        apiFetch("/api/drivers"),
      ]);
      if (vRes.ok) {
        const vData = await vRes.json();
        setVendorList(vData.vendors || []);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        setDriverList(dData.drivers || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadExistingSubmission = async (id: string) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/submissions/${id}`);
      if (res.ok) {
        const data = await res.json();
        const s = data.submission;
        setSubmissionId(s.id);
        setSubmissionNo(s.submissionNo);
        setFormData({
          id: s.id,
          submissionNo: s.submissionNo,
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
          remarks: s.remarks || "",
          currentStep: s.currentStep || 1,
          documents: s.documents || [],
        });
        setReconciliation(data.reconciliation);
        if (s.currentStep) {
          setStep(Math.min(s.currentStep, 4));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Handle Vendor Selection Auto-fill
  const handleVendorSelect = (companyName: string) => {
    const selected = vendorList.find((v) => v.companyName === companyName);
    setFormData((prev) => ({
      ...prev,
      companyName,
      vendorRepresentative: selected?.vendorRepresentative || prev.vendorRepresentative,
      vendorRepMobile: selected?.representativeMobile || prev.vendorRepMobile,
    }));
  };

  // Handle Driver Selection Auto-fill
  const handleDriverSelect = (driverName: string) => {
    const selected = driverList.find((d) => d.name === driverName);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        driverName: selected.name,
        driverMobile: selected.mobile || prev.driverMobile,
        driverDob: selected.dob || prev.driverDob,
        addressTaluka: selected.addressTaluka || prev.addressTaluka,
        addressDistrict: selected.addressDistrict || prev.addressDistrict,
        addressState: selected.addressState || prev.addressState,
        addressPincode: selected.addressPincode || prev.addressPincode,
      }));
    } else {
      setFormData((prev) => ({ ...prev, driverName }));
    }
  };

  // Save / Update Draft
  const saveDraft = async (nextStep?: number): Promise<string | null> => {
    if (!formData.vehicleNumber || !formData.driverName || !formData.companyName) {
      setSubmitError("Please fill required fields: Vehicle Number, Driver Name, and Company Name.");
      return null;
    }

    setIsAutoSaving(true);
    setSubmitError(null);

    try {
      const res = await apiFetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          id: submissionId,
          currentStep: nextStep || step,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Failed to save draft.");
        setIsAutoSaving(false);
        return null;
      }

      const savedSub = data.submission;
      setSubmissionId(savedSub.id);
      setSubmissionNo(savedSub.submissionNo);
      setFormData((prev) => ({
        ...prev,
        id: savedSub.id,
        submissionNo: savedSub.submissionNo,
        documents: savedSub.documents || prev.documents,
      }));
      setIsAutoSaving(false);
      return savedSub.id;
    } catch (e: any) {
      setSubmitError("Network error while saving draft.");
      setIsAutoSaving(false);
      return null;
    }
  };

  // Handle Document Upload
  const handleDocumentUpload = async (
    category: string,
    file: File,
    pageNumber: number
  ): Promise<boolean> => {
    let currentSubId = submissionId;
    if (!currentSubId) {
      currentSubId = await saveDraft(2);
      if (!currentSubId) return false;
    }

    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("submissionId", currentSubId);
      uploadForm.append("category", category);
      uploadForm.append("pageNumber", pageNumber.toString());

      const res = await apiFetch("/api/documents/upload", {
        method: "POST",
        body: uploadForm,
      });

      if (!res.ok) return false;

      const data = await res.json();

      // Refresh submission to get updated document list & extractions
      await loadExistingSubmission(currentSubId);
      return true;
    } catch (e) {
      console.error("Upload error:", e);
      return false;
    }
  };

  // Handle Document Delete
  const handleDocumentDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await apiFetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (res.ok && submissionId) {
        await loadExistingSubmission(submissionId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Proceed from Step 1 to Step 2
  const handleStep1Next = async () => {
    const id = await saveDraft(2);
    if (id) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Proceed from Step 2 to Step 3 (Reconciliation)
  const handleStep2Next = async () => {
    if (formData.documents.length === 0) {
      if (!confirm("No documents have been uploaded yet. Do you want to proceed anyway?")) {
        return;
      }
    }
    if (submissionId) {
      await loadExistingSubmission(submissionId);
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Proceed from Step 3 to Step 4 (Final Review)
  const handleStep3Next = async () => {
    await saveDraft(4);
    setStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Final Level 1 Submit
  const handleFinalSubmit = async () => {
    if (!submissionId) return;
    setLoading(true);
    setSubmitError(null);

    try {
      const res = await apiFetch(`/api/submissions/${submissionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Submission failed.");
        setLoading(false);
        return;
      }

      // Success -> Redirect to Success / Backup screen
      router.push(`/field/success/${submissionId}`);
    } catch (e) {
      setSubmitError("Network error during submission. Please retry.");
      setLoading(false);
    }
  };

  const documentCategories = [
    {
      category: "RC",
      title: "1. RC / Vehicle Registration",
      subtitle: "Vehicle Registration Certificate (Smart card or Paper)",
      required: true,
      allowMultiple: false,
    },
    {
      category: "PUC",
      title: "2. PUC Certificate",
      subtitle: "Pollution Under Control testing certificate",
      required: true,
      allowMultiple: false,
    },
    {
      category: "INSURANCE",
      title: "3. Insurance Policy",
      subtitle: "Commercial vehicle insurance schedule (multi-page supported)",
      required: true,
      allowMultiple: true,
    },
    {
      category: "DRIVING_LICENSE",
      title: "4. Driving Licence",
      subtitle: "Driver's valid commercial or heavy transport licence",
      required: true,
      allowMultiple: false,
    },
    {
      category: "AADHAAR",
      title: "5. Aadhaar Card",
      subtitle: "Driver Aadhaar card (Front & Back if needed)",
      required: true,
      allowMultiple: true,
    },
    {
      category: "DRIVER_PHOTO",
      title: "6. Driver Passport Photo",
      subtitle: "Front-facing portrait photograph for pass badge",
      required: true,
      allowMultiple: false,
    },
  ];

  return (
    <div className="max-w-lg mx-auto w-full min-h-screen bg-slate-50 flex flex-col pb-16">
      {/* Step Header */}
      <FieldHeader
        currentStep={step}
        totalSteps={4}
        title="NEW VEHICLE ENTRY"
        subtitle={submissionNo || "Draft Registration"}
        isAutoSaving={isAutoSaving}
      />

      <div className="p-4 flex-1">
        {submitError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 1: BASIC DETAILS                                        */}
        {/* ============================================================ */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 font-medium flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Step 1: Enter vehicle and driver information manually first.</span>
            </div>

            {/* Vehicle Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" />
                Vehicle Details
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vehicle Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g. GJ 10 AB 1234"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold tracking-wider uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vehicle Type <span className="text-rose-600">*</span>
                </label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                >
                  <option value="Truck">Truck (Goods Carrier)</option>
                  <option value="Hydra Crane">Hydra Crane</option>
                  <option value="Tanker">Tanker</option>
                  <option value="Trailer">Trailer</option>
                  <option value="Pickup">Pickup / Bolero Maxi</option>
                  <option value="Dumper">Dumper / Tipper</option>
                  <option value="Car">Car / SUV</option>
                  <option value="Bus">Bus / Staff Tempo</option>
                  <option value="Other">Other Heavy Equipment</option>
                </select>
              </div>
            </div>

            {/* Driver Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                Driver Details
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Driver Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  list="driver-suggestions"
                  value={formData.driverName}
                  onChange={(e) => handleDriverSelect(e.target.value)}
                  placeholder="e.g. Abbas Wani"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
                <datalist id="driver-suggestions">
                  {driverList.map((d) => (
                    <option key={d.id} value={d.name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Driver Mobile <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.driverMobile}
                    onChange={(e) => setFormData({ ...formData, driverMobile: e.target.value })}
                    placeholder="98790 12345"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="text"
                    value={formData.driverDob}
                    onChange={(e) => setFormData({ ...formData, driverDob: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Company & Vendor Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" />
                Company & Vendor Details
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Company Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  list="vendor-suggestions"
                  value={formData.companyName}
                  onChange={(e) => handleVendorSelect(e.target.value)}
                  placeholder="e.g. Patel Logistics & Transport Ltd"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
                <datalist id="vendor-suggestions">
                  {vendorList.map((v) => (
                    <option key={v.id} value={v.companyName} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Designation
                </label>
                <select
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                >
                  <option value="Driver">Driver</option>
                  <option value="Owner">Owner</option>
                  <option value="Manager">Manager</option>
                  <option value="Worker">Worker / Helper</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vendor Representative
                  </label>
                  <input
                    type="text"
                    value={formData.vendorRepresentative}
                    onChange={(e) =>
                      setFormData({ ...formData, vendorRepresentative: e.target.value })
                    }
                    placeholder="Rep Name"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vendor Rep Mobile
                  </label>
                  <input
                    type="tel"
                    value={formData.vendorRepMobile}
                    onChange={(e) =>
                      setFormData({ ...formData, vendorRepMobile: e.target.value })
                    }
                    placeholder="Rep Mobile"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Address Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" />
                Address & Work Area Details
              </h2>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Taluka
                  </label>
                  <input
                    type="text"
                    value={formData.addressTaluka}
                    onChange={(e) => setFormData({ ...formData, addressTaluka: e.target.value })}
                    placeholder="e.g. Lalpur"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={formData.addressDistrict}
                    onChange={(e) =>
                      setFormData({ ...formData, addressDistrict: e.target.value })
                    }
                    placeholder="Jamnagar"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.addressState}
                    onChange={(e) => setFormData({ ...formData, addressState: e.target.value })}
                    placeholder="Gujarat"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.addressPincode}
                    onChange={(e) => setFormData({ ...formData, addressPincode: e.target.value })}
                    placeholder="361140"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Area of Work <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formData.areaOfWork}
                    onChange={(e) => setFormData({ ...formData, areaOfWork: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="RG">RG (Reliance Green)</option>
                    <option value="AF">AF (Area Factory)</option>
                    <option value="R&R">R&R</option>
                    <option value="LC1">LC1</option>
                    <option value="Jetty">Jetty Marine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Validity Required
                  </label>
                  <select
                    value={formData.validityRequired}
                    onChange={(e) =>
                      setFormData({ ...formData, validityRequired: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                  >
                    <option value="1 Month">1 Month</option>
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="1 Year">1 Year</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleStep1Next}
              disabled={isAutoSaving}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <span>Continue to Photograph Documents</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: DOCUMENT CAPTURE / UPLOAD                            */}
        {/* ============================================================ */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Step 2: Photograph or upload the 6 vehicle & driver documents.</span>
            </div>

            {/* Document Upload Cards */}
            <div className="space-y-3">
              {documentCategories.map((cat) => (
                <DocumentUploadCard
                  key={cat.category}
                  category={cat.category}
                  title={cat.title}
                  subtitle={cat.subtitle}
                  required={cat.required}
                  allowMultiple={cat.allowMultiple}
                  documents={formData.documents}
                  onUpload={handleDocumentUpload}
                  onDelete={handleDocumentDelete}
                  onViewDoc={(docId) => setViewingDocId(docId)}
                />
              ))}
            </div>

            {/* Bottom Nav */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-navy-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Details</span>
              </button>

              <button
                type="button"
                onClick={handleStep2Next}
                className="py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Check & Verify</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: RECONCILIATION & COMPARISON (LEVEL 1 VERIFICATION)   */}
        {/* ============================================================ */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-950 font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-900">Level 1 Verification:</strong>
                Compare the information you entered manually against the information detected from the document photos. You can edit any field before submitting.
              </div>
            </div>

            {/* Reconciliation Comparison Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                Field vs Document Comparison
              </h2>

              <div className="space-y-3">
                {reconciliation?.fields?.map((f: any) => (
                  <div
                    key={f.fieldName}
                    className={`p-3 rounded-xl border transition-all ${
                      f.status === "MISMATCH"
                        ? "border-amber-300 bg-amber-50/50"
                        : f.status === "MATCH"
                        ? "border-emerald-200 bg-emerald-50/30"
                        : "border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-700">{f.fieldLabel}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          f.status === "MATCH"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : f.status === "MISMATCH"
                            ? "bg-amber-100 text-amber-900 border-amber-300"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {f.status === "MATCH"
                          ? "✓ MATCH"
                          : f.status === "MISMATCH"
                          ? "⚠ MISMATCH"
                          : "INFO"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          Entered by you:
                        </span>
                        <input
                          type="text"
                          value={(formData as any)[f.fieldName] || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, [f.fieldName]: e.target.value })
                          }
                          className="w-full font-bold text-navy-900 bg-white px-2 py-1 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          Detected from {f.sourceCategory}:
                        </span>
                        <div className="font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200 text-xs truncate">
                          {f.aiValue || "Not detected"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Nav */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-navy-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Photos</span>
              </button>

              <button
                type="button"
                onClick={handleStep3Next}
                className="py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Final Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 4: FINAL REVIEW & SUBMISSION                            */}
        {/* ============================================================ */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Step 4: Please review all details and confirm to submit.</span>
            </div>

            {/* Summary Review Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                Submission Summary
              </h2>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Vehicle Number</span>
                  <span className="font-bold text-navy-900">{formData.vehicleNumber}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Vehicle Type</span>
                  <span className="font-semibold text-slate-800">{formData.vehicleType}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Driver Name</span>
                  <span className="font-bold text-navy-900">{formData.driverName}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Driver Mobile</span>
                  <span className="font-semibold text-slate-800">{formData.driverMobile || "-"}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Company Name</span>
                  <span className="font-bold text-navy-900">{formData.companyName}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Designation</span>
                  <span className="font-semibold text-slate-800">{formData.designation}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Area of Work</span>
                  <span className="font-bold text-blue-700">{formData.areaOfWork}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500 font-medium">Validity Required</span>
                  <span className="font-semibold text-slate-800">{formData.validityRequired}</span>
                </div>
              </div>
            </div>

            {/* Document Thumbnails Preview */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
              <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                Attached Photographs ({formData.documents.length})
              </h2>

              <div className="grid grid-cols-3 gap-2">
                {formData.documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setViewingDocId(doc.id)}
                    className="cursor-pointer group relative rounded-lg border border-slate-200 overflow-hidden bg-slate-100 aspect-[3/4]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/documents/${doc.id}`}
                      alt={doc.category}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-navy-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                    <span className="absolute bottom-0 left-0 right-0 bg-navy-900/90 text-white text-[9px] font-bold text-center py-0.5">
                      {doc.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Nav */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-navy-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Verify</span>
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={loading}
                className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>CONFIRM & SUBMIT</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full Document Viewer Modal */}
      {viewingDocId && (
        <div className="fixed inset-0 z-50 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-700 animate-in fade-in">
            <div className="p-3 bg-slate-800 flex justify-between items-center text-white border-b border-slate-700">
              <span className="text-xs font-bold">Document Preview</span>
              <button
                onClick={() => setViewingDocId(null)}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs"
              >
                Close ✕
              </button>
            </div>
            <div className="p-2">
              <DocumentViewer
                documents={formData.documents as DocumentItem[]}
                currentCategory={
                  formData.documents.find((d) => d.id === viewingDocId)?.category || "ALL"
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
