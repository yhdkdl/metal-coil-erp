"use client";

import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";

export function Header({ onMenu }: { onMenu?: () => void }) {
  const router = useRouter();
  const role = typeof window !== "undefined" ? localStorage.getItem("user_role") : "ADMIN";

  function logout() {
    localStorage.clear();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-3.5 backdrop-blur-md sm:px-6 md:px-8">
      {/* Left: Mobile Menu & Breadcrumb */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          onClick={onMenu}
          aria-label="Open navigation drawer"
          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100 active:scale-95 lg:hidden"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white p-0.5 border border-slate-200 shadow-xs lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Yonas Metal" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="hidden text-[10px] font-bold uppercase tracking-[.18em] text-slate-400 sm:block">
              Operations Center
            </p>
            <p className="text-xs sm:text-sm font-bold text-slate-800">
              Yonas Metal
            </p>
          </div>
        </div>
      </div>

      {/* Right: User Badge & Fast Sign Out */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-slate-100/80 py-1 px-2.5">
          <div className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-[10px] font-bold text-amber-300">
            {(role ?? "AD").slice(0, 2)}
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 hidden sm:inline">
            {role ?? "User"}
          </span>
        </div>

        <button
          onClick={logout}
          aria-label="Sign out"
          title="Sign out of workspace"
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-red-600"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
