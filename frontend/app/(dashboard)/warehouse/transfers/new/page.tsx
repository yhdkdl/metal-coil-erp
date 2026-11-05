"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Piece, Warehouse } from "@/types";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";

export default function NewTransferPage() {
  const router = useRouter();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [outlets, setOutlets] = useState<Warehouse[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([api.listPieces({ status: "IN_MAIN" }), api.listWarehouses()]).then(([available, locations]) => {
      setPieces(available); setOutlets(locations.filter((warehouse) => warehouse.type === "OUTLET")); setTarget(locations.find((warehouse) => warehouse.type === "OUTLET")?.id ?? "");
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  const chosen = pieces.filter((piece) => selected.includes(piece.id));
  const total = useMemo(() => chosen.reduce((sum, piece) => sum + Number(piece.weight_kg), 0), [chosen]);
  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!selected.length || !target || !window.confirm(`Transfer ${selected.length} pieces (${total.toFixed(3)} kg) to the outlet?`)) return;
    setBusy(true);
    try { await api.createStockTransfer({ piece_ids: selected, to_warehouse_id: target, note: note || undefined }); router.push("/warehouse/transfers"); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to transfer pieces"); } finally { setBusy(false); }
  }
  if (error && !pieces.length && !outlets.length) return <ErrorState message={error} />;
  if (loading) return <LoadingState />;
  return <section><PageHeader title="New transfer" description="Select pieces currently in Main and move them to an Outlet warehouse." />
    <form onSubmit={submit} className="space-y-6"><Card><CardContent><label className="block text-sm font-medium">Target outlet<select required value={target} onChange={(event) => setTarget(event.target.value)} className="mt-2 h-10 w-full rounded-md border px-3">{outlets.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
      <label className="mt-5 block text-sm font-medium">Note<input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} className="mt-2 h-10 w-full rounded-md border px-3 font-normal" /></label></CardContent></Card>
      {!pieces.length ? <EmptyState>No pieces in Main are available to transfer.</EmptyState> : <Card><div className="divide-y">{pieces.map((piece) => <label key={piece.id} className="flex cursor-pointer items-center gap-3 p-4 text-sm"><input type="checkbox" checked={selected.includes(piece.id)} onChange={() => toggle(piece.id)} /><span className="font-medium">{piece.piece_code}</span><span className="text-slate-500">{piece.grade} · {piece.weight_kg} kg</span></label>)}</div></Card>}
      {error && <p className="text-sm text-red-600">{error}</p>}<div className="flex items-center justify-between"><p className="text-sm font-medium">Transferring {selected.length} pieces, {total.toFixed(3)} kg</p><div className="flex gap-3"><Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button><Button disabled={busy || !selected.length || !target}>{busy ? "Transferring…" : "Transfer pieces"}</Button></div></div>
    </form>
  </section>;
}
