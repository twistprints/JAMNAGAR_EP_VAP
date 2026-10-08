"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Shield, Truck, LogOut, User, Menu, X, ArrowLeft, RefreshCw } from "lucide-react";

export const Header: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch (e) {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const role = currentUser?.role;
      await fetch("/api/auth/logout", { method: "POST" });
      if (role === "ADMIN" || pathname.startsWith("/admin")) {
        window.location.href = "/admin/login";
      } else {
        window.location.href = "/user/login";
      }
    } catch (e) {
      console.error(e);
      window.location.href = "/";
    }
  };

  const isAdminPage = pathname.startsWith("/admin");
  const isFieldPage = pathname.startsWith("/field");

  return (
    <header className="bg-navy-900 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <Link href={currentUser?.role === "ADMIN" ? "/admin" : "/field"} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-inner group-hover:bg-blue-500 transition-colors">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-bold text-base leading-tight tracking-wide text-white">
                  JAMNAGAR PASS
                </div>
                <div className="text-xs text-blue-200 uppercase tracking-wider font-semibold">
                  EP & VAP Management
                </div>
              </div>
            </Link>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-2">
            {currentUser?.role === "ADMIN" && (
              <>
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname === "/admin"
                      ? "bg-blue-700 text-white"
                      : "text-blue-100 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/submissions"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin/submissions")
                      ? "bg-blue-700 text-white"
                      : "text-blue-100 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  Submissions
                </Link>
                <Link
                  href="/admin/manual-entry"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin/manual-entry")
                      ? "bg-blue-700 text-white"
                      : "text-blue-100 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  + Manual / WhatsApp
                </Link>
                <Link
                  href="/admin/export"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin/export")
                      ? "bg-blue-700 text-white"
                      : "text-blue-100 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  Export Excel
                </Link>
                <Link
                  href="/admin/vehicles"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin/vehicles")
                      ? "bg-blue-700 text-white"
                      : "text-blue-100 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  Vehicle Archive
                </Link>
              </>
            )}

            {currentUser?.role === "FIELD_USER" && (
              <>
                <Link
                  href="/field"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname === "/field"
                      ? "bg-blue-700 text-white"
                      : "text-blue-100 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  Home
                </Link>
                <Link
                  href="/field/new"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname === "/field/new"
                      ? "bg-blue-700 text-white"
                      : "text-blue-100 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  + New Entry
                </Link>
                <Link
                  href="/field/drafts"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname === "/field/drafts"
                      ? "bg-blue-700 text-white"
                      : "text-blue-100 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  Drafts
                </Link>
                <Link
                  href="/field/submitted"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname === "/field/submitted"
                      ? "bg-blue-700 text-white"
                      : "text-blue-100 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  Submitted
                </Link>
              </>
            )}
          </nav>

          {/* User Profile & Role Switcher / Logout */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                {/* Switch to Field/Admin Interface helper */}
                {currentUser.role === "ADMIN" && (
                  <Link
                    href={isFieldPage ? "/admin" : "/field"}
                    className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded bg-navy-800 text-xs text-blue-200 border border-blue-500/30 hover:bg-navy-700 hover:text-white transition-colors"
                  >
                    {isFieldPage ? "Switch to Admin" : "Preview Field App"}
                  </Link>
                )}

                <div className="flex items-center gap-2 text-right">
                  <div className="hidden sm:block">
                    <div className="text-xs font-semibold text-white leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-blue-300 uppercase tracking-wider">
                      {currentUser.role === "ADMIN" ? "Administrator" : "Field Officer"}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs border border-blue-400/40">
                    {currentUser.name?.charAt(0) || "U"}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 rounded-lg text-blue-200 hover:text-white hover:bg-navy-800 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              !loading && (
                <Link
                  href="/login"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  Login
                </Link>
              )
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-blue-200 hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navy-950 border-t border-navy-800 px-4 pt-2 pb-4 space-y-1">
          {currentUser?.role === "ADMIN" ? (
            <>
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-navy-800"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/submissions"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-navy-800"
              >
                Submissions
              </Link>
              <Link
                href="/admin/manual-entry"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-navy-800"
              >
                + Manual / WhatsApp Entry
              </Link>
              <Link
                href="/admin/export"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-navy-800"
              >
                Export EP / VAP
              </Link>
              <Link
                href="/admin/vehicles"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-navy-800"
              >
                Vehicle Archive
              </Link>
              <Link
                href="/field"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-amber-300 hover:bg-navy-800"
              >
                📱 Switch to Field Mobile View
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/field"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-navy-800"
              >
                Home
              </Link>
              <Link
                href="/field/new"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-navy-800"
              >
                + New Vehicle Entry
              </Link>
              <Link
                href="/field/drafts"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-navy-800"
              >
                Incomplete Drafts
              </Link>
              <Link
                href="/field/submitted"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-navy-800"
              >
                Submitted Entries
              </Link>
            </>
          )}

          <div className="pt-2 border-t border-navy-800 mt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-rose-300 hover:bg-navy-800 flex items-center gap-2"
            >
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
