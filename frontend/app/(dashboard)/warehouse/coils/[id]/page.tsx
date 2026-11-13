"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { CoilDetail } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";

const formatCurrency = (val?: number | string | null) => {
  if (val == null || val === "") return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

export default function CoilDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [coil, setCoil] = useState<CoilDetail>();
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      api
        .getCoil(id)
        .then(setCoil)
        .catch((e) => setError(e.message));
    }
  }, [id]);

  const stats = useMemo(() => {
    if (!coil) return null;
    const pieces = coil.pieces || [];
    const producedWeight = pieces.reduce((sum, p) => sum + Number(p.weight_kg || 0), 0);
    const totalWeight = Number(coil.total_weight_kg || 0);
    const yieldPct = totalWeight > 0 ? (producedWeight / totalWeight) * 100 : 0;
    const soldCount = pieces.filter((p) => p.status === "SOLD").length;
    const inStockCount = pieces.filter((p) => p.status !== "SOLD").length;

    return {
      piecesCount: pieces.length,
      producedWeight,
      yieldPct,
      soldCount,
      inStockCount,
    };
  }, [coil]);

  if (error) return <ErrorState message={error} />;
  if (!coil) return <LoadingState />;

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/warehouse/coils"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          ← Back to Master Coils
        </Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title={coil.coil_number}
            description={`Received on ${new Date(coil.created_at).toLocaleDateString()} · Heat #${coil.heat_number} · ${coil.supplier}`}
          />
          <div className="flex items-center gap-3">
            <StatusBadge value={coil.status} />
            {coil.status !== "CONSUMED" && (
              <Link
                href={`/production/new?coil_id=${coil.id}`}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
              >
                Slit / Cut Coil →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Coil Metallurgical & Procurement Specifications
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
            <div>
              <span className="text-xs font-semibold uppercase text-slate-400">Heat Number</span>
              <p className="mt-1 font-mono text-sm font-medium text-slate-900">{coil.heat_number}</p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase text-slate-400">Supplier / Mill</span>
              <p className="mt-1 text-sm font-medium text-slate-900">{coil.supplier}</p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase text-slate-400">Steel Grade</span>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{coil.grade}</p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase text-slate-400">Dimensions</span>
              <p className="mt-1 font-mono text-sm font-medium text-slate-900">
                {coil.thickness_mm} × {coil.width_mm} mm
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <span className="text-xs font-semibold uppercase text-slate-400">Gross Inbound Weight</span>
              <p className="mt-1 font-mono text-base font-bold text-slate-900">
                {Number(coil.total_weight_kg).toLocaleString()} kg
              </p>
              <span className="text-xs text-slate-500">
                {(Number(coil.total_weight_kg) / 1000).toFixed(2)} MT
              </span>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <span className="text-xs font-semibold uppercase text-slate-400">Unit Purchase Cost</span>
              <p className="mt-1 font-mono text-base font-bold text-slate-900">
                {formatCurrency(coil.cost_per_kg)}
                <span className="text-xs font-normal text-slate-500">/kg</span>
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <span className="text-xs font-semibold uppercase text-slate-400">Total Purchase Cost</span>
              <p className="mt-1 font-mono text-base font-bold text-slate-900">
                {formatCurrency(coil.total_cost)}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <span className="text-xs font-semibold uppercase text-slate-400">Yield Recovery</span>
              <p className="mt-1 font-mono text-base font-bold text-emerald-600">
                {stats?.yieldPct.toFixed(1)}%
              </p>
              <span className="text-xs text-slate-500">
                {stats?.producedWeight.toLocaleString()} kg produced
              </span>
            </div>
          </div>
        </Card>

        {/* Traceability & Processing Quick Card */}
        <Card className="flex flex-col justify-between p-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Downstream Traceability
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Mother coil lineage tracks every cut piece and slitting run back to Heat #{coil.heat_number}.
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs">
                <span className="text-slate-600">Produced Pieces:</span>
                <span className="font-bold text-slate-900">{stats?.piecesCount} items</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs">
                <span className="text-slate-600">Pieces Sold:</span>
                <span className="font-bold text-blue-600">{stats?.soldCount} items</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs">
                <span className="text-slate-600">In Stock:</span>
                <span className="font-bold text-emerald-600">{stats?.inStockCount} items</span>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4">
            {coil.status === "CONSUMED" ? (
              <span className="text-xs font-medium text-slate-400">
                Coil completely consumed in production.
              </span>
            ) : (
              <Link
                className="block w-full rounded-lg bg-slate-900 py-2 text-center text-xs font-medium text-white hover:bg-slate-800"
                href={`/production/new?coil_id=${coil.id}`}
              >
                Launch Slitting / Cut Run
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* Produced Pieces Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Produced Finished & Semi-Finished Pieces ({coil.pieces?.length || 0})
          </h2>
        </div>

        {!coil.pieces?.length ? (
          <EmptyState>No cut pieces have been produced from this mother coil yet.</EmptyState>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Piece Code</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Dimensions (T × W × L)</th>
                    <th className="py-3 px-4 text-right">Weight</th>
                    <th className="py-3 px-4 text-right">Cost Basis</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coil.pieces.map((piece) => (
                    <tr key={piece.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <Link
                          className="font-mono text-sm font-semibold text-slate-900 hover:text-blue-600 hover:underline"
                          href={`/warehouse/pieces/${piece.id}`}
                        >
                          {piece.piece_code}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {piece.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">
                        {piece.thickness_mm} × {piece.width_mm} × {piece.length_mm} mm
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs font-medium text-slate-900">
                        {Number(piece.weight_kg).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-600">
                        {formatCurrency(piece.allocated_cost)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs font-medium text-slate-900">
                        {piece.selling_price ? formatCurrency(piece.selling_price) : (
                          <span className="text-amber-600">Unpriced</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge value={piece.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/warehouse/pieces/${piece.id}`}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          Inspect →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}
