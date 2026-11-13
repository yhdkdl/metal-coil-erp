"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Coil, ProductionOutputInput, ProductionRunDetail } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Factory,
  Layers3,
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  AlertCircle,
  Scale,
  Maximize2,
  Calendar,
  User,
} from "lucide-react";

const initial: ProductionOutputInput = {
  thickness_mm: "",
  width_mm: "",
  length_mm: "",
  weight_kg: "",
  grade: "",
  category: "",
  quantity: 1,
};

export default function ProductionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [run, setRun] = useState<ProductionRunDetail>();
  const [coil, setCoil] = useState<Coil>();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) {
      api.getProductionRun(id)
        .then((value) => {
          setRun(value);
          return api.getCoil(value.coil_id);
        })
        .then(setCoil)
        .catch((e) => setError(e.message));
    }
  }, [id]);

  const outputs = run?.outputs ?? [];
  const totalStagedWeight = useMemo(
    () => outputs.reduce((sum, item) => sum + Number(item.weight_kg), 0),
    [outputs]
  );
  const coilWeight = coil ? Number(coil.total_weight_kg) : 0;
  const yieldRatio = coilWeight > 0 ? (totalStagedWeight / coilWeight) * 100 : 0;

  async function addOutput(event: FormEvent) {
    event.preventDefault();
    if (!run) return;
    setBusy(true);
    setError("");
    try {
      await api.addProductionOutput(run.id, form);
      const refreshed = await api.getProductionRun(run.id);
      setRun(refreshed);
      setForm({ ...initial, grade: coil?.grade || "", category: form.category });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add output batch");
    } finally {
      setBusy(false);
    }
  }

  async function removeOutput(outputId: string) {
    if (!run) return;
    setBusy(true);
    try {
      await api.deleteProductionOutput(run.id, outputId);
      setRun({ ...run, outputs: outputs.filter((output) => output.id !== outputId) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete output");
    } finally {
      setBusy(false);
    }
  }

  async function finish(action: "complete" | "cancel") {
    if (!run) return;
    if (
      action === "cancel" &&
      !window.confirm("Cancel this production run? The source coil will return to available inventory.")
    ) {
      return;
    }
    if (
      action === "complete" &&
      !window.confirm(
        `Finalize run and generate ${outputs.length} traceable pieces (${totalStagedWeight.toFixed(2)} kg)?`
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      if (action === "complete") {
        await api.completeProductionRun(run.id);
        router.push(`/warehouse/coils/${run.coil_id}`);
      } else {
        const updated = await api.cancelProductionRun(run.id);
        setRun({ ...run, ...updated, outputs: [] });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update production run");
    } finally {
      setBusy(false);
    }
  }

  function setField(key: keyof ProductionOutputInput, value: string | number) {
    setForm({ ...form, [key]: value });
  }

  if (error && !run) return <ErrorState message={error} />;
  if (!run) return <LoadingState />;

  const isOpen = run.status === "OPEN";

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/production"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2"
        >
          <ArrowLeft size={14} /> Back to Production Runs
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title={`Operator Terminal: Run #${run.id.slice(0, 8).toUpperCase()}`}
            description={`Machine Line: ${run.machine_type}`}
          />
          <StatusBadge value={run.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Work Area (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              {/* Output Yield Recovery Meter */}
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale size={18} className="text-blue-600" />
                    <span className="text-sm font-bold text-slate-900">Output Weight & Yield Recovery</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {totalStagedWeight.toFixed(2)} kg {coilWeight ? `of ${coilWeight.toLocaleString()} kg` : ""}
                  </span>
                </div>
                <div className="mt-2.5 h-3 w-full rounded-full bg-slate-100 overflow-hidden flex">
                  <div
                    style={{ width: `${Math.min(100, yieldRatio)}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      yieldRatio > 100 ? "bg-amber-500" : "bg-blue-600"
                    }`}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-slate-500 font-mono">
                  <span>{yieldRatio.toFixed(1)}% Yield recovered</span>
                  <span>{outputs.length} outputs staged</span>
                </div>
              </div>

              {/* Staged Outputs List */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Staged Output Pieces ({outputs.length})
                  </h3>
                </div>

                {outputs.length === 0 ? (
                  <EmptyState>No cuts staged yet. Add piece outputs below.</EmptyState>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 font-semibold uppercase tracking-wider text-slate-500">
                          <th className="p-3">#</th>
                          <th className="p-3">Name / Category</th>
                          <th className="p-3">Grade</th>
                          <th className="p-3">Dimensions (T × W × L)</th>
                          <th className="p-3 text-right">Piece Weight</th>
                          {isOpen && <th className="p-3 text-right">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {outputs.map((output, index) => (
                          <tr key={output.id} className="transition hover:bg-slate-50/70">
                            <td className="p-3 font-mono font-bold text-slate-400">{index + 1}</td>
                            <td className="p-3 font-bold text-slate-900">{output.category}</td>
                            <td className="p-3 text-slate-700">{output.grade}</td>
                            <td className="p-3 font-mono text-slate-600">
                              {output.thickness_mm} × {output.width_mm} × {output.length_mm} mm
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-800">
                              {output.weight_kg} kg
                            </td>
                            {isOpen && (
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => removeOutput(output.id)}
                                  className="text-slate-400 hover:text-rose-600 transition"
                                  title="Delete staged output"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Add Output Form (When OPEN) */}
              {isOpen && (
                <form onSubmit={addOutput} className="mt-6 border-t border-slate-100 pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Plus size={16} className="text-amber-500" />
                      Stage New Cut Batch
                    </h3>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600">Name / Category</label>
                      <input
                        required
                        placeholder="e.g. SHEET, SLIT_COIL"
                        value={form.category}
                        onChange={(e) => setField("category", e.target.value)}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600">Grade</label>
                      <input
                        required
                        placeholder="e.g. S235"
                        value={form.grade || coil?.grade || ""}
                        onChange={(e) => setField("grade", e.target.value)}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600">Thickness (mm)</label>
                      <input
                        required
                        type="number"
                        step="0.001"
                        placeholder="Thickness"
                        value={form.thickness_mm}
                        onChange={(e) => setField("thickness_mm", e.target.value)}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono focus:border-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600">Width (mm)</label>
                      <input
                        required
                        type="number"
                        step="0.001"
                        placeholder="Width"
                        value={form.width_mm}
                        onChange={(e) => setField("width_mm", e.target.value)}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono focus:border-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600">Length (mm)</label>
                      <input
                        required
                        type="number"
                        step="0.001"
                        placeholder="Length"
                        value={form.length_mm}
                        onChange={(e) => setField("length_mm", e.target.value)}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono focus:border-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600">Weight per Piece (kg)</label>
                      <input
                        required
                        type="number"
                        step="0.001"
                        placeholder="Piece weight"
                        value={form.weight_kg}
                        onChange={(e) => setField("weight_kg", e.target.value)}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono focus:border-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600">Quantity (pcs)</label>
                      <input
                        required
                        type="number"
                        min={1}
                        step="1"
                        value={form.quantity}
                        onChange={(e) => setField("quantity", Number(e.target.value))}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <Button className="mt-2" disabled={busy}>
                    {busy ? "Staging..." : "Stage Output Batch"}
                  </Button>
                </form>
              )}

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Terminal Finish Controls */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-3">
                {isOpen && (
                  <>
                    <Button
                      disabled={busy || outputs.length === 0}
                      onClick={() => finish("complete")}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    >
                      <CheckCircle2 size={16} className="mr-1.5" />
                      Complete & Generate Pieces
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => finish("cancel")}
                      className="text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      <XCircle size={16} className="mr-1.5" />
                      Cancel Run
                    </Button>
                  </>
                )}
                {!isOpen && coil && (
                  <Link
                    href={`/warehouse/coils/${coil.id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    View Source Coil {coil.coil_number}
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3): Source Coil & Run Metadata */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Layers3 size={17} className="text-amber-500" />
                Source Mother Coil
              </h3>

              {coil ? (
                <dl className="space-y-3 text-xs">
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase">Coil Number</dt>
                    <dd className="mt-0.5">
                      <Link
                        href={`/warehouse/coils/${coil.id}`}
                        className="text-sm font-bold text-blue-600 hover:underline"
                      >
                        {coil.coil_number}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase">Heat Number</dt>
                    <dd className="mt-0.5 font-mono text-slate-800">{coil.heat_number}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase">Steel Grade</dt>
                    <dd className="mt-0.5 font-bold text-slate-800">{coil.grade}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase">Raw Weight</dt>
                    <dd className="mt-0.5 font-mono font-bold text-slate-900">
                      {Number(coil.total_weight_kg).toLocaleString()} kg
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase">Original Dimensions</dt>
                    <dd className="mt-0.5 font-mono text-slate-700">
                      {coil.thickness_mm} × {coil.width_mm} mm
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase">Supplier</dt>
                    <dd className="mt-0.5 text-slate-700">{coil.supplier}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-xs text-slate-400">Loading source coil details...</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Factory size={17} className="text-slate-600" />
                Line Operator & Logs
              </h3>
              <dl className="space-y-2.5 text-xs">
                <div>
                  <dt className="text-slate-400 font-semibold uppercase">Operator</dt>
                  <dd className="mt-0.5 font-bold text-slate-800">
                    {run.operator_name || "Floor Operator"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-semibold uppercase">Run Started</dt>
                  <dd className="mt-0.5 font-mono text-slate-700">
                    {new Date(run.started_at).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-semibold uppercase">Run Completed</dt>
                  <dd className="mt-0.5 font-mono text-slate-700">
                    {run.completed_at ? new Date(run.completed_at).toLocaleString() : "Still running"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
