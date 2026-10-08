"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Search,
  Phone,
  Calendar,
  CreditCard,
  MapPin,
  RefreshCw,
  UserCheck,
} from "lucide-react";

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/drivers");
      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = drivers.filter((d) => {
    const q = searchTerm.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.mobile && d.mobile.includes(q)) ||
      (d.licenseNumber && d.licenseNumber.toLowerCase().includes(q)) ||
      (d.aadhaarNumber && d.aadhaarNumber.includes(q))
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Driver Registry</span>
          </div>
          <h1 className="text-xl font-black text-navy-900">
            Reusable Driver Database
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified driver records automatically auto-fill new vehicle submissions
          </p>
        </div>

        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search driver name, license, mobile..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading driver database...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-xs">
          No drivers found in registry.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((driver) => (
            <div
              key={driver.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm shadow-inner">
                  {driver.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-navy-900 text-sm">{driver.name}</h3>
                  <span className="text-xs text-slate-500 font-mono">
                    {driver.mobile || "No mobile"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                {driver.licenseNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Licence No:</span>
                    <span className="font-mono font-semibold text-slate-800">{driver.licenseNumber}</span>
                  </div>
                )}
                {driver.aadhaarNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Aadhaar:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {driver.aadhaarNumber.length > 8
                        ? `XXXX XXXX ${driver.aadhaarNumber.slice(-4)}`
                        : driver.aadhaarNumber}
                    </span>
                  </div>
                )}
                {driver.dob && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">DOB:</span>
                    <span className="font-semibold text-slate-800">{driver.dob}</span>
                  </div>
                )}
                {driver.addressDistrict && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">District:</span>
                    <span className="font-semibold text-slate-800">{driver.addressDistrict}, {driver.addressState}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
