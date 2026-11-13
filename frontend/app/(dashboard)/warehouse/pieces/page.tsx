"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Piece, PieceStockSummary } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";
export default function PiecesPage() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [summary, setSummary] = useState<PieceStockSummary[]>([]);
  const [warehouses, setWarehouses] = useState<Record<string, string>>({});
  const [category, setCategory] = useState("");
  const [thickness, setThickness] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.listPieces({ category: category || undefined, thickness_mm: thickness || undefined }),
      api.getPieceSummary({ category: category || undefined, thickness_mm: thickness || undefined }),
      api.listWarehouses(),
    ]).then(([items, overview, locations]) => {
      setPieces(items);
      setSummary(overview);
      setWarehouses(Object.fromEntries(locations.map((location) => [location.id, location.name])));
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [category, thickness]);
  return <section>
    <PageHeader title="Pieces" description="Finished pieces available in your warehouses." />
    <Card className="mb-6"><div className="grid gap-4 p-4 sm:grid-cols-2"><label className="text-sm font-medium">Category<input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Filter by category" className="mt-1 h-10 w-full rounded-md border px-3 font-normal" /></label><label className="text-sm font-medium">Thickness (mm)<input value={thickness} onChange={(e) => setThickness(e.target.value)} placeholder="Filter by thickness" type="number" step="0.001" className="mt-1 h-10 w-full rounded-md border px-3 font-normal" /></label></div></Card>
    {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : <>
      <Card className="mb-6"><div className="p-4"><h2 className="font-semibold">Stock overview by category and thickness</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-3">Category</th><th className="p-3">Thickness</th><th className="p-3">Produced</th><th className="p-3">In stock</th><th className="p-3">Main</th><th className="p-3">Outlet</th><th className="p-3">Sold</th></tr></thead><tbody>{summary.map((row) => <tr key={`${row.category}-${row.thickness_mm}`} className="border-b"><td className="p-3">{row.category}</td><td className="p-3">{row.thickness_mm} mm</td><td className="p-3">{row.total_pieces}</td><td className="p-3 font-semibold">{row.in_stock_pieces}</td><td className="p-3">{row.in_main}</td><td className="p-3">{row.in_outlet}</td><td className="p-3">{row.sold}</td></tr>)}</tbody></table></div></div></Card>
      {pieces.length === 0 ? <EmptyState>No pieces found.</EmptyState> : <Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-4">Piece code</th><th className="p-4">Grade</th><th className="p-4">Category</th><th className="p-4">Thickness</th><th className="p-4">Dimensions</th><th className="p-4">Weight</th><th className="p-4">Current location</th><th className="p-4">Status</th></tr></thead><tbody>{pieces.map((p) => <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50"><td className="p-4"><Link className="font-medium hover:underline" href={`/warehouse/pieces/${p.id}`}>{p.piece_code}</Link></td><td className="p-4">{p.grade}</td><td className="p-4">{p.category}</td><td className="p-4">{p.thickness_mm} mm</td><td className="p-4">{p.width_mm} × {p.length_mm} mm</td><td className="p-4">{p.weight_kg} kg</td><td className="p-4">{warehouses[p.current_warehouse_id] ?? "Unknown"}</td><td className="p-4"><StatusBadge value={p.status} /></td></tr>)}</tbody></table></div></Card>}
    </>}
  </section>;
}
