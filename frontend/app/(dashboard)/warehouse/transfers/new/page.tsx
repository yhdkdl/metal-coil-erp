"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listPieces({ status: "IN_MAIN" }), api.listWarehouses()])
      .then(([available, locations]) => {
        setPieces(available);
        const outletLocations = locations.filter((w) => w.type === "OUTLET");
        setOutlets(outletLocations);
        setTarget(outletLocations[0]?.id ?? "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredPieces = useMemo(() => {
    if (!search.trim()) return pieces;
    const q = search.toLowerCase();
    return pieces.filter(
      (p) =>
        p.piece_code.toLowerCase().includes(q) ||
        p.grade.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [pieces, search]);

  const chosen = useMemo(() => {
    const set = new Set(selected);
    return pieces.filter((p) => set.has(p.id));
  }, [pieces, selected]);

  const totalWeightKg = useMemo(
    () => chosen.reduce((sum, p) => sum + Number(p.weight_kg || 0), 0),
    [chosen]
  );

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function selectAllVisible() {
    const visibleIds = filteredPieces.map((p) => p.id);
    setSelected((prev) => Array.from(new Set([...prev, ...visibleIds])));
  }

  function clearSelection() {
    setSelected([]);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!selected.length || !target) {
      setError("Please select at least one piece and a target outlet warehouse.");
      return;
    }

    const targetName = outlets.find((o) => o.id === target)?.name || "selected outlet";
    if (
      !window.confirm(
        `Confirm stock transfer of ${selected.length} pieces (${totalWeightKg.toFixed(1)} kg) to ${targetName}?`
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      await api.createStockTransfer({
        piece_ids: selected,
        to_warehouse_id: target,
        note: note.trim() || undefined,
      });
      router.push("/warehouse/transfers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to execute stock transfer");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error && !pieces.length && !outlets.length) return <ErrorState message={error} />;

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/warehouse/transfers"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          ← Back to Stock Transfers
        </Link>
        <div className="mt-2">
          <PageHeader
            title="Dispatch Stock Transfer"
            description="Relocate finished piece inventory from Main Central Plant to a regional Retail Outlet."
          />
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Step 1: Destination and Memo */}
        <Card className="p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            1. Destination Outlet & Manifest Memo
          </h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">
                Target Retail Outlet <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                {outlets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} (Retail Outlet)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">
                Transfer Memo / Truck Manifest (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Truck #4, Driver Mike, dispatch for weekend orders"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>
        </Card>

        {/* Step 2: Select Pieces */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-4 sm:flex sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                2. Select Finished Pieces in Main Yard
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {pieces.length} available items in central inventory
              </p>
            </div>

            <div className="mt-3 flex items-center gap-2 sm:mt-0">
              <button
                type="button"
                onClick={selectAllVisible}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Select All Filtered ({filteredPieces.length})
              </button>
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          <div className="border-b border-slate-100 bg-slate-50/50 p-3 sm:flex sm:items-center sm:justify-between gap-3">
            <input
              type="text"
              placeholder="Filter by piece code, grade, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full max-w-sm rounded-lg border border-slate-200 px-3 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <div className="mt-2 sm:mt-0 text-[11px] text-slate-500 font-medium sm:hidden flex items-center gap-1">
              <span>↔ Swipe table horizontally to see all specifications</span>
            </div>
          </div>

          {filteredPieces.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              {pieces.length === 0
                ? "No finished pieces currently in Main warehouse ready for transfer."
                : "No pieces match your filter."}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto overflow-x-auto w-full max-w-full touch-pan-x overscroll-x-contain">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead className="sticky top-0 border-b border-slate-200 bg-white text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3 sm:px-4 w-10 text-center">Select</th>
                    <th className="py-2.5 px-3 sm:px-4 whitespace-nowrap">Piece Code</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Category</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Grade</th>
                    <th className="py-2.5 px-4 whitespace-nowrap">Dimensions (T × W × L)</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap">Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPieces.map((piece) => {
                    const isChecked = selected.includes(piece.id);
                    return (
                      <tr
                        key={piece.id}
                        onClick={() => toggle(piece.id)}
                        className={`cursor-pointer transition-colors ${
                          isChecked ? "bg-blue-50/70 hover:bg-blue-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="py-2.5 px-3 sm:px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggle(piece.id)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                          {piece.piece_code}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                          {piece.category}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                          {piece.grade}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                          {piece.thickness_mm} × {piece.width_mm} × {piece.length_mm} mm
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-right font-mono text-xs font-medium text-slate-900 whitespace-nowrap">
                          {Number(piece.weight_kg).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Dispatch Action Bar */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Transfer Manifest Summary
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-lg font-bold text-slate-900">
                {selected.length} pieces selected
              </span>
              <span className="text-sm font-semibold text-blue-600 font-mono">
                {totalWeightKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
              </span>
              <span className="text-xs text-slate-500">
                ({(totalWeightKg / 1000).toFixed(2)} metric tons)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button disabled={busy || selected.length === 0 || !target}>
              {busy ? "Dispatching..." : `Dispatch Transfer (${selected.length} items)`}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
