"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock, Shield, HelpCircle } from "lucide-react";

export interface FieldHeaderProps {
  currentStep?: number;
  totalSteps?: number;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  isAutoSaving?: boolean;
}

export const FieldHeader: React.FC<FieldHeaderProps> = ({
  currentStep = 1,
  totalSteps = 4,
  title = "JAMNAGAR PASS",
  subtitle = "Vehicle & Driver Registration",
  showBack = true,
  backHref = "/field",
  isAutoSaving = false,
}) => {
  const steps = [
    { num: 1, label: "Details" },
    { num: 2, label: "Documents" },
    { num: 3, label: "Review" },
    { num: 4, label: "Submit" },
  ];

  return (
    <div className="bg-navy-900 text-white shadow-md border-b border-navy-800">
      {/* Top Banner */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <Link
              href={backHref}
              className="p-1.5 rounded-lg bg-navy-800 text-blue-200 hover:text-white hover:bg-navy-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-tight">
              {title}
            </h1>
            <p className="text-xs text-blue-200 font-medium">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Autosave badge & Help */}
        <div className="flex items-center gap-2">
          {isAutoSaving ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-900/80 text-[11px] text-blue-200 border border-blue-500/30 animate-pulse">
              <Clock className="w-3 h-3" /> Saving...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-[11px] text-emerald-300 border border-emerald-500/30">
              <CheckCircle className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* 4-Step Progress Indicator */}
      {currentStep > 0 && (
        <div className="px-4 py-2.5 bg-navy-950 border-t border-navy-800/80">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {steps.map((step, idx) => {
              const isDone = currentStep > step.num;
              const isCurrent = currentStep === step.num;

              return (
                <React.Fragment key={step.num}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isDone
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                          ? "bg-blue-600 text-white ring-4 ring-blue-500/30"
                          : "bg-navy-800 text-slate-400 border border-navy-700"
                      }`}
                    >
                      {isDone ? <CheckCircle className="w-4 h-4" /> : step.num}
                    </div>
                    <span
                      className={`text-[10px] mt-1 font-medium ${
                        isCurrent ? "text-blue-300 font-bold" : isDone ? "text-emerald-400" : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {idx < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 rounded ${
                        currentStep > step.num ? "bg-emerald-500" : "bg-navy-800"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
