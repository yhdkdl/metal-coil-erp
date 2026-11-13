"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { PieceTrace } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  PackageCheck,
  Layers3,
  Factory,
  Warehouse,
  ArrowLeft,
  DollarSign,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";

export default function PieceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [trace, setTrace] = useState<PieceTrace>();
  const [error, setError] = useState("");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) {
      api.getPieceTrace(id)
        .then(setTrace)
        .catch((e) => setError(e.message));
    }
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!trace) return <LoadingState />;

  const { piece, parent_coil: coil, production_run: run, movements } = trace;
  const canSetPrice =
    typeof window !== "undefined" &&
    ["ADMIN", "FINANCE"].includes(localStorage.getItem("user_role") ?? "");

  async function handleUpdatePrice(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");

    const numPrice = parseFloat(price);
    const minPrice = parseFloat(piece.min_selling_price);

    if (numPrice < minPrice) {
      setError(`Selling price cannot be below minimum $${minPrice.toFixed(2)}`);
      return;
    }

    setBusy(true);
    try {
      const updated = await api.updatePiecePrice(piece.id, {
        selling_price: price,
        reason: "Individual piece price update via trace terminal",
      });
      setTrace((prev) => (prev ? { ...prev, piece: { ...prev.piece, ...updated } } : prev));
      setPrice("");
      setMessage("Selling price updated successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update piece price");
    } finally {
      setBusy(false);
    }
  }

  const warehouseDisplay =
    piece.warehouse_name ||
    (piece.status === "IN_MAIN"
      ? "Main Production Warehouse"
      : piece.status === "IN_OUTLET"
      ? "Retail Outlet Warehouse"
      : "Dispatched / Sold");

  return (
    <section className="space-y-6">
      {/* Back link & Header */}
      <div>
        <Link
          href="/warehouse/pieces"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2"
        >
          <ArrowLeft size={14} /> Back to Piece Inventory
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title={piece.piece_code}
            description={`Produced on ${new Date(piece.created_at).toLocaleDateString()} · Grade: ${piece.grade}`}
          />
          <StatusBadge value={piece.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details Card (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Piece Specifications & Valuation</h3>
                  <p className="text-xs text-slate-500">
                    Physical dimensions, grade specifications, and cost allocations.
                  </p>
                </div>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <dt className="text-slate-400 font-semibold uppercase">Category / Profile</dt>
                  <dd className="mt-1 text-sm font-bold text-slate-900">{piece.category}</dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <dt className="text-slate-400 font-semibold uppercase">Steel Grade</dt>
                  <dd className="mt-1 text-sm font-bold text-slate-900">{piece.grade}</dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <dt className="text-slate-400 font-semibold uppercase">Thickness</dt>
                  <dd className="mt-1 text-sm font-bold font-mono text-slate-900">{piece.thickness_mm} mm</dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <dt className="text-slate-400 font-semibold uppercase">Sheet Dimensions</dt>
                  <dd className="mt-1 text-sm font-bold font-mono text-slate-900">
                    {piece.width_mm} × {piece.length_mm} mm
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <dt className="text-slate-400 font-semibold uppercase">Unit Weight</dt>
                  <dd className="mt-1 text-sm font-bold font-mono text-slate-900">{piece.weight_kg} kg</dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <dt className="text-slate-400 font-semibold uppercase">Warehouse Location</dt>
                  <dd className="mt-1 text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Warehouse size={14} className="text-slate-500" />
                    {warehouseDisplay}
                  </dd>
                </div>
              </dl>

              {/* Pricing & Financial Box */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Pricing & Unit Economics
                </h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <span className="text-xs text-slate-500">Allocated Raw Material Cost</span>
                    <p className="mt-1 text-xl font-bold font-mono text-slate-800">
                      ${parseFloat(piece.allocated_cost).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500">Floor Minimum Selling Price</span>
                    <p className="mt-1 text-xl font-bold font-mono text-slate-800">
                      ${parseFloat(piece.min_selling_price).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500">Preset Selling Price</span>
                    <p className={`mt-1 text-xl font-bold font-mono ${piece.selling_price ? "text-emerald-600" : "text-amber-600"}`}>
                      {piece.selling_price ? `$${parseFloat(piece.selling_price).toFixed(2)}` : "Price Not Set"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Set Selling Price Form (Finance/Admin) */}
          {canSetPrice && piece.status !== "SOLD" && (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <h4 className="text-sm font-bold text-slate-900 mb-1">Set or Update Selling Price</h4>
                <p className="text-xs text-slate-500 mb-4">
                  Pieces cannot be sold until a preset price is set at or above the minimum floor ($
                  {parseFloat(piece.min_selling_price).toFixed(2)}).
                </p>

                <form onSubmit={handleUpdatePrice} className="space-y-3">
                  <div className="flex gap-3">
                    <div className="relative flex-1 max-w-xs">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                      <input
                        required
                        type="number"
                        min={piece.min_selling_price}
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder={piece.selling_price || "0.00"}
                        className="h-10 w-full rounded-lg border border-slate-300 pl-8 pr-3 text-sm font-mono focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                    <Button disabled={busy}>
                      {busy ? "Saving..." : "Save Selling Price"}
                    </Button>
                  </div>

                  {message && (
                    <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> {message}
                    </p>
                  )}
                  {error && (
                    <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                      <AlertCircle size={14} /> {error}
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          )}

          {/* Stock Movement Audit Log */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <History size={16} className="text-slate-500" />
                  Stock Movement & Traceability History
                </h3>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  {movements.length} log events
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Movement Type</th>
                      <th className="p-3.5 text-right">Weight</th>
                      <th className="p-3.5">Log Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-xs text-slate-500">
                          No movements logged.
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => (
                        <tr key={m.id} className="transition hover:bg-slate-50/70">
                          <td className="p-3.5 font-mono text-xs text-slate-600">
                            {new Date(m.created_at).toLocaleString()}
                          </td>
                          <td className="p-3.5">
                            <StatusBadge value={m.movement_type} />
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                            {m.weight_kg} kg
                          </td>
                          <td className="p-3.5 text-xs text-slate-500">{m.note ?? "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3): Parent Coil & Production Run Lineage */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Layers3 size={17} className="text-amber-500" />
                Mother Coil Lineage
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
                    <dt className="text-slate-400 font-semibold uppercase">Supplier</dt>
                    <dd className="mt-0.5 text-slate-700">{coil.supplier}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-xs text-rose-600">Source coil lineage unavailable</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Factory size={17} className="text-blue-600" />
                Production Run Trace
              </h3>

              {run ? (
                <dl className="space-y-3 text-xs">
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase">Run Terminal</dt>
                    <dd className="mt-0.5">
                      <Link
                        href={`/production/${run.id}`}
                        className="text-sm font-bold text-blue-600 hover:underline"
                      >
                        Run #{run.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase">Machine Line</dt>
                    <dd className="mt-0.5 font-semibold text-slate-800">{run.machine_type}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase">Run Status</dt>
                    <dd className="mt-1">
                      <StatusBadge value={run.status} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 font-semibold uppercase">Run Date</dt>
                    <dd className="mt-0.5 font-mono text-slate-600">
                      {new Date(run.started_at).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-xs text-slate-400">Direct production run unassigned.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
