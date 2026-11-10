"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  useEffect(() => { setChannel(new URLSearchParams(window.location.search).get("channel") === "retail" ? "RETAIL" : "BULK"); }, []);
  function changeChannel(value: SaleType) {
    setChannel(value);
    setSelected({});
    setSearch("");
    window.history.replaceState(null, "", `/sales/new?channel=${value.toLowerCase()}`);
  }
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
  const pricedPieceCount = pieces.filter((piece) => piece.selling_price != null).length;
  const total = useMemo(() => chosen.reduce((sum, piece) => sum + Number(selected[piece.id] || piece.selling_price || 0), 0), [chosen, selected]);
  function togglePiece(piece: Piece, checked: boolean) {
    if (piece.selling_price == null) return;
    setSelected((current) => ({ ...current, [piece.id]: checked ? (piece.selling_price ?? undefined) : undefined }));
  }
  async function submit(event: FormEvent) { event.preventDefault(); if (!customer || !chosen.length || !warehouseId || !window.confirm(`Create this ${channel.toLowerCase()} sale for ${total.toFixed(2)}?`)) return; setBusy(true); setError(""); try { const sale = await api.createSale({ sale_type: channel as SaleType, customer_name: customer, warehouse_id: warehouseId, line_items: chosen.map((piece) => ({ piece_id: piece.id, sale_price: selected[piece.id] || piece.selling_price || "0" })) }); router.push(`/sales/${sale.id}`); } catch (e) { setError(e instanceof Error ? e.message : "Unable to create sale"); } finally { setBusy(false); } }
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  return <section><PageHeader title={`New ${channel === "BULK" ? "bulk" : "retail"} sale`} description={`Only ${channel === "BULK" ? "Main" : "Outlet"} inventory is available.`} /><form onSubmit={submit} className="space-y-6"><Card><CardContent><div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium">Sale channel<select value={channel} onChange={(e) => changeChannel(e.target.value as SaleType)} className="mt-2 h-10 w-full rounded-md border px-3 font-normal"><option value="BULK">Bulk — Main warehouse</option><option value="RETAIL">Retail — Outlet warehouse</option></select></label><label className="text-sm font-medium">Customer name<input required value={customer} onChange={(e) => setCustomer(e.target.value)} className="mt-2 h-10 w-full rounded-md border px-3 font-normal" /></label><label className="text-sm font-medium">Warehouse<select required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="mt-2 h-10 w-full rounded-md border px-3 font-normal">{warehouses.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.type})</option>)}</select></label></div></CardContent></Card>{!pieces.length ? <EmptyState>No inventory is available for this channel.</EmptyState> : <Card><CardContent><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by piece code or grade" className="mb-3 h-10 w-full rounded-md border px-3" /><p className="mb-3 text-sm text-slate-500">{visiblePieces.length} available {channel === "BULK" ? "IN_MAIN" : "IN_OUTLET"} pieces · {pricedPieceCount} with preset prices</p>{pricedPieceCount < pieces.length && <p className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">Pieces without a preset price cannot be sold. Ask Finance or Admin to set prices on the <Link href="/sales/pricing" className="font-medium underline">Pricing page</Link>.</p>}<div className="divide-y">{visiblePieces.map((piece) => <label key={piece.id} className={`flex items-center gap-3 p-4 text-sm ${piece.selling_price == null ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`} title={piece.selling_price == null ? "Preset price required before this piece can be sold" : undefined}><input type="checkbox" disabled={piece.selling_price == null} checked={selected[piece.id] !== undefined} onChange={(e) => togglePiece(piece, e.target.checked)} aria-label={`Select ${piece.piece_code}`} /><span className="font-medium">{piece.piece_code}</span><span className="text-slate-500">{piece.weight_kg} kg · {piece.selling_price == null ? "Price not set" : `Preset price ${piece.selling_price}`}</span>{selected[piece.id] !== undefined && <span className="ml-auto rounded-md border bg-slate-50 px-3 py-2 text-sm">{selected[piece.id]}</span>}</label>)}</div></CardContent></Card>}<div className="rounded-md border bg-white p-4"><h2 className="font-semibold">Selected pieces ({chosen.length})</h2>{chosen.map((piece) => <p key={piece.id} className="text-sm text-slate-600">{piece.piece_code}: {selected[piece.id]}</p>)}</div><div className="flex items-center justify-between"><p className="text-sm font-medium">Total: {total.toFixed(2)}</p><Button disabled={busy || !chosen.length || !warehouseId}>{busy ? "Creating…" : "Create sale"}</Button></div>{error && <p className="text-sm text-red-600">{error}</p>}</form></section>;
}
