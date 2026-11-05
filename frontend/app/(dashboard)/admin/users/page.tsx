"use client";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Role, User } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/data-state";

const roles: Role[] = ["WAREHOUSE", "PRODUCTION", "SALES", "FINANCE", "ADMIN"];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "SALES" as Role });
  const [error, setError] = useState("");
  useEffect(() => { api.listUsers().then(setUsers).catch((e) => setError(e.message)); }, []);
  async function submit(event: FormEvent) { event.preventDefault(); try { const user = await api.createUser(form); setUsers([...users, user]); setForm({ email: "", password: "", full_name: "", role: "SALES" }); } catch (e) { setError(e instanceof Error ? e.message : "Unable to create user"); } }
  if (error && !users.length) return <ErrorState message={error} />;
  if (!users) return <LoadingState />;
  return <section><PageHeader title="User management" description="Create users and assign operational roles." /><form onSubmit={submit} className="mb-6 max-w-2xl space-y-3 rounded-xl border bg-white p-5"><input required type="text" placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="h-10 w-full rounded-md border px-3" /><input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-10 w-full rounded-md border px-3" /><input required minLength={8} type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-10 w-full rounded-md border px-3" /><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="h-10 w-full rounded-md border px-3">{roles.map((role) => <option key={role}>{role}</option>)}</select><Button>Create user</Button></form><div className="rounded-xl border bg-white p-5">{users.map((user) => <div key={user.id} className="flex justify-between border-b py-3 last:border-0"><span>{user.full_name} · {user.email}</span><strong>{user.role}</strong></div>)}</div>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}</section>;
}
