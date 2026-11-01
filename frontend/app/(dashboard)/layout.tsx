"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
export default function DashboardLayout({ children }: { children: React.ReactNode }) { const router = useRouter(); useEffect(() => { if (!localStorage.getItem("access_token")) router.replace("/login"); }, [router]); return <div className="flex min-h-screen"><Sidebar /><div className="flex flex-1 flex-col"><Header /><main className="flex-1 p-8">{children}</main></div></div>; }

