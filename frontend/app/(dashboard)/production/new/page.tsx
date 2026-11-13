"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Coil } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/data-state";

const MACHINE_PRESETS = [
  "Slitter Line 01 (Heavy Gauge)",
  "Slitter Line 02 (Precision Slit)",
  "Cut-to-Length Line CTL-01",
  "Shearing Station Alpha",
  "Rotary Trimmer 02",
];

export default function NewProductionPage() {
  const router = useRouter();
  const [coils, setCoils] = useState<Coil[]>([]);
  const [coilId, setCoilId] = useState("");
  const [machine, setMachine] = useState("Slitter Line 01 (Heavy Gauge)");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listCoils()
      .then((data) => {
        // Filter coils that can be slit (IN_STOCK or IN_PRODUCTION)
        const available = data.filter((c) => c.status !== "CONSUMED");
        setCoils(available);
        const preset = new URLSearchParams(window.location.search).get("coil_id");
        if (preset && available.some((c) => c.id === preset)) {
          setCoilId(preset);
        } else if (available.length > 0) {
          setCoilId(available[0].id);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedCoil = useMemo(() => {
    return coils.find((c) => c.id === coilId);
  }, [coils, coilId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!coilId) {
      setError("Please select a source coil.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const run = await api.createProductionRun({
        coil_id: coilId,
        machine_type: machine.trim() || "Slitter Line 01",
      });
      router.push(`/production/${run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to initiate production run");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/production"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          ← Back to Production Runs
        </Link>
        <div className="mt-2">
          <PageHeader
            title="Initiate Slitting / Cut Run"
            description="Mount a master coil onto a slitting line to stage traceable output cuts and pieces."
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={submit} className="space-y-6 lg:col-span-2">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          <Card className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              1. Source Master Coil
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Select the raw coil from stock to be processed on the line.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase text-slate-600">
                Coil Identification <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={coilId}
                onChange={(e) => setCoilId(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                {coils.length === 0 && <option value="">No available master coils in inventory</option>}
                {coils.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.coil_number} — {c.grade} ({c.thickness_mm} × {c.width_mm} mm, {Number(c.total_weight_kg).toLocaleString()} kg) [{c.status}]
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              2. Slitting Machine & Processing Station
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Designate the production machinery executing the cut schedule.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Select Machine Station
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MACHINE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMachine(preset)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${machine === preset
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Or Custom Machine Identifier <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={machine}
                  onChange={(e) => setMachine(e.target.value)}
                  placeholder="e.g. Slitter Bay 3"
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button disabled={saving || !coilId || coils.length === 0}>
              {saving ? "Mounting & Starting..." : "Mount Coil & Start Run →"}
            </Button>
          </div>
        </form>

        {/* Selected Coil Blueprint Sidepanel */}
        <div>
          <Card className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Selected Coil Blueprint
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Dimensional constraints and metallurgic origin.
            </p>

            {selectedCoil ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-xs font-medium text-slate-500">Coil Number:</span>
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {selectedCoil.coil_number}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-xs font-medium text-slate-500">Heat Number:</span>
                  <span className="font-mono text-xs font-semibold text-slate-900">
                    {selectedCoil.heat_number}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-xs font-medium text-slate-500">Steel Grade:</span>
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {selectedCoil.grade}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-xs font-medium text-slate-500">Dimensions:</span>
                  <span className="font-mono text-xs font-semibold text-slate-900">
                    {selectedCoil.thickness_mm} × {selectedCoil.width_mm} mm
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-xs font-medium text-slate-500">Mother Mass:</span>
                  <span className="font-mono text-xs font-bold text-slate-900">
                    {Number(selectedCoil.total_weight_kg).toLocaleString()} kg
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <span className="text-xs font-medium text-slate-500">Supplier:</span>
                  <span className="text-xs font-medium text-slate-800">
                    {selectedCoil.supplier}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-400">No coil selected.</p>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
