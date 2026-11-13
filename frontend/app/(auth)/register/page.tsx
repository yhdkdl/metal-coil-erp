"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await register(email, password, name);
      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("user_role", result.user.role);
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to register account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_.9fr]">
      {/* Desktop Brand Banner */}
      <div className="relative hidden overflow-hidden bg-[#101923] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 font-black text-slate-950">
            MC
          </div>
          <span className="font-bold tracking-tight">Metal Coil ERP</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <p className="mb-5 text-xs font-bold uppercase tracking-[.22em] text-amber-300">
            Enterprise Onboarding
          </p>
          <h1 className="text-5xl font-black leading-[1.1] tracking-tight">
            Join the precision metal manufacturing network.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-400">
            End-to-end mother coil tracking, slitting yield analytics, inter-facility dispatch, and real-time revenue accounting.
          </p>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          Precision Manufacturing Operations Workspace
        </p>
        <div className="absolute -bottom-24 -right-20 h-96 w-96 rounded-full border-[42px] border-white/[.04]" />
      </div>

      {/* Form Container */}
      <div className="flex items-center justify-center bg-slate-50 p-4 sm:p-6 md:p-8">
        <form onSubmit={submit} className="w-full max-w-md space-y-6">
          {/* Mobile Logo Brand */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 font-black text-slate-950 shadow-sm">
              MC
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">Metal Coil ERP</div>
              <div className="text-xs text-slate-500">Mobile Operations Portal</div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-amber-600">
              Staff Provisioning
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Create an account
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Register your operational profile to access your workspace.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">
                Full Name
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Elena Rostova"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">
                Work Email
              </label>
              <input
                required
                type="email"
                placeholder="name@metalcoil.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">
                Password
              </label>
              <input
                required
                minLength={8}
                type="password"
                placeholder="8+ characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-xs sm:text-sm text-red-600">{error}</p>
          )}

          <Button
            disabled={submitting}
            className="h-12 w-full rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300"
          >
            {submitting ? "Creating profile..." : "Register Profile"}
          </Button>

          <p className="text-center text-xs sm:text-sm text-slate-500">
            Already have an active account?{" "}
            <Link href="/login" className="font-bold text-slate-900 hover:text-amber-700">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
