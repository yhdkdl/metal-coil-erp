"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { PieceTrace } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState, ErrorState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";
export default function PieceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [trace, setTrace] = useState<PieceTrace>();
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) api.getPieceTrace(id).then(setTrace).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!trace) return <LoadingState />;

  const { piece, parent_coil: coil, production_run: run, movements } = trace;
  return <section>
    <PageHeader title={piece.piece_code} description={`Created ${new Date(piece.created_at).toLocaleDateString()}`} />
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardContent>
        <div className="mb-6 flex items-center justify-between"><h2 className="text-lg font-semibold">Piece details</h2><StatusBadge value={piece.status} /></div>
        <dl className="grid gap-5 sm:grid-cols-2">{[
          ["Grade", piece.grade], ["Category", piece.category], ["Thickness", `${piece.thickness_mm} mm`],
          ["Width", `${piece.width_mm} mm`], ["Length", `${piece.length_mm} mm`], ["Weight", `${piece.weight_kg} kg`],
          ["Allocated cost", piece.allocated_cost], ["Selling price", piece.selling_price == null ? "Not set" : piece.selling_price],
          ["Warehouse", piece.current_warehouse_id],
        ].map(([label, value]) => <div key={label}><dt className="text-xs uppercase text-slate-500">{label}</dt><dd className="mt-1 break-all font-medium">{value}</dd></div>)}</dl>
      </CardContent></Card>
      <Card><CardContent><h2 className="font-semibold">Traceability</h2>
        {coil ? <><p className="mt-2 text-sm text-slate-500">Source coil</p><Link className="mt-1 inline-block font-medium underline" href={`/warehouse/coils/${coil.id}`}>{coil.coil_number}</Link><p className="mt-4 text-sm text-slate-500">Heat number</p><p className="mt-1 font-medium">{coil.heat_number}</p></> : <p className="mt-2 text-sm text-red-600">Source coil unavailable</p>}
        {run && <><p className="mt-4 text-sm text-slate-500">Production run</p><Link className="mt-1 inline-block font-medium underline" href={`/production/${run.id}`}>{run.id.slice(0, 8)}</Link></>}
      </CardContent></Card>
    </div>
    <div className="mt-6"><h2 className="mb-3 text-lg font-semibold">Movement history</h2><Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-4">Date</th><th className="p-4">Movement</th><th className="p-4">Weight</th><th className="p-4">Note</th></tr></thead><tbody>{movements.length === 0 ? <tr><td className="p-4 text-slate-500" colSpan={4}>No movements recorded.</td></tr> : movements.map((movement) => <tr key={movement.id} className="border-b last:border-0"><td className="p-4">{new Date(movement.created_at).toLocaleString()}</td><td className="p-4"><StatusBadge value={movement.movement_type} /></td><td className="p-4">{movement.weight_kg} kg</td><td className="p-4 text-slate-500">{movement.note ?? "—"}</td></tr>)}</tbody></table></div></Card></div>
  </section>;
}
