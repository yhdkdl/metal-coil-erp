"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function CoilForm() {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({
    coil_number: "",
    heat_number: "",
    supplier: "",
    grade: "",
    thickness_mm: "",
    width_mm: "",
    total_weight_kg: "",
    cost_per_kg: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const weight = parseFloat(values.total_weight_kg) || 0;
  const unitCost = parseFloat(values.cost_per_kg) || 0;
  const totalCost = useMemo(() => weight * unitCost, [weight, unitCost]);

  function handleChange(name: string, val: string) {
    setValues((prev) => ({ ...prev, [name]: val }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const numericFields = ["thickness_mm", "width_mm", "total_weight_kg", "cost_per_kg"];
      const input = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [
          k,
          numericFields.includes(k) ? Number(v) : v,
        ])
      );

      const coil = await api.createCoil(input as never);
      router.push(`/warehouse/coils/${coil.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register coil");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Origin & Heat Identification */}
      <Card className="p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
          1. Origin & Heat Identification
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Enter manufacturer mill tags and metallurgical pedigree.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Coil Number <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="e.g. COIL-2024-001"
              value={values.coil_number}
              onChange={(e) => handleChange("coil_number", e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Heat Number <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="e.g. H-89219A"
              value={values.heat_number}
              onChange={(e) => handleChange("heat_number", e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Supplier / Mill <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="e.g. ArcelorMittal / POSCO"
              value={values.supplier}
              onChange={(e) => handleChange("supplier", e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Steel Grade <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="e.g. S235JR / SS400 / DX51D"
              value={values.grade}
              onChange={(e) => handleChange("grade", e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>
      </Card>

      {/* Physical & Financial Specifications */}
      <Card className="p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
          2. Physical Dimensions & Procurement Valuation
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Enter dimensional caliper measurements, weighbridge mass, and acquisition unit cost.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Thickness (mm) <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              step="0.001"
              min="0.1"
              placeholder="e.g. 2.50"
              value={values.thickness_mm}
              onChange={(e) => handleChange("thickness_mm", e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Width (mm) <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              step="0.1"
              min="10"
              placeholder="e.g. 1250"
              value={values.width_mm}
              onChange={(e) => handleChange("width_mm", e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Weighbridge Total Weight (kg) <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="1"
              placeholder="e.g. 21500"
              value={values.total_weight_kg}
              onChange={(e) => handleChange("total_weight_kg", e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Unit Purchase Cost ($/kg) <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              step="0.0001"
              min="0.01"
              placeholder="e.g. 1.15"
              value={values.cost_per_kg}
              onChange={(e) => handleChange("cost_per_kg", e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* Live Calculation Preview Banner */}
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-900">
            Valuation & Mass Live Calculation
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <div className="text-xs text-blue-700">Calculated Metric Tonnage</div>
              <div className="mt-1 text-xl font-bold text-blue-950 font-mono">
                {weight > 0 ? (weight / 1000).toFixed(3) : "0.000"} MT
              </div>
            </div>

            <div>
              <div className="text-xs text-blue-700">Unit Acquisition Cost</div>
              <div className="mt-1 text-xl font-bold text-blue-950 font-mono">
                {unitCost > 0
                  ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(unitCost) + "/kg"
                  : "$0.00/kg"}
              </div>
            </div>

            <div>
              <div className="text-xs text-blue-700">Total Purchase Commitment</div>
              <div className="mt-1 text-xl font-bold text-blue-950 font-mono">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalCost)}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Submission Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button disabled={saving || weight <= 0 || unitCost <= 0}>
          {saving ? "Receiving Coil..." : "Receive & Log Coil"}
        </Button>
      </div>
    </form>
  );
}
