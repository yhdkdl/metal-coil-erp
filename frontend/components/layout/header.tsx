"use client";
import { useRouter } from "next/navigation";
export function Header() { const router = useRouter(); function logout() { localStorage.clear(); router.push("/login"); } return <header className="flex h-16 items-center justify-between border-b bg-white px-8"><span className="text-sm text-slate-500">Traceability workspace</span><button onClick={logout} className="text-sm font-medium text-slate-600 hover:text-slate-950">Sign out</button></header>; }

