"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleGauge, Factory, Layers3, ShoppingCart, Menu } from "lucide-react";

interface BottomNavProps {
  onOpenMenu: () => void;
}

export function BottomNav({ onOpenMenu }: BottomNavProps) {
  const pathname = usePathname();

  const isCoils = pathname.startsWith("/warehouse/coils");
  const isProduction = pathname.startsWith("/production");
  const isSales = pathname.startsWith("/sales");
  const isOverview = pathname === "/";

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-[#101923]/95 px-2 py-1.5 backdrop-blur-lg lg:hidden"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      <div className="grid grid-cols-5 items-center text-center">
        {/* Overview */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-1.5 transition-colors ${
            isOverview ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className="relative">
            <CircleGauge size={20} strokeWidth={isOverview ? 2.5 : 1.8} />
            {isOverview && (
              <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-400" />
            )}
          </div>
          <span className="mt-1 text-[10px] tracking-tight">Home</span>
        </Link>

        {/* Coils */}
        <Link
          href="/warehouse/coils"
          className={`flex flex-col items-center justify-center py-1.5 transition-colors ${
            isCoils ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className="relative">
            <Layers3 size={20} strokeWidth={isCoils ? 2.5 : 1.8} />
            {isCoils && (
              <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-400" />
            )}
          </div>
          <span className="mt-1 text-[10px] tracking-tight">Coils</span>
        </Link>

        {/* Production */}
        <Link
          href="/production"
          className={`flex flex-col items-center justify-center py-1.5 transition-colors ${
            isProduction ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className="relative">
            <Factory size={20} strokeWidth={isProduction ? 2.5 : 1.8} />
            {isProduction && (
              <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-400" />
            )}
          </div>
          <span className="mt-1 text-[10px] tracking-tight">Produce</span>
        </Link>

        {/* Sales */}
        <Link
          href="/sales"
          className={`flex flex-col items-center justify-center py-1.5 transition-colors ${
            isSales ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className="relative">
            <ShoppingCart size={20} strokeWidth={isSales ? 2.5 : 1.8} />
            {isSales && (
              <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-400" />
            )}
          </div>
          <span className="mt-1 text-[10px] tracking-tight">Sales</span>
        </Link>

        {/* More / Menu */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center py-1.5 text-slate-400 transition-colors hover:text-slate-200 active:text-amber-400"
        >
          <Menu size={20} strokeWidth={1.8} />
          <span className="mt-1 text-[10px] tracking-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
}

