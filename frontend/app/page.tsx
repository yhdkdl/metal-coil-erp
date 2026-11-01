"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
export default function DashboardPage() { const router = useRouter(); useEffect(() => { if (!localStorage.getItem("access_token")) router.replace("/login"); }, [router]); return <div className="flex min-h-screen"><Sidebar /><div className="flex flex-1 flex-col"><Header /><main className="flex-1 p-8"><h1 className="text-3xl font-semibold">Dashboard</h1><p className="mt-3 text-slate-500">Your traceability workspace is ready. Operational modules are coming in Phase 2.</p></main></div></div>; }
