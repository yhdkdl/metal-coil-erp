"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Role } from "@/types";
import {
  Boxes,
  ChartNoAxesCombined,
  ChevronRight,
  CircleGauge,
  Factory,
  Layers3,
  LogOut,
  PackageCheck,
  Settings2,
  ShoppingCart,
  Warehouse,
  X,
} from "lucide-react";

const links = [
  { href: "/", label: "Overview", icon: CircleGauge, roles: ["ADMIN", "PRODUCTION", "WAREHOUSE", "SALES", "FINANCE"] },
  { href: "/production", label: "Production", icon: Factory, roles: ["ADMIN", "PRODUCTION"] },
  { href: "/warehouse/coils", label: "Coils", icon: Layers3, roles: ["ADMIN", "WAREHOUSE", "PRODUCTION", "FINANCE"] },
  { href: "/warehouse/pieces", label: "Pieces", icon: PackageCheck, roles: ["ADMIN", "WAREHOUSE", "PRODUCTION", "SALES", "FINANCE"] },
  { href: "/warehouse/transfers", label: "Transfers", icon: Warehouse, roles: ["ADMIN", "WAREHOUSE"] },
  { href: "/sales", label: "Sales", icon: ShoppingCart, roles: ["ADMIN", "SALES"] },
  { href: "/finance", label: "Finance", icon: ChartNoAxesCombined, roles: ["ADMIN", "FINANCE"] },
  { href: "/sales/pricing", label: "Pricing", icon: Settings2, roles: ["ADMIN", "FINANCE"] },
  { href: "/admin/users", label: "Users", icon: Settings2, roles: ["ADMIN"] },
];

export function Sidebar({
  mobileOpen = false,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const role = (typeof window !== "undefined" ? localStorage.getItem("user_role") : null) as Role | null;

  function logout() {
    localStorage.clear();
    router.push("/login");
  }

  const content = (
    <div className="flex h-full flex-col">
      {/* Header / Brand */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 font-black text-slate-950 shadow-md">
            MC
          </div>
          <div>
            <div className="font-bold tracking-tight text-white">Metal Coil</div>
            <div className="text-xs text-slate-400">Traceability ERP</div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation links */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">
          Operations
        </p>
        <nav className="space-y-1">
          {links
            .filter((link) => !role || link.roles.includes(role))
            .map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  onClick={onClose}
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/10 hover:text-white",
                    active &&
                      "bg-amber-400 font-bold text-slate-950 shadow-lg shadow-amber-950/20 hover:bg-amber-300 hover:text-slate-950"
                  )}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                  <span>{link.label}</span>
                  {active && <ChevronRight className="ml-auto" size={16} />}
                </Link>
              );
            })}
        </nav>
      </div>

      {/* Mobile User & Logout Footer */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center justify-between rounded-xl bg-white/[0.04] p-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-400/20 font-mono font-bold text-amber-300">
              {(role ?? "AD").slice(0, 2)}
            </div>
            <div>
              <p className="font-semibold text-white">Active Session</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">{role ?? "User"}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-red-400"
          >
            <LogOut size={15} />
            <span className="text-[11px]">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col bg-[#101923] text-slate-100 lg:flex">
        {content}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
          />
          <aside className="relative flex h-full w-[min(88vw,20rem)] flex-col bg-[#101923] text-slate-100 shadow-2xl animate-in slide-in-from-left duration-250">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
