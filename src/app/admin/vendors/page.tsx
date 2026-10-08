"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Search,
  Phone,
  User,
  RefreshCw,
} from "lucide-react";

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vendors");
      if (res.ok) {
        const data = await res.json();
        setVendors(data.vendors || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = vendors.filter((v) => {
    const q = searchTerm.toLowerCase();
    return (
      v.companyName.toLowerCase().includes(q) ||
      (v.vendorRepresentative && v.vendorRepresentative.toLowerCase().includes(q)) ||
      (v.representativeMobile && v.representativeMobile.includes(q))
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Vendors & Contractors</span>
          </div>
          <h1 className="text-xl font-black text-navy-900">
            Vendor Directory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered transport contractors, logistics companies, and their representative contacts
          </p>
        </div>

        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search vendor name, rep..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading vendor directory...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-xs">
          No vendors found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-sm shadow-inner">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-navy-900 text-sm leading-snug">
                    {vendor.companyName}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Registered Vendor
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Representative:</span>
                  <span className="font-semibold text-slate-800">
                    {vendor.vendorRepresentative || "Not listed"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rep Mobile:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {vendor.representativeMobile || "Not listed"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
