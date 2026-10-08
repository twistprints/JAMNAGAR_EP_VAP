import React from "react";
import Link from "next/link";
import { LucideIcon, ArrowRight } from "lucide-react";

export interface StatCardProps {
  title: string;
  count: number | string;
  icon: LucideIcon;
  color: "blue" | "amber" | "emerald" | "slate" | "rose" | "indigo";
  subtitle?: string;
  href?: string;
  urgent?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  count,
  icon: Icon,
  color,
  subtitle,
  href,
  urgent = false,
}) => {
  const colorSchemes = {
    blue: {
      bg: "bg-blue-50 border-blue-200 text-blue-900",
      iconBg: "bg-blue-600 text-white",
      badge: "bg-blue-100 text-blue-800",
    },
    amber: {
      bg: "bg-amber-50 border-amber-300 text-amber-950 ring-1 ring-amber-400/50",
      iconBg: "bg-amber-600 text-white",
      badge: "bg-amber-100 text-amber-900",
    },
    emerald: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-950",
      iconBg: "bg-emerald-600 text-white",
      badge: "bg-emerald-100 text-emerald-800",
    },
    slate: {
      bg: "bg-slate-50 border-slate-200 text-slate-900",
      iconBg: "bg-slate-700 text-white",
      badge: "bg-slate-100 text-slate-700",
    },
    rose: {
      bg: "bg-rose-50 border-rose-200 text-rose-950",
      iconBg: "bg-rose-600 text-white",
      badge: "bg-rose-100 text-rose-800",
    },
    indigo: {
      bg: "bg-indigo-50 border-indigo-200 text-indigo-950",
      iconBg: "bg-indigo-600 text-white",
      badge: "bg-indigo-100 text-indigo-800",
    },
  };

  const scheme = colorSchemes[color];

  const content = (
    <div
      className={`p-5 rounded-xl border shadow-sm transition-all hover:shadow-md ${scheme.bg} ${
        urgent ? "animate-pulse" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            {title}
          </p>
          <div className="text-3xl font-extrabold mt-1 tracking-tight text-navy-900">
            {count}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${scheme.iconBg}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {href && (
        <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-blue-700 hover:text-blue-900">
          <span>View records</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
};
