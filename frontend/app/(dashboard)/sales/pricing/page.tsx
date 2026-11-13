"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Piece } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/data-state";

const formatCurrency = (val?: number | string | null) => {
  if (val == null || val === "") return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

export default function PricingPage() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState("");
  const [grade, setGrade] = useState("");
  const [thickness, setThickness] = useState("");
  const [type, setType] = useState<"set" | "percent" | "absolute">("set");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    api
      .listPieces()
      .then(setPieces)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Compute unsold pieces and available categories/grades for quick select
  const unsoldPieces = useMemo(() => {
    return pieces.filter((p) => p.status !== "SOLD");
  }, [pieces]);

  const categories = useMemo(() => {
    return Array.from(new Set(pieces.map((p) => p.category).filter(Boolean)));
  }, [pieces]);

  const grades = useMemo(() => {
    return Array.from(new Set(pieces.map((p) => p.grade).filter(Boolean)));
  }, [pieces]);

  const unpricedCount = useMemo(() => {
    return unsoldPieces.filter((p) => p.selling_price == null || p.selling_price === "").length;
  }, [unsoldPieces]);

  // Live filter matching
  const matchingPieces = useMemo(() => {
    return unsoldPieces.filter((p) => {
      if (category && p.category.toLowerCase() !== category.toLowerCase()) return false;
      if (grade && p.grade.toLowerCase() !== grade.toLowerCase()) return false;
      if (thickness) {
        const t1 = parseFloat(p.thickness_mm);
        const t2 = parseFloat(thickness);
        if (Math.abs(t1 - t2) > 0.001) return false;
      }
      return true;
    });
  }, [unsoldPieces, category, grade, thickness]);

  const matchStats = useMemo(() => {
    const count = matchingPieces.length;
    const totalWeight = matchingPieces.reduce((sum, p) => sum + Number(p.weight_kg || 0), 0);
    const prices = matchingPieces
      .map((p) => (p.selling_price ? parseFloat(p.selling_price) : null))
      .filter((p): p is number => p != null && !isNaN(p));

    const minPrice = prices.length ? Math.min(...prices) : null;
    const maxPrice = prices.length ? Math.max(...prices) : null;
    const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

    return { count, totalWeight, minPrice, maxPrice, avgPrice };
  }, [matchingPieces]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatusMessage(null);

    if (!grade && !category && !thickness) {
      setStatusMessage({ text: "Please enter at least one filter criterion (Category, Grade, or Thickness).", isError: true });
      return;
    }

    if (matchingPieces.length === 0) {
      setStatusMessage({ text: "No unsold pieces currently match your criteria.", isError: true });
      return;
    }

    const confirmMsg =
      type === "set"
        ? `Set exact selling price of $${parseFloat(value).toFixed(2)} across ${matchStats.count} matching unsold pieces?`
        : `Apply ${type === "percent" ? `${value}%` : `$${value}`} adjustment across ${matchStats.count} pieces?`;

    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);
    try {
      const result = await api.bulkPriceUpdate({
        filter: {
          grade: grade.trim() || undefined,
          category: category.trim() || undefined,
          thickness_mm: thickness.trim() || undefined,
        },
        adjustment: { type, value },
        reason: reason.trim() || undefined,
      });

      setStatusMessage({
        text: `Successfully updated ${result.affected_count} pieces (${result.skipped_count} skipped/locked).`,
        isError: false,
      });

      // Refresh inventory
      const updated = await api.listPieces();
      setPieces(updated);
      setValue("");
    } catch (e) {
      setStatusMessage({
        text: e instanceof Error ? e.message : "Unable to execute bulk pricing update",
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Commercial Pricing Engine"
        description="Establish catalog list prices and execute bulk margin adjustments across unsold inventory."
      />

      {/* Unpriced Pieces Warning Banner */}
      {unpricedCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-sm font-bold text-amber-900">
              !
            </span>
            <div>
              <p className="text-sm font-semibold">
                {unpricedCount} unsold pieces currently require sales pricing
              </p>
              <p className="text-xs text-amber-700">
                Pieces without an active selling price cannot be added to customer sales orders.
              </p>
            </div>
          </div>
          <Link
            href="/warehouse/pieces"
            className="rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-300"
          >
            Review Pieces →
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bulk Pricing Configuration Form */}
        <form onSubmit={submit} className="space-y-6 lg:col-span-2">
          {statusMessage && (
            <div
              className={`rounded-lg border p-4 text-sm font-medium ${
                statusMessage.isError
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {/* Section 1: Filter Matching */}
          <Card className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              1. Target Inventory Criteria
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Select one or more specifications to target unsold pieces.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Category
                </label>
                <div className="mt-1.5 flex gap-1">
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. SHEET"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                {categories.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {categories.slice(0, 4).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className="text-[10px] text-blue-600 hover:underline"
                      >
                        +{c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Steel Grade
                </label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g. S235"
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                {grades.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {grades.slice(0, 4).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGrade(g)}
                        className="text-[10px] text-blue-600 hover:underline"
                      >
                        +{g}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Thickness (mm)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={thickness}
                  onChange={(e) => setThickness(e.target.value)}
                  placeholder="e.g. 2.50"
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>
          </Card>

          {/* Section 2: Pricing Formula */}
          <Card className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              2. Price Adjustment Formula
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Choose whether to set a benchmark fixed price or adjust current rates.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Pricing Mode
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as "set" | "percent" | "absolute")}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="set">Set Exact Fixed Price ($)</option>
                  <option value="percent">Percentage Adjustment (+% / -%)</option>
                  <option value="absolute">Fixed Delta Amount (+$ / -$)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  {type === "set"
                    ? "Selling Price ($)"
                    : type === "percent"
                    ? "Adjustment Percentage (%)"
                    : "Adjustment Amount ($)"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === "set" ? "e.g. 450.00" : "e.g. 10.00"}
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Commercial Justification / Audit Memo
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Q4 Base Index Adjustment or Mill Energy Surcharge"
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="submit"
              disabled={submitting || matchingPieces.length === 0 || !value}
            >
              {submitting ? "Applying Pricing..." : `Apply Pricing (${matchStats.count} pieces)`}
            </Button>
          </div>
        </form>

        {/* Live Matching Impact Panel */}
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Live Impact Preview
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Real-time calculation of pieces matching current criteria.
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-xs font-medium text-slate-600">Matching Inventory:</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {matchStats.count} pieces
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-xs font-medium text-slate-600">Matching Mass:</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {Number(matchStats.totalWeight).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-xs font-medium text-slate-600">Current Average Price:</span>
                <span className="font-mono text-sm font-semibold text-blue-600">
                  {matchStats.avgPrice != null ? formatCurrency(matchStats.avgPrice) : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-xs font-medium text-slate-600">Current Price Range:</span>
                <span className="font-mono text-xs text-slate-700">
                  {matchStats.minPrice != null
                    ? `${formatCurrency(matchStats.minPrice)} – ${formatCurrency(matchStats.maxPrice)}`
                    : "Unpriced"}
                </span>
              </div>
            </div>

            {value && parseFloat(value) > 0 && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
                <span className="font-semibold">Projected Effect:</span>{" "}
                {type === "set" ? (
                  <>
                    All {matchStats.count} pieces will be set to{" "}
                    <strong>{formatCurrency(value)}</strong>.
                  </>
                ) : type === "percent" ? (
                  <>
                    Existing prices will adjust by <strong>{value}%</strong>.
                  </>
                ) : (
                  <>
                    Existing prices will adjust by <strong>{formatCurrency(value)}</strong>.
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
