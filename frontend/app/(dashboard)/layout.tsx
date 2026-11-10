"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
export default function DashboardLayout({ children }: { children: React.ReactNode }) { const router = useRouter(); const [menuOpen, setMenuOpen] = useState(false); useEffect(() => { if (!localStorage.getItem("access_token")) router.replace("/login"); }, [router]); return <div className="flex min-h-screen"><Sidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} /><div className="flex min-w-0 flex-1 flex-col"><Header onMenu={() => setMenuOpen(true)} /><main className="min-w-0 flex-1 p-4 sm:p-6 md:p-10">{children}</main></div></div>; }
