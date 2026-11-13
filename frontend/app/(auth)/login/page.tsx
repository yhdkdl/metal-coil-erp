"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);
      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("user_role", result.user.role);
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
    } finally {
      setLoading(false);
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
            Traceability, in control
          </p>
          <h1 className="text-6xl font-black leading-[1.05] tracking-tight">
            From coil to piece, without the blind spots.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-slate-400">
            Run your metal inventory with confidence, clarity, and a complete chain of custody.
          </p>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          Precision Metal Operations Workspace
        </p>
        <div className="absolute -bottom-24 -right-20 h-96 w-96 rounded-full border-[42px] border-white/[.04]" />
      </div>

      {/* Form Container (Mobile & Desktop) */}
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
              Secure access
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Sign in to your metal inventory workspace.
            </p>
          </div>

          <div className="space-y-4">
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
                type="password"
                placeholder="••••••••"
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
            disabled={loading}
            className="h-12 w-full rounded-xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-300"
          >
            {loading ? "Signing in..." : "Sign in to workspace"}
          </Button>

          <p className="text-center text-xs sm:text-sm text-slate-500">
            Need an account?{" "}
            <Link href="/register" className="font-bold text-slate-900 hover:text-amber-700">
              Register
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
