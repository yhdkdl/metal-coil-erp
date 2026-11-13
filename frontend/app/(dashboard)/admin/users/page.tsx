"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Role, User } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/data-state";

const roles: Role[] = ["WAREHOUSE", "PRODUCTION", "SALES", "FINANCE", "ADMIN"];

const roleDescriptions: Record<Role, string> = {
  WAREHOUSE: "Receives raw coils, dispatches inter-facility stock transfers, and audits yard inventory.",
  PRODUCTION: "Launches slitting runs, logs yield recovery outputs, and tracks machine operations.",
  SALES: "Creates bulk and retail sales orders, logs payment receipts, and fulfills customer dispatches.",
  FINANCE: "Configures catalog selling prices, audits COGS, and generates P&L statements.",
  ADMIN: "Full system administrative access, security provisioning, and role assignment.",
};

const roleBadgeStyles: Record<Role, string> = {
  ADMIN: "bg-purple-100 text-purple-800 border-purple-200",
  FINANCE: "bg-amber-100 text-amber-800 border-amber-200",
  SALES: "bg-sky-100 text-sky-800 border-sky-200",
  PRODUCTION: "bg-blue-100 text-blue-800 border-blue-200",
  WAREHOUSE: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "SALES" as Role,
  });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    );
  }, [users, search]);

  const stats = useMemo(() => {
    const total = users.length;
    const byRole = roles.reduce((acc, r) => {
      acc[r] = users.filter((u) => u.role === r).length;
      return acc;
    }, {} as Record<Role, number>);
    return { total, byRole };
  }, [users]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const user = await api.createUser(form);
      setUsers((prev) => [...prev, user]);
      setForm({ email: "", password: "", full_name: "", role: "SALES" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to register user");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Identity & Access Governance"
        description="Provision enterprise user accounts, enforce least-privilege permissions, and assign operational roles."
      />

      {/* Role Counts Scoreboard */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {roles.map((r) => (
          <div key={r} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
            <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${roleBadgeStyles[r]}`}>
              {r}
            </span>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              {stats.byRole[r] || 0}
            </div>
            <span className="text-xs text-slate-400">active accounts</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Directory */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search staff by name, email, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Staff Roster ({filteredUsers.length} of {users.length})
              </h2>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50/70">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-mono text-sm font-bold text-slate-700">
                      {u.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{u.full_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block rounded-md border px-2.5 py-1 text-xs font-semibold ${roleBadgeStyles[u.role]}`}>
                      {u.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Provision New User Card */}
        <div>
          <Card className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Provision New User
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Create credentials and assign an organizational duty role.
            </p>

            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Alex Henderson"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Corporate Email <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="email"
                  placeholder="alex@metalcoil.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Temporary Password <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  minLength={8}
                  type="password"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Assigned Operational Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  {roleDescriptions[form.role]}
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  {error}
                </div>
              )}

              <Button disabled={submitting} className="w-full">
                {submitting ? "Provisioning..." : "Provision Account"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </section>
  );
}
