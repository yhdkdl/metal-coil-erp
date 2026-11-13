"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("access_token")) router.replace("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-50">
      <Sidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col w-full max-w-full overflow-x-hidden">
        <Header onMenu={() => setMenuOpen(true)} />
        {/* pb-24 on mobile ensures bottom navigation doesn't obstruct any tables or action bars */}
        <main className="min-w-0 flex-1 w-full max-w-full overflow-x-hidden p-3 sm:p-6 md:p-8 pb-24 lg:pb-10">
          {children}
        </main>
        <BottomNav onOpenMenu={() => setMenuOpen(true)} />
      </div>
    </div>
  );
}
