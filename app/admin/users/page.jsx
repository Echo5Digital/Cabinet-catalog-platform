"use client";

import { useState, useEffect, useCallback } from "react";

// Roles selectable when inviting/editing a user. "super_admin" is a legacy
// value some existing accounts may still carry — it's recognized for display
// but not offered as a choice going forward; use "owner" for new Super Admins.
const ROLES = [
  { value: "owner",   label: "Super Admin", hint: "Full access to everything, including User management." },
  { value: "manager", label: "Manager",     hint: "Full access to Catalog, Assets, Setup, Leads, Design, and Planner." },
  { value: "admin",   label: "Admin",       hint: "Access limited to Leads, Design, and Planner only." },
  { value: "editor",  label: "Editor",      hint: "Can edit most content, cannot publish or manage settings." },
  { value: "viewer",  label: "Viewer",      hint: "Read-only access." },
];

const SUPER_ADMIN_ROLES = new Set(["owner", "super_admin"]);

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => chars[n % chars.length]).join("");
}

function roleLabel(value) {
  if (value === "super_admin") return "Super Admin";
  return ROLES.find((r) => r.value === value)?.label || value;
}

function RoleBadge({ role }) {
  const styles = {
    owner:       "bg-indigo-50 text-indigo-700 border-indigo-200",
    super_admin: "bg-indigo-50 text-indigo-700 border-indigo-200",
    manager:     "bg-blue-50 text-blue-700 border-blue-200",
    admin:       "bg-amber-50 text-amber-700 border-amber-200",
    editor:      "bg-gray-50 text-gray-600 border-gray-200",
    viewer:      "bg-gray-50 text-gray-500 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[role] || styles.viewer}`}>
      {roleLabel(role)}
    </span>
  );
}

export default function UsersPage() {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "", role: "admin", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [meRes, usersRes] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/tenant/users"),
      ]);
      const meData = await meRes.json();
      setMe(meData.user || null);

      if (!usersRes.ok) {
        const d = await usersRes.json().catch(() => ({}));
        throw new Error(d.error || "Failed to load users");
      }
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    setInviteError("");
    try {
      const res = await fetch("/api/tenant/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      setUsers((prev) => [...prev, data.user]);
      setInviteForm({ email: "", full_name: "", role: "admin", password: "" });
      setShowPassword(false);
      setShowInvite(false);
    } catch (e) {
      setInviteError(e.message);
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(id, role) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/tenant/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(id, is_active) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/tenant/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");
      setUsers((prev) => prev.map((u) => (u.id === id ? data.user : u)));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/tenant/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove user");
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
        Loading users…
      </div>
    );
  }

  if (me && !SUPER_ADMIN_ROLES.has(me.role)) {
    return (
      <div className="p-6 sm:p-8 max-w-3xl mx-auto">
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Only Super Admins can manage users.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage who has access to this admin panel and what they can do.
          </p>
        </div>
        <button
          onClick={() => setShowInvite((v) => !v)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
        >
          {showInvite ? "Cancel" : "+ New User"}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {showInvite && (
        <form
          onSubmit={handleInvite}
          className="mb-6 bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-gray-900">Create a new user</h2>

          {inviteError && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {inviteError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={inviteForm.email}
                onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={inviteForm.full_name}
                onChange={(e) => setInviteForm((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Jane Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-16 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 px-1"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const pwd = generatePassword();
                  setInviteForm((p) => ({ ...p, password: pwd }));
                  setShowPassword(true);
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition whitespace-nowrap"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Share this password with the user directly — it won&apos;t be shown again after creation.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={inviteForm.role}
              onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value }))}
              className="w-full sm:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {ROLES.filter((r) => r.value !== "owner").map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">
              {ROLES.find((r) => r.value === inviteForm.role)?.hint}
            </p>
          </div>

          <div>
            <button
              type="submit"
              disabled={inviting}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {inviting ? "Creating user…" : "Create User"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => {
                const isSelf = me && u.email?.toLowerCase() === me.email?.toLowerCase();
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {u.full_name || "—"}
                      {isSelf && <span className="ml-2 text-xs text-gray-400 font-normal">(you)</span>}
                    </td>
                    <td className="px-5 py-4 text-gray-600">{u.email}</td>
                    <td className="px-5 py-4">
                      {isSelf || u.role === "super_admin" ? (
                        <RoleBadge role={u.role} />
                      ) : (
                        <select
                          value={u.role}
                          disabled={busyId === u.id}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-right whitespace-nowrap">
                      {!isSelf && (
                        confirmId === u.id ? (
                          <span className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="text-xs font-semibold text-red-600 hover:text-red-800 transition"
                            >
                              {busyId === u.id ? "…" : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="text-xs text-gray-400 hover:text-gray-600 transition"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleToggleActive(u.id, !u.is_active)}
                              disabled={busyId === u.id}
                              className="p-1.5 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition disabled:opacity-50"
                              title={u.is_active ? "Disable user" : "Enable user"}
                            >
                              {u.is_active ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => setConfirmId(u.id)}
                              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                              title="Remove user"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </span>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
