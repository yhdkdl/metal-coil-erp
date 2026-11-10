"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Coil, ProductionOutputInput, ProductionRunDetail } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";

const initial: ProductionOutputInput = { thickness_mm: "", width_mm: "", length_mm: "", weight_kg: "", grade: "", category: "", quantity: 1 };
export default function ProductionDetailPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const [run, setRun] = useState<ProductionRunDetail>(); const [coil, setCoil] = useState<Coil>(); const [form, setForm] = useState(initial); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (id) api.getProductionRun(id).then((value) => { setRun(value); return api.getCoil(value.coil_id); }).then(setCoil).catch((e) => setError(e.message)); }, [id]);
  const outputs = run?.outputs ?? []; const total = useMemo(() => outputs.reduce((sum, item) => sum + Number(item.weight_kg), 0), [outputs]); const coilWeight = coil ? Number(coil.total_weight_kg) : 0;
  async function addOutput(event: FormEvent) { event.preventDefault(); if (!run) return; setBusy(true); setError(""); try { await api.addProductionOutput(run.id, form); const refreshed = await api.getProductionRun(run.id); setRun(refreshed); setForm(initial); } catch (e) { setError(e instanceof Error ? e.message : "Unable to add output"); } finally { setBusy(false); } }
  async function removeOutput(outputId: string) { if (!run) return; setBusy(true); try { await api.deleteProductionOutput(run.id, outputId); setRun({ ...run, outputs: outputs.filter((output) => output.id !== outputId) }); } catch (e) { setError(e instanceof Error ? e.message : "Unable to delete output"); } finally { setBusy(false); } }
  async function finish(action: "complete" | "cancel") { if (!run) return; setBusy(true); try { const updated = action === "complete" ? await api.completeProductionRun(run.id) : await api.cancelProductionRun(run.id); if (action === "cancel") setRun({ ...run, ...updated, outputs: [] }); else router.push(`/warehouse/coils/${run.coil_id}`); } catch (e) { setError(e instanceof Error ? e.message : "Unable to update run"); } finally { setBusy(false); } }
  function setField(key: keyof ProductionOutputInput, value: string | number) { setForm({ ...form, [key]: value }); }
  if (error && !run) return <ErrorState message={error} />; if (!run) return <LoadingState />;
  return <section><PageHeader title="Operator terminal" description={`Run ${run.id}`} /><div className="grid gap-6 lg:grid-cols-3">
    <Card className="lg:col-span-2"><CardContent><div className="flex items-center justify-between border-b pb-5"><div><p className="text-sm text-slate-500">Machine</p><h2 className="text-2xl font-semibold">{run.machine_type}</h2></div><StatusBadge value={run.status} /></div>
      <div className="mt-6"><div className="mb-2 flex justify-between text-sm"><span>Output progress</span><span className="font-medium">{total.toFixed(3)} kg{coilWeight ? ` / ${coilWeight} kg` : ""}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-slate-900 transition-all" style={{ width: `${coilWeight ? Math.min(100, total / coilWeight * 100) : 0}%` }} /></div></div>
      <div className="mt-6"><h3 className="mb-3 font-semibold">Staged outputs ({outputs.length})</h3>{outputs.length === 0 ? <EmptyState>No outputs staged yet.</EmptyState> : <div className="space-y-2">{outputs.map((output, index) => <div key={output.id} className="flex items-center justify-between rounded-md border p-3 text-sm"><div><span className="font-medium">Output {index + 1}</span><span className="ml-3 text-slate-500">{output.grade} · {output.weight_kg} kg</span></div>{run.status === "OPEN" && <Button variant="outline" disabled={busy} onClick={() => removeOutput(output.id)}>Delete</Button>}</div>)}</div>}</div>
      {run.status === "OPEN" && <form onSubmit={addOutput} className="mt-6 border-t pt-6"><h3 className="mb-4 font-semibold">Add output</h3><div className="grid gap-4 sm:grid-cols-2">{[["grade","Grade"],["category","Category"],["thickness_mm","Thickness (mm)"],["width_mm","Width (mm)"],["length_mm","Length (mm)"],["weight_kg","Weight per piece (kg)"],["quantity","Quantity"]].map(([key, label]) => <label key={key} className="text-sm font-medium">{label}<input required min={key === "quantity" ? 1 : undefined} type={["thickness_mm","width_mm","length_mm","weight_kg","quantity"].includes(key) ? "number" : "text"} step={key === "quantity" ? "1" : "0.001"} value={String(form[key as keyof ProductionOutputInput] ?? "")} onChange={(e) => setField(key as keyof ProductionOutputInput, key === "quantity" ? Number(e.target.value) : e.target.value)} className="mt-1 h-10 w-full rounded-md border px-3 font-normal" /></label>)}</div><Button className="mt-4" disabled={busy}>Add output batch</Button></form>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3">{run.status === "OPEN" && <><Button disabled={busy || outputs.length === 0} onClick={() => finish("complete")}>Complete run</Button><Button variant="outline" disabled={busy} onClick={() => finish("cancel")}>Cancel run</Button></>}{run.status !== "OPEN" && <Button variant="outline" onClick={() => router.push(`/warehouse/coils/${run.coil_id}`)}>View source coil</Button>}</div>
    </CardContent></Card>
    <Card><CardContent><h2 className="font-semibold">Run details</h2><dl className="mt-4 space-y-4 text-sm"><div><dt className="text-xs uppercase text-slate-500">Source coil</dt><dd className="mt-1 break-all font-medium">{run.coil_id}</dd></div><div><dt className="text-xs uppercase text-slate-500">Operator</dt><dd className="mt-1 break-all font-medium">{run.operator_id}</dd></div><div><dt className="text-xs uppercase text-slate-500">Started</dt><dd className="mt-1 font-medium">{new Date(run.started_at).toLocaleString()}</dd></div></dl></CardContent></Card>
  </div></section>;
}
