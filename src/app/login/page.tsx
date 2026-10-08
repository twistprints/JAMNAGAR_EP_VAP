"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Truck, Shield, Lock, Eye, EyeOff, AlertCircle, ArrowRight, User } from "lucide-react";
import { setStoredSession } from "@/lib/apiClient";

function LoginForm() {
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
      setError("Please enter both Login ID and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: loginId.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid Login ID or password.");
        setLoading(false);
        return;
      }

      // Successful authentication -> Store session and route
      if (data.token && data.user) {
        setStoredSession(data.token, data.user);
      }

      const destination = redirectUrl || data.redirectTo || (data.user?.role === "ADMIN" ? "/admin" : "/field");
      window.location.href = destination;
    } catch (err: any) {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Top Header Branding */}
        <div className="bg-slate-900 px-8 py-8 text-white text-center relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-600/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -top-8 w-32 h-32 bg-emerald-600/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-xl mb-4 border border-blue-400/30">
            <Truck className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-xl font-black tracking-tight text-white uppercase font-sans">
            JAMNAGAR PASS MANAGEMENT
          </h1>
          <p className="text-xs text-blue-200/90 mt-1 font-medium">
            Reliance Green • Entry Pass (EP) &amp; Vehicle Pass (VAP)
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Authorized Personnel Only</span>
          </div>
        </div>

        {/* Login Form Body */}
        <div className="p-8">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5 shadow-sm animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Login ID / Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="Enter your Login ID or email"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Access is restricted to authorized field verification officers and administrators. Accounts are provisioned by system administration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-950">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
