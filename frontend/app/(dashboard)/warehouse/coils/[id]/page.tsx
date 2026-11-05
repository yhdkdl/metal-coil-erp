"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { CoilDetail } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";

export default function CoilDetailPage() {
  const { id } = useParams<{ id: string }>(); const [coil, setCoil] = useState<CoilDetail>(); const [error, setError] = useState("");
  useEffect(() => { if (id) api.getCoil(id).then(setCoil).catch((e) => setError(e.message)); }, [id]);
  if (error) return <ErrorState message={error} />; if (!coil) return <LoadingState />;
  return <section><PageHeader title={coil.coil_number} description={`Received ${new Date(coil.created_at).toLocaleDateString()}`} />
    <div className="grid gap-6 lg:grid-cols-3"><Card className="lg:col-span-2"><CardContent><div className="mb-6 flex items-center justify-between"><h2 className="text-lg font-semibold">Coil details</h2><StatusBadge value={coil.status} /></div>
      <dl className="grid gap-5 sm:grid-cols-2">{[["Heat number", coil.heat_number], ["Supplier", coil.supplier], ["Grade", coil.grade], ["Thickness", `${coil.thickness_mm} mm`], ["Width", `${coil.width_mm} mm`], ["Weight", `${Number(coil.total_weight_kg).toLocaleString()} kg`], ["Cost per kg", coil.cost_per_kg], ["Total cost", coil.total_cost]].map(([label, value]) => <div key={label}><dt className="text-xs uppercase text-slate-500">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>
    </CardContent></Card><Card><CardContent><h2 className="font-semibold">Traceability</h2><p className="mt-2 text-sm text-slate-500">Start a production run from this coil.</p><Link className="mt-5 inline-block text-sm font-medium underline" href={`/production/new?coil_id=${coil.id}`}>Start production run</Link></CardContent></Card></div>
    <div className="mt-6"><h2 className="mb-3 text-lg font-semibold">Produced pieces</h2>{!coil.pieces?.length ? <EmptyState>No pieces have been produced from this coil.</EmptyState> : <Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-4">Piece</th><th className="p-4">Grade</th><th className="p-4">Weight</th><th className="p-4">Status</th></tr></thead><tbody>{coil.pieces.map((piece) => <tr key={piece.id} className="border-b last:border-0"><td className="p-4"><Link className="font-medium hover:underline" href={`/warehouse/pieces/${piece.id}`}>{piece.piece_code}</Link></td><td className="p-4">{piece.grade}</td><td className="p-4">{piece.weight_kg} kg</td><td className="p-4"><StatusBadge value={piece.status} /></td></tr>)}</tbody></table></div></Card>}</div>
  </section>;
}
