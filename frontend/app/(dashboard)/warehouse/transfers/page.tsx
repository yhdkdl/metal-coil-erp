"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { StockTransfer, Warehouse } from "@/types";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([api.listStockTransfers(), api.listWarehouses()])
      .then(([items, locations]) => {
        setTransfers(items);
        setWarehouses(locations);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const warehouseMap = useMemo(() => {
    const map = new Map<string, Warehouse>();
    warehouses.forEach((w) => map.set(w.id, w));
    return map;
  }, [warehouses]);

  const name = (id: string) => warehouseMap.get(id)?.name ?? `Whs-${id.slice(0, 6)}`;

  const stats = useMemo(() => {
    const count = transfers.length;
    const totalPieces = transfers.reduce((sum, t) => sum + (t.piece_count || 0), 0);
    const totalWeightKg = transfers.reduce((sum, t) => sum + Number(t.total_weight_kg || 0), 0);
    return { count, totalPieces, totalTonnage: totalWeightKg / 1000 };
  }, [transfers]);

  const filtered = useMemo(() => {
    if (!search.trim()) return transfers;
    const q = search.toLowerCase();
    return transfers.filter((t) => {
      const fromName = name(t.from_warehouse_id).toLowerCase();
      const toName = name(t.to_warehouse_id).toLowerCase();
      const note = (t.note || "").toLowerCase();
      const id = t.transfer_group_id.toLowerCase();
      return fromName.includes(q) || toName.includes(q) || note.includes(q) || id.includes(q);
    });
  }, [transfers, search, warehouseMap]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Inter-Warehouse Stock Transfers"
        description="Audit movements of finished inventory between central processing yard and regional retail outlets."
        action="Initiate Transfer"
        href="/warehouse/transfers/new"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Transfers Logged
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.count}</span>
            <span className="text-xs text-slate-500">dispatches</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Pieces Relocated
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{stats.totalPieces}</span>
            <span className="text-xs text-slate-500">finished cuts</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Relocated Mass Tonnage
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalTonnage.toFixed(2)}</span>
            <span className="text-xs text-slate-500">metric tons</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search warehouse, transfer ID, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
      </Card>

      {/* Transfers Data Table */}
      {filtered.length === 0 ? (
        <EmptyState>
          {transfers.length === 0 ? "No warehouse transfers recorded yet." : "No transfers match your search query."}
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-3 sm:px-4">Date & Time</th>
                  <th className="py-3 px-4 hidden md:table-cell">Transfer ID</th>
                  <th className="py-3 px-3 sm:px-4">Route</th>
                  <th className="py-3 px-2 sm:px-4 text-right">Items</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Total Weight</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Manifest Memo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => (
                  <tr key={t.transfer_group_id} className="transition-colors hover:bg-slate-50/80">
                    <td className="py-3 px-3 sm:px-4 text-xs text-slate-600">
                      <div className="font-medium text-slate-900">
                        {new Date(t.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-slate-400 text-[10px]">
                        {new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {t.note && (
                        <div className="text-[10px] text-slate-500 italic sm:hidden mt-0.5 max-w-[140px] truncate">
                          {t.note}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-800 hidden md:table-cell">
                      {t.transfer_group_id.slice(0, 8)}…
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 text-xs">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 text-[11px] truncate max-w-[110px]">
                          {name(t.from_warehouse_id)}
                        </span>
                        <span className="text-slate-400 text-[10px] hidden sm:inline">→</span>
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700 text-[11px] truncate max-w-[110px]">
                          {name(t.to_warehouse_id)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-right font-mono text-xs font-bold text-slate-900">
                      {t.piece_count} <span className="hidden sm:inline">pcs</span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right font-mono text-xs font-medium text-slate-900">
                      {Number(t.total_weight_kg).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                      <div className="text-[10px] text-slate-400">
                        {(Number(t.total_weight_kg) / 1000).toFixed(2)} MT
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 hidden sm:table-cell">
                      {t.note ? (
                        <span className="italic">{t.note}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-500">
            Showing {filtered.length} of {transfers.length} transfers
          </div>
        </Card>
      )}
    </section>
  );
}
