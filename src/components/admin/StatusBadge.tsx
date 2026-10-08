import React from "react";

export interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  const getStatusConfig = () => {
    switch (status) {
      case "APPROVED":
        return {
          label: "Approved",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
        };
      case "ADMIN_REVIEW":
        return {
          label: "Pending Review",
          bg: "bg-amber-50 text-amber-800 border-amber-300",
          dot: "bg-amber-500",
        };
      case "SUBMITTED":
        return {
          label: "Submitted",
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          dot: "bg-blue-500",
        };
      case "READY_FOR_FIELD_VERIFICATION":
        return {
          label: "Ready for Review",
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          dot: "bg-indigo-500",
        };
      case "DRAFT":
      case "DOCUMENTS_PENDING":
        return {
          label: "Incomplete Draft",
          bg: "bg-slate-100 text-slate-700 border-slate-300",
          dot: "bg-slate-400",
        };
      case "ADMIN_CORRECTION_REQUIRED":
        return {
          label: "Correction Required",
          bg: "bg-orange-50 text-orange-700 border-orange-300",
          dot: "bg-orange-500",
        };
      case "REJECTED":
        return {
          label: "Rejected",
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          dot: "bg-rose-500",
        };
      case "EXPORTED":
        return {
          label: "Exported",
          bg: "bg-teal-50 text-teal-700 border-teal-200",
          dot: "bg-teal-500",
        };
      default:
        return {
          label: status,
          bg: "bg-gray-100 text-gray-700 border-gray-200",
          dot: "bg-gray-400",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${sizeClasses[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
