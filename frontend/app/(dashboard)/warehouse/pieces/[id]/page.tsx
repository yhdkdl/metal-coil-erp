"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Piece } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState, ErrorState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";
export default function PieceDetailPage() { const {id}=useParams<{id:string}>(); const [piece,setPiece]=useState<Piece>(); const [error,setError]=useState(""); useEffect(()=>{if(id)api.getPiece(id).then(setPiece).catch(e=>setError(e.message));},[id]); if(error)return <ErrorState message={error}/>; if(!piece)return <LoadingState/>; return <section><PageHeader title={piece.piece_code} description={`Created ${new Date(piece.created_at).toLocaleDateString()}`}/><Card className="max-w-3xl"><CardContent><div className="mb-6 flex items-center justify-between"><h2 className="text-lg font-semibold">Piece details</h2><StatusBadge value={piece.status}/></div><dl className="grid gap-5 sm:grid-cols-2">{[["Grade",piece.grade],["Category",piece.category],["Thickness",`${piece.thickness_mm} mm`],["Width",`${piece.width_mm} mm`],["Length",`${piece.length_mm} mm`],["Weight",`${piece.weight_kg} kg`],["Allocated cost",`${piece.allocated_cost}`],["Selling price",piece.selling_price == null ? "Not set" : `${piece.selling_price}`],["Parent coil",piece.parent_coil_id],["Warehouse",piece.current_warehouse_id]].map(([label,value])=><div key={label}><dt className="text-xs uppercase text-slate-500">{label}</dt><dd className="mt-1 break-all font-medium">{value}</dd></div>)}</dl></CardContent></Card></section>; }
