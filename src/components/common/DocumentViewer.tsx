"use client";

import React, { useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  RefreshCw,
  Maximize,
} from "lucide-react";

export interface DocumentItem {
  id: string;
  category: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  pageNumber?: number;
  filePath?: string;
}

export interface DocumentViewerProps {
  documents: DocumentItem[];
  currentCategory?: string;
  onSelectDocument?: (doc: DocumentItem) => void;
  className?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documents,
  currentCategory,
  onSelectDocument,
  className = "",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filter documents by category if provided, otherwise all
  const filteredDocs = currentCategory && currentCategory !== "ALL"
    ? documents.filter((d) => d.category.toUpperCase() === currentCategory.toUpperCase())
    : documents;

  // Safe index
  const safeIndex = Math.min(currentIndex, Math.max(0, filteredDocs.length - 1));
  const activeDoc = filteredDocs[safeIndex];

  const handleZoomIn = () => setZoom((z) => Math.min(3.5, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, z - 0.25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handlePrev = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
      setZoom(1);
      setRotation(0);
    }
  };

  const handleNext = () => {
    if (safeIndex < filteredDocs.length - 1) {
      setCurrentIndex(safeIndex + 1);
      setZoom(1);
      setRotation(0);
    }
  };

  if (!activeDoc || filteredDocs.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-slate-100 rounded-xl border border-slate-200 text-slate-500 min-h-[420px] ${className}`}>
        <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-3 text-slate-400">
          <FileText className="w-8 h-8" />
        </div>
        <p className="font-semibold text-slate-700 text-base">No document available</p>
        <p className="text-xs text-slate-500 mt-1 text-center max-w-xs">
          No uploaded photograph for category {currentCategory || "selected"}.
        </p>
      </div>
    );
  }

  const imageUrl = `/api/documents/${activeDoc.id}`;

  return (
    <div
      className={`flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-xl transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""
      } ${className}`}
    >
      {/* Viewer Toolbar */}
      <div className="bg-slate-800/90 backdrop-blur px-4 py-2.5 border-b border-slate-700 flex items-center justify-between gap-2 text-white text-xs select-none">
        {/* Left: Document Info & Page counter */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-blue-600 font-semibold text-[11px] tracking-wide">
            {activeDoc.category}
          </span>
          <span className="text-slate-300 truncate max-w-[140px] sm:max-w-xs font-mono">
            {activeDoc.fileName}
          </span>
          {filteredDocs.length > 1 && (
            <span className="text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full text-[11px]">
              Page {safeIndex + 1} / {filteredDocs.length}
            </span>
          )}
        </div>

        {/* Center/Right: Interactive Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={handleZoomOut}
            title="Zoom Out (-)"
            className="p-1.5 hover:bg-slate-700 rounded text-slate-200 hover:text-white transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-slate-300 font-mono w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            title="Zoom In (+)"
            className="p-1.5 hover:bg-slate-700 rounded text-slate-200 hover:text-white transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-700 mx-1" />
          <button
            onClick={handleRotate}
            title="Rotate Clockwise (90°)"
            className="p-1.5 hover:bg-slate-700 rounded text-slate-200 hover:text-white transition-colors flex items-center gap-1"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            title="Reset Fit"
            className="px-2 py-1 hover:bg-slate-700 rounded text-[11px] text-slate-300 hover:text-white transition-colors"
          >
            Fit
          </button>
          <div className="w-[1px] h-4 bg-slate-700 mx-1" />
          <a
            href={imageUrl}
            download={activeDoc.fileName}
            title="Download Original"
            className="p-1.5 hover:bg-slate-700 rounded text-slate-200 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-200 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Image Canvas Viewport */}
      <div className="relative flex-1 flex items-center justify-center bg-slate-950 overflow-auto p-4 min-h-[460px] max-h-[620px] select-none">
        {/* Navigation arrows for multi-page */}
        {filteredDocs.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              disabled={safeIndex === 0}
              className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-800/80 text-white hover:bg-blue-600 transition-all shadow-lg ${
                safeIndex === 0 ? "opacity-30 cursor-not-allowed" : "opacity-90 hover:scale-110"
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              disabled={safeIndex === filteredDocs.length - 1}
              className={`absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-slate-800/80 text-white hover:bg-blue-600 transition-all shadow-lg ${
                safeIndex === filteredDocs.length - 1 ? "opacity-30 cursor-not-allowed" : "opacity-90 hover:scale-110"
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* The Document Image */}
        <div
          className="transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={activeDoc.fileName}
            className="max-h-[520px] w-auto object-contain rounded shadow-2xl border border-slate-800 bg-white"
            loading="eager"
          />
        </div>
      </div>

      {/* Multi-page Thumbnail Strip (if multiple pages exist) */}
      {filteredDocs.length > 1 && (
        <div className="bg-slate-900/95 px-3 py-2 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] text-slate-400 whitespace-nowrap pl-1 font-semibold">
            Pages ({filteredDocs.length}):
          </span>
          {filteredDocs.map((doc, idx) => (
            <button
              key={doc.id}
              onClick={() => {
                setCurrentIndex(idx);
                setZoom(1);
                setRotation(0);
                if (onSelectDocument) onSelectDocument(doc);
              }}
              className={`relative flex-shrink-0 w-12 h-14 rounded border overflow-hidden transition-all ${
                safeIndex === idx
                  ? "border-blue-500 ring-2 ring-blue-500/50 scale-105"
                  : "border-slate-700 opacity-60 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/documents/${doc.id}`}
                alt={`Page ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 right-0 bg-slate-900/80 text-[9px] text-white px-1 font-mono">
                {idx + 1}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
