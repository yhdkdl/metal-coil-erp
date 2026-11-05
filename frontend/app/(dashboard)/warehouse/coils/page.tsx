"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Coil } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";
export default function CoilsPage() { const [coils,setCoils]=useState<Coil[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); useEffect(()=>{api.listCoils().then(setCoils).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]); return <section><PageHeader title="Coils" description="Raw material inventory and traceability." action="Receive coil" href="/warehouse/coils/new"/>{loading?<LoadingState/>:error?<ErrorState message={error}/>:coils.length===0?<EmptyState>No coils found.</EmptyState>:<Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-4">Coil number</th><th className="p-4">Heat</th><th className="p-4">Grade</th><th className="p-4">Dimensions</th><th className="p-4">Weight</th><th className="p-4">Status</th></tr></thead><tbody>{coils.map(c=><tr key={c.id} className="border-b last:border-0 hover:bg-slate-50"><td className="p-4"><Link className="font-medium text-slate-900 hover:underline" href={`/warehouse/coils/${c.id}`}>{c.coil_number}</Link></td><td className="p-4">{c.heat_number}</td><td className="p-4">{c.grade}</td><td className="p-4">{c.thickness_mm} × {c.width_mm} mm</td><td className="p-4">{Number(c.total_weight_kg).toLocaleString()} kg</td><td className="p-4"><StatusBadge value={c.status}/></td></tr>)}</tbody></table></div></Card>}</section>; }
