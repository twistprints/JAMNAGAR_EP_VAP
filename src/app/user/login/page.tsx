"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UserCheck, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft, Smartphone, ShieldCheck } from "lucide-react";
import { setStoredSession } from "@/lib/apiClient";

function UserLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "";

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!loginId.trim() || !password) {
      setError("Please enter your Login ID / Email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: loginId.trim(),
          password,
          portalType: "FIELD_USER",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed.");
        setLoading(false);
        return;
      }

      // Successful authentication -> Store session and route to field portal
      if (data.token && data.user) {
        setStoredSession(data.token, data.user);
      }

      const destination = redirectUrl || "/field";
      window.location.href = destination;
    } catch (err: any) {
      setError("Network error. Please check your internet connection.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-900 text-slate-100 p-4 sm:p-6">
      {/* Top back navigation */}
      <div className="max-w-md w-full mx-auto pt-2 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Portal Selector</span>
        </Link>
        <span className="text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-bold">
          FIELD & OPERATIONS
        </span>
      </div>

      {/* Main User Login Card (Mobile-First, Large Touch Targets) */}
      <div className="max-w-md w-full mx-auto my-auto bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Branding */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-8 py-8 text-white text-center relative">
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md shadow-lg mb-3 border border-white/30">
            <UserCheck className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
            User Login
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1 font-medium">
            Field Verification & Document Capture
          </p>
        </div>

        {/* Form */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-red-700 leading-snug font-semibold">
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Login ID / Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Login ID / Email Address
              </label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="e.g. officer@jamnagar.gov.in"
                disabled={loading}
                autoComplete="username"
                autoFocus
                className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-base focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={loading}
                  autoComplete="current-password"
                  className="w-full px-4 py-4 pr-12 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-base focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Large Mobile-Friendly Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-base font-black rounded-2xl shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/40 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-6 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Logging In...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Field User</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Notice & Admin Switch Link */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Field officer credentials are provided by your System Administrator.
            </p>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Are you an Administrator? Open Admin Login &rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 font-medium py-3">
        Jamnagar Pass Management System • Field Operations
      </div>
    </div>
  );
}

export default function UserLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }
    >
      <UserLoginForm />
    </Suspense>
  );
}
