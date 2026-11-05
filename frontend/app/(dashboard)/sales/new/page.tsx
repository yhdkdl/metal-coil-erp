"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Piece, SaleType, Warehouse } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState, EmptyState, LoadingState } from "@/components/ui/data-state";

export default function NewSalePage() {
  const router = useRouter();
  const [channel, setChannel] = useState<SaleType>("BULK");
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selected, setSelected] = useState<Record<string, string | undefined>>({});
  const [customer, setCustomer] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (window.location.search.includes("channel=retail")) setChannel("RETAIL"); }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([api.listPieces({ status: channel === "BULK" ? "IN_MAIN" : "IN_OUTLET" }), api.listWarehouses()])
      .then(([available, locations]) => {
        if (!active) return;
        setPieces(available);
        const eligible = locations.filter((item) => item.type === (channel === "BULK" ? "MAIN" : "OUTLET"));
        setWarehouses(eligible);
        setWarehouseId(eligible[0]?.id ?? "");
      })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Unable to load sale data"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [channel]);
  const chosen = pieces.filter((piece) => selected[piece.id] !== undefined);
  const visiblePieces = pieces.filter((piece) => piece.piece_code.toLowerCase().includes(search.toLowerCase()) || piece.grade.toLowerCase().includes(search.toLowerCase()));
  const total = useMemo(() => chosen.reduce((sum, piece) => sum + Number(selected[piece.id] || piece.selling_price || 0), 0), [chosen, selected]);
  async function submit(event: FormEvent) { event.preventDefault(); if (!customer || !chosen.length || !warehouseId || !window.confirm(`Create this ${channel.toLowerCase()} sale for ${total.toFixed(2)}?`)) return; setBusy(true); setError(""); try { const sale = await api.createSale({ sale_type: channel as SaleType, customer_name: customer, warehouse_id: warehouseId, line_items: chosen.map((piece) => ({ piece_id: piece.id, sale_price: selected[piece.id] || piece.selling_price || "0" })) }); router.push(`/sales/${sale.id}`); } catch (e) { setError(e instanceof Error ? e.message : "Unable to create sale"); } finally { setBusy(false); } }
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  return <section><PageHeader title={`New ${channel === "BULK" ? "bulk" : "retail"} sale`} description={`Only ${channel === "BULK" ? "Main" : "Outlet"} inventory is available.`} /><form onSubmit={submit} className="space-y-6"><Card><CardContent><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Customer name<input required value={customer} onChange={(e) => setCustomer(e.target.value)} className="mt-2 h-10 w-full rounded-md border px-3 font-normal" /></label><label className="text-sm font-medium">Warehouse<select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="mt-2 h-10 w-full rounded-md border px-3 font-normal">{warehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div></CardContent></Card>{!pieces.length ? <EmptyState>No inventory is available for this channel.</EmptyState> : <Card><CardContent><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by piece code or grade" className="mb-3 h-10 w-full rounded-md border px-3" /><p className="mb-3 text-sm text-slate-500">{visiblePieces.length} available {channel === "BULK" ? "IN_MAIN" : "IN_OUTLET"} pieces</p><div className="divide-y">{visiblePieces.map((piece) => <label key={piece.id} className="flex items-center gap-3 p-4 text-sm"><input type="checkbox" checked={selected[piece.id] !== undefined} onChange={(e) => setSelected({ ...selected, [piece.id]: e.target.checked ? (piece.selling_price || piece.min_selling_price) : undefined })} /><span className="font-medium">{piece.piece_code}</span><span className="text-slate-500">{piece.weight_kg} kg · min {piece.min_selling_price}</span>{selected[piece.id] !== undefined && <input required type="number" min={piece.min_selling_price} step="0.01" value={selected[piece.id]} onChange={(e) => setSelected({ ...selected, [piece.id]: e.target.value })} className="ml-auto h-9 w-32 rounded-md border px-2" />}</label>)}</div></CardContent></Card>}<div className="rounded-md border bg-white p-4"><h2 className="font-semibold">Selected pieces ({chosen.length})</h2>{chosen.map((piece) => <p key={piece.id} className="text-sm text-slate-600">{piece.piece_code}: {selected[piece.id]}</p>)}</div><div className="flex items-center justify-between"><p className="text-sm font-medium">Total: {total.toFixed(2)}</p><Button disabled={busy || !chosen.length || !warehouseId}>{busy ? "Creating…" : "Create sale"}</Button></div>{error && <p className="text-sm text-red-600">{error}</p>}</form></section>;
}
