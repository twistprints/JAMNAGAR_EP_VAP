"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  KeyRound,
  RefreshCw,
  Shield,
  Smartphone,
  Calendar,
  Clock,
  Lock,
  Phone,
  Mail,
  User,
  AlertCircle,
  Power,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createLoginId, setCreateLoginId] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Reset Password Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (res.ok) {
        setToastMessage(
          !currentActive ? "✓ User account ACTIVATED" : "✓ User account DEACTIVATED"
        );
        setTimeout(() => setToastMessage(null), 3000);
        await fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update user status.");
      }
    } catch (e) {
      console.error(e);
      alert("Error updating user status.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName || !createPassword || (!createLoginId && !createEmail)) {
      setCreateError("Name, Login ID, and Password are required.");
      return;
    }

    if (createPassword.length < 6) {
      setCreateError("Password must be at least 6 characters.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const res = await apiFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          username: createLoginId.trim(),
          email: createEmail ? createEmail.trim() : undefined,
          phone: createPhone ? createPhone.trim() : undefined,
          password: createPassword,
          role: "FIELD_USER", // Enforce Field Officer creation only
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error || "Failed to create user.");
        setCreating(false);
        return;
      }

      setToastMessage(`✓ Created Field Officer account: ${data.user.name}`);
      setTimeout(() => setToastMessage(null), 3500);

      // Reset form & close modal
      setCreateName("");
      setCreateLoginId("");
      setCreateEmail("");
      setCreatePhone("");
      setCreatePassword("");
      setShowCreateModal(false);
      await fetchUsers();
    } catch (e) {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }

    setResetting(true);
    setResetError(null);

    try {
      const res = await apiFetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!res.ok) {
        const err = await res.json();
        setResetError(err.error || "Failed to reset password.");
        setResetting(false);
        return;
      }

      setToastMessage(`✓ Password reset successfully for ${selectedUser.name}`);
      setTimeout(() => setToastMessage(null), 3000);

      setNewPassword("");
      setShowResetModal(false);
      setSelectedUser(null);
    } catch (e) {
      setResetError("Network error. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Identity &amp; Access Governance</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">USER &amp; FIELD OFFICER MANAGEMENT</h1>
          <p className="text-sm text-slate-300 mt-1">
            Provision and manage authorized Field Verification Officers and Administrator accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
          </button>

          <button
            onClick={() => {
              setCreateError(null);
              setShowCreateModal(true);
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg flex items-center gap-2 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Create Field Officer</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, login ID, email, or phone..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
          <span>Total Users: <strong>{users.length}</strong></span>
          <span>•</span>
          <span>Active: <strong className="text-emerald-600">{users.filter((u) => u.active).length}</strong></span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Login ID / Username</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading user accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No users match the search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name & Contact */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        {u.email && <span>{u.email}</span>}
                        {u.phone && <span>• {u.phone}</span>}
                      </div>
                    </td>

                    {/* Login ID */}
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {u.username}
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          u.role === "ADMIN"
                            ? "bg-slate-900 text-white"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {u.role === "ADMIN" ? (
                          <Shield className="w-3 h-3 text-blue-400" />
                        ) : (
                          <Smartphone className="w-3 h-3 text-emerald-600" />
                        )}
                        <span>{u.role === "ADMIN" ? "Administrator" : "Field Officer"}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.active ? "bg-emerald-500" : "bg-rose-500"}`} />
                        <span>{u.active ? "Active" : "Deactivated"}</span>
                      </span>
                    </td>

                    {/* Last Login */}
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}
                    </td>

                    {/* Created Date */}
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setResetError(null);
                            setNewPassword("");
                            setShowResetModal(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 border border-slate-200"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3 h-3 text-slate-500" />
                          <span>Reset Password</span>
                        </button>

                        <button
                          onClick={() => handleToggleActive(u.id, u.active)}
                          className={`p-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                            u.active
                              ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                          }`}
                          title={u.active ? "Deactivate User" : "Activate User"}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Provision New Field Officer</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Officer Full Name *
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Login ID / Username *
                </label>
                <input
                  type="text"
                  value={createLoginId}
                  onChange={(e) => setCreateLoginId(e.target.value)}
                  placeholder="e.g. field_ramesh"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="e.g. ramesh@jamnagar.gov.in"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  placeholder="e.g. 9879011000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Temporary Password *
                </label>
                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition-all disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Officer Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Reset Password</h3>
              </div>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setSelectedUser(null);
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              {resetError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              <p className="text-xs text-slate-600">
                Setting a new password for <strong>{selectedUser.name}</strong> (<span className="font-mono">{selectedUser.username}</span>).
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow transition-all disabled:opacity-50"
                >
                  {resetting ? "Resetting..." : "Save New Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
