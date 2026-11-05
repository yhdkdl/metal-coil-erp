"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ProductionRun } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";
export default function ProductionPage() { const [runs,setRuns]=useState<ProductionRun[]>([]); const [error,setError]=useState(""); useEffect(()=>{api.listProductionRuns().then(setRuns).catch(e=>setError(e.message));},[]); return <section><PageHeader title="Production" description="Track slitting and processing runs." action="New production run" href="/production/new"/>{error?<ErrorState message={error}/>:runs.length===0?<EmptyState>No production runs found.</EmptyState>:<Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-4">Run</th><th className="p-4">Machine</th><th className="p-4">Coil</th><th className="p-4">Status</th><th className="p-4">Started</th></tr></thead><tbody>{runs.map(run=><tr key={run.id} className="border-b last:border-0 hover:bg-slate-50"><td className="p-4"><Link className="font-medium text-slate-900 hover:underline" href={`/production/${run.id}`}>{run.id.slice(0,8)}</Link></td><td className="p-4">{run.machine_type}</td><td className="p-4">{run.coil_id.slice(0,8)}</td><td className="p-4"><StatusBadge value={run.status}/></td><td className="p-4 text-slate-500">{new Date(run.started_at).toLocaleString()}</td></tr>)}</tbody></table></div></Card>}</section>; }
