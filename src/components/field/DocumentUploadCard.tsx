"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Camera,
  Upload,
  CheckCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  Plus,
  Eye,
  FileCheck,
  Sparkles,
} from "lucide-react";
import { optimizeImageForUpload, OptimizationResult } from "@/lib/imageOptimizer";

export interface DocumentUploadCardProps {
  category: string;
  title: string;
  subtitle: string;
  required?: boolean;
  allowMultiple?: boolean;
  documents: Array<{
    id: string;
    category: string;
    fileName: string;
    pageNumber?: number;
  }>;
  onUpload: (category: string, file: File, pageNumber: number) => Promise<boolean>;
  onDelete: (documentId: string) => Promise<void>;
  onViewDoc?: (documentId: string) => void;
  extractionSummary?: string;
  extractionSource?: string;
  hasMismatch?: boolean;
}

type UploadStep = "idle" | "optimizing" | "uploading" | "ai_processing" | "done" | "error";

export const DocumentUploadCard: React.FC<DocumentUploadCardProps> = ({
  category,
  title,
  subtitle,
  required = true,
  allowMultiple = false,
  documents = [],
  onUpload,
  onDelete,
  onViewDoc,
  extractionSummary,
  extractionSource,
  hasMismatch = false,
}) => {
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Cached file for quick retries without re-taking photos
  const cachedFileRef = useRef<File | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const catDocs = documents.filter((d) => d.category.toUpperCase() === category.toUpperCase());
  const isUploaded = catDocs.length > 0;

  // Process and upload a file with sequential mobile-safe optimization
  const processAndUploadFile = async (rawFile: File) => {
    cachedFileRef.current = rawFile;
    setUploadError(null);

    let fileToUpload = rawFile;

    // Step 1: Optimize if it's an image
    if (rawFile.type.startsWith("image/")) {
      try {
        setUploadStep("optimizing");
        const origSizeMb = (rawFile.size / (1024 * 1024)).toFixed(1);
        setUploadProgressMsg(`Optimizing photo (${origSizeMb}MB)...`);

        const result: OptimizationResult = await optimizeImageForUpload(rawFile, {
          maxDimension: 2400,
          quality: 0.82,
          maxFileSizeMB: 2.5,
        });

        fileToUpload = result.file;
        const optSizeMb = (fileToUpload.size / (1024 * 1024)).toFixed(1);
        setUploadProgressMsg(`Ready (${optSizeMb}MB). Uploading...`);
      } catch (optErr: any) {
        console.warn("Client optimization fallback:", optErr);
        // If optimization threw because of corrupt image or unsupported format, show helpful error
        if (optErr?.message?.includes("HEIC")) {
          setUploadStep("error");
          setUploadError(optErr.message);
          return;
        }
        // Otherwise attempt upload with original file as fallback
        fileToUpload = rawFile;
      }
    }

    // Step 2: Upload to server
    try {
      setUploadStep("uploading");
      setUploadProgressMsg("Uploading to server...");

      const nextPage = catDocs.length + 1;
      const success = await onUpload(category, fileToUpload, nextPage);

      if (!success) {
        setUploadStep("error");
        setUploadError("Upload failed. Please check network and retry.");
        return;
      }

      setUploadStep("done");
      setUploadProgressMsg("Uploaded & Saved ✓");
      // Clear cache on success
      cachedFileRef.current = null;
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadStep("error");
      setUploadError(err?.message || "Upload failed. Please retry.");
    } finally {
      // Revert from 'done' back to 'idle' after 2 seconds
      setTimeout(() => {
        setUploadStep((curr) => (curr === "done" ? "idle" : curr));
        setUploadProgressMsg("");
      }, 2500);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await processAndUploadFile(file);

    // Reset file input so same file can be re-selected if needed
    if (e.target) e.target.value = "";
  };

  const handleRetry = async () => {
    if (cachedFileRef.current) {
      await processAndUploadFile(cachedFileRef.current);
    } else {
      // Prompt user to pick/take again
      galleryInputRef.current?.click();
    }
  };

  const isBusy = uploadStep === "optimizing" || uploadStep === "uploading" || uploadStep === "ai_processing";

  return (
    <div
      className={`bg-white rounded-xl border p-4 shadow-sm transition-all ${
        hasMismatch
          ? "border-amber-400 ring-1 ring-amber-400 bg-amber-50/20"
          : isUploaded
          ? "border-emerald-300 bg-emerald-50/10"
          : "border-slate-200"
      }`}
    >
      {/* Hidden file inputs for Camera and Gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Card Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-navy-900">{title}</h3>
            {required && (
              <span className="text-[10px] uppercase font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                Required
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Upload Status Badge */}
        <div>
          {uploadStep === "optimizing" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin text-amber-600" /> Optimizing...
            </span>
          ) : uploadStep === "uploading" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin text-blue-600" /> Uploading...
            </span>
          ) : uploadStep === "done" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Saved ✓
            </span>
          ) : isUploaded ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              {catDocs.length > 1 ? `${catDocs.length} Pages` : "Uploaded"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
              Pending
            </span>
          )}
        </div>
      </div>

      {/* Real-time Progress Bar / Step Notification */}
      {isBusy && (
        <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="font-semibold">{uploadProgressMsg}</span>
          </div>
          <span className="text-[10px] text-blue-600 font-mono">Mobile-Safe Pipeline</span>
        </div>
      )}

      {/* Uploaded Documents Thumbnails */}
      {isUploaded && (
        <div className="mb-3 space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            {catDocs.map((doc, idx) => (
              <div
                key={doc.id}
                className="relative group w-20 h-24 rounded-lg border border-slate-300 bg-slate-100 overflow-hidden shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/documents/${doc.id}`}
                  alt={`${category} ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-navy-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => onViewDoc && onViewDoc(doc.id)}
                    className="p-1 rounded bg-white text-navy-900 hover:bg-slate-200"
                    title="View"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(doc.id)}
                    className="p-1 rounded bg-rose-600 text-white hover:bg-rose-700"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {catDocs.length > 1 && (
                  <span className="absolute bottom-0 left-0 right-0 bg-navy-900/80 text-white text-[9px] text-center font-mono py-0.5">
                    Page {idx + 1}
                  </span>
                )}
              </div>
            ))}

            {/* Add another page button for multi-page documents (e.g. Insurance) */}
            {allowMultiple && (
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isBusy}
                className="w-20 h-24 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-100 text-blue-700 flex flex-col items-center justify-center text-xs font-semibold gap-1 transition-colors disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
                <span className="text-[10px]">Add Page</span>
              </button>
            )}
          </div>

          {/* AI Extracted feedback pill */}
          {extractionSource === "GEMINI_VISION" ? (
            <div className="flex items-center justify-between gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-medium truncate">
                  {extractionSummary || "Document verified with AI"}
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 font-mono text-[10px] font-bold whitespace-nowrap">
                source: GEMINI_VISION
              </span>
            </div>
          ) : extractionSource === "AI EXTRACTION UNAVAILABLE" ? (
            <div className="flex items-center justify-between gap-1.5 text-xs text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="font-medium truncate">
                  AI EXTRACTION UNAVAILABLE
                </span>
              </div>
              <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-mono">
                Preserved Original Photo
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <FileCheck className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="font-medium">
                {extractionSummary || "Document uploaded & stored safely."}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error state with quick 1-click RETRY */}
      {uploadError && (
        <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span className="font-medium break-words">{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isBusy}
            className="flex-shrink-0 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold shadow-sm transition-colors"
          >
            Retry Upload
          </button>
        </div>
      )}

      {/* Action Buttons: Take Photo & Upload from Gallery */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isBusy}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
        >
          <Camera className="w-4 h-4" />
          <span>{isUploaded ? "Retake Photo" : "Take Photo"}</span>
        </button>

        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={isBusy}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-navy-900 border border-slate-300 font-semibold text-xs transition-colors disabled:opacity-50"
        >
          <Upload className="w-4 h-4 text-slate-600" />
          <span>Gallery / File</span>
        </button>
      </div>
    </div>
  );
};
