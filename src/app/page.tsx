"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Truck, ArrowRight, UserCheck, Lock, ChevronRight } from "lucide-react";

export default function LandingPortalSelectorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-between text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xs font-black tracking-widest text-blue-400 uppercase block font-mono">
                ENSEMBLE LOGISTICS
              </span>
              <h1 className="text-base font-bold text-white tracking-tight leading-none">
                Jamnagar Pass Management
              </h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 font-mono">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Official Event Security Portal</span>
          </div>
        </div>
      </header>

      {/* Hero & Dual Portal Cards */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
          <span>EP (Entry Pass) & VAP (Vehicle Access Pass) System</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight max-w-3xl leading-tight sm:leading-tight mb-4">
          JAMNAGAR PASS MANAGEMENT
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mb-12">
          Select your authorized access portal to begin document capture, automated verification, or master pass approvals.
        </p>

        {/* The Two Portals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full max-w-3xl">
          {/* 1. ADMIN LOGIN CARD */}
          <Link
            href="/admin/login"
            className="group relative bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/80 hover:border-blue-500/60 rounded-3xl p-8 sm:p-10 text-left transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-blue-900/20 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-bl-full pointer-events-none group-hover:bg-blue-600/20 transition-all" />
            <div>
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600 transition-all">
                <ShieldCheck className="w-7 h-7 text-blue-400 group-hover:text-white transition-colors" />
              </div>
              <span className="text-xs font-mono font-bold tracking-wider text-blue-400 uppercase block mb-1">
                Executive & Governance
              </span>
              <h3 className="text-2xl font-black text-white mb-2 group-hover:text-blue-300 transition-colors">
                ADMIN LOGIN
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                For administrators and supervisors. Review submissions, approve passes, manage users, and export master EP/VAP registers.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between text-sm font-bold text-blue-400 group-hover:text-white transition-colors">
              <span>Enter Admin Portal</span>
              <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-blue-600 flex items-center justify-center transition-all">
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-white" />
              </div>
            </div>
          </Link>

          {/* 2. USER LOGIN CARD */}
          <Link
            href="/user/login"
            className="group relative bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/80 hover:border-emerald-500/60 rounded-3xl p-8 sm:p-10 text-left transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-900/20 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 rounded-bl-full pointer-events-none group-hover:bg-emerald-600/20 transition-all" />
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-600 transition-all">
                <UserCheck className="w-7 h-7 text-emerald-400 group-hover:text-white transition-colors" />
              </div>
              <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase block mb-1">
                Field & Operations
              </span>
              <h3 className="text-2xl font-black text-white mb-2 group-hover:text-emerald-300 transition-colors">
                USER LOGIN
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                For field, godown, and data verification officers. Capture Aadhaar, RC, Insurance & DL documents with live AI extraction.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between text-sm font-bold text-emerald-400 group-hover:text-white transition-colors">
              <span>Enter Field Portal</span>
              <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-emerald-600 flex items-center justify-center transition-all">
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-white" />
              </div>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; 2026 Ensemble Logistics Pass Management. All rights reserved.</span>
          <span className="font-mono text-slate-600">Jamnagar Event Access & Verification Pipeline</span>
        </div>
      </footer>
    </div>
  );
}
