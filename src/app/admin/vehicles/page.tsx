"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Search,
  Truck,
  FileArchive,
  Download,
  ExternalLink,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vehicles");
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = vehicles.filter((v) => {
    const q = searchTerm.toLowerCase();
    return (
      v.vehicleNumber.toLowerCase().includes(q) ||
      v.normalizedVehicleNumber.toLowerCase().includes(q) ||
      (v.manufacturer && v.manufacturer.toLowerCase().includes(q)) ||
      (v.model && v.model.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Archive className="w-4 h-4" />
            <span>Master Repository</span>
          </div>
          <h1 className="text-xl font-black text-navy-900">
            Vehicle Document Archive
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Normalized vehicle database, historical submissions, and full document backups
          </p>
        </div>

        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search vehicle number, make..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Vehicles Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading vehicle archive...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl text-center text-slate-400 text-xs">
          No vehicles recorded in archive.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((vehicle) => {
            const latestSub = vehicle.submissions?.[0];

            return (
              <div
                key={vehicle.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-base font-extrabold text-navy-900 tracking-wide font-mono">
                        {vehicle.vehicleNumber}
                      </span>
                      <span className="block text-xs font-semibold text-blue-700 mt-0.5">
                        {vehicle.vehicleType}
                      </span>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-mono font-bold text-slate-600 border border-slate-200">
                      {vehicle.normalizedVehicleNumber}
                    </span>
                  </div>

                  <div className="mt-3 text-xs space-y-1 text-slate-600">
                    {vehicle.manufacturer && (
                      <p>Make: <strong className="text-slate-800">{vehicle.manufacturer} {vehicle.model}</strong></p>
                    )}
                    {vehicle.insuranceValidity && (
                      <p>Insurance Valid: <strong className="text-slate-800">{vehicle.insuranceValidity}</strong></p>
                    )}
                    {vehicle.pucValidity && (
                      <p>PUC Valid: <strong className="text-slate-800">{vehicle.pucValidity}</strong></p>
                    )}
                  </div>

                  {latestSub && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Latest Pass</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-semibold text-slate-800">{latestSub.driverName}</span>
                        <StatusBadge status={latestSub.status} size="sm" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  {latestSub && (
                    <>
                      <Link
                        href={`/admin/verify/${latestSub.id}`}
                        className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-navy-900 text-xs font-bold rounded-xl text-center transition-colors"
                      >
                        View Pass
                      </Link>

                      <a
                        href={`/api/submissions/${latestSub.id}/backup`}
                        download
                        title="Download Complete Vehicle ZIP"
                        className="py-2 px-3 bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-300" />
                        <span>ZIP Backup</span>
                      </a>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
