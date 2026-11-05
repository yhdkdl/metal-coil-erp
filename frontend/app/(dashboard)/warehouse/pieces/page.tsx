"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Piece } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";
export default function PiecesPage() { const [pieces,setPieces]=useState<Piece[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); useEffect(()=>{api.listPieces().then(setPieces).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]); return <section><PageHeader title="Pieces" description="Finished pieces available in your warehouses." />{loading?<LoadingState/>:error?<ErrorState message={error}/>:pieces.length===0?<EmptyState>No pieces found.</EmptyState>:<Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-4">Piece code</th><th className="p-4">Grade</th><th className="p-4">Category</th><th className="p-4">Dimensions</th><th className="p-4">Weight</th><th className="p-4">Status</th></tr></thead><tbody>{pieces.map(p=><tr key={p.id} className="border-b last:border-0 hover:bg-slate-50"><td className="p-4"><Link className="font-medium hover:underline" href={`/warehouse/pieces/${p.id}`}>{p.piece_code}</Link></td><td className="p-4">{p.grade}</td><td className="p-4">{p.category}</td><td className="p-4">{p.thickness_mm} × {p.width_mm} × {p.length_mm} mm</td><td className="p-4">{p.weight_kg} kg</td><td className="p-4"><StatusBadge value={p.status}/></td></tr>)}</tbody></table></div></Card>}</section>; }
