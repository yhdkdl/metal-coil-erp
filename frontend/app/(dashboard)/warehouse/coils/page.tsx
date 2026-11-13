"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Coil } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";

const formatCurrency = (val?: number | string | null) => {
  if (val == null || val === "") return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

export default function CoilsPage() {
  const [coils, setCoils] = useState<Coil[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    api
      .listCoils()
      .then(setCoils)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => {
    const totalCount = coils.length;
    const inStock = coils.filter((c) => c.status === "IN_STOCK");
    const inProduction = coils.filter((c) => c.status === "IN_PRODUCTION");
    const consumed = coils.filter((c) => c.status === "CONSUMED");
    const inStockWeightKg = inStock.reduce((sum, c) => sum + Number(c.total_weight_kg || 0), 0);
    const totalTonnage = inStockWeightKg / 1000;

    return {
      totalCount,
      inStockCount: inStock.length,
      inProductionCount: inProduction.length,
      consumedCount: consumed.length,
      totalTonnage,
    };
  }, [coils]);

  const filteredCoils = useMemo(() => {
    return coils.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (!debouncedSearch) return true;
      const haystack = `${c.coil_number} ${c.heat_number} ${c.supplier} ${c.grade}`.toLowerCase();
      return haystack.includes(debouncedSearch);
    });
  }, [coils, statusFilter, debouncedSearch]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <section className="space-y-6">
      <PageHeader
        title="Master Coils"
        description="Raw material inventory, heat tracing, and metallurgical specifications."
        action="Receive Coil"
        href="/warehouse/coils/new"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available Stock</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{kpis.inStockCount}</span>
            <span className="text-xs text-slate-500">coils in yard</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available Mass</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{kpis.totalTonnage.toFixed(1)}</span>
            <span className="text-xs text-slate-500">metric tons</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">In Production</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{kpis.inProductionCount}</span>
            <span className="text-xs text-slate-500">on processing lines</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Lifecycle</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{kpis.totalCount}</span>
            <span className="text-xs text-slate-500">coils ({kpis.consumedCount} consumed)</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
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
              placeholder="Search coil #, heat #, supplier, or grade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["ALL", "IN_STOCK", "IN_PRODUCTION", "CONSUMED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === st
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                {st === "ALL" ? "All Coils" : st.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Main Coils Table */}
      {filteredCoils.length === 0 ? (
        <EmptyState>
          {coils.length === 0 ? "No master coils in inventory." : "No coils match your search criteria."}
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Coil Number</th>
                  <th className="py-3 px-4">Heat / Supplier</th>
                  <th className="py-3 px-4">Grade</th>
                  <th className="py-3 px-4">Dimensions</th>
                  <th className="py-3 px-4 text-right">Weight</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCoils.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <Link
                        className="font-mono text-sm font-semibold text-slate-900 hover:text-blue-600 hover:underline"
                        href={`/warehouse/coils/${c.id}`}
                      >
                        {c.coil_number}
                      </Link>
                      <div className="text-xs text-slate-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{c.heat_number}</div>
                      <div className="text-xs text-slate-500">{c.supplier}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {c.grade}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-mono text-xs">
                      {c.thickness_mm} × {c.width_mm} mm
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      {Number(c.total_weight_kg).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                      <div className="text-xs text-slate-400">
                        {(Number(c.total_weight_kg) / 1000).toFixed(2)} tons
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">
                      <div className="font-mono text-xs">
                        {c.cost_per_kg ? `${formatCurrency(c.cost_per_kg)}/kg` : "—"}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {formatCurrency(c.total_cost)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge value={c.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.status === "IN_STOCK" ? (
                        <Link
                          href={`/production/new?coil_id=${c.id}`}
                          className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          Cut / Slit →
                        </Link>
                      ) : (
                        <Link
                          href={`/warehouse/coils/${c.id}`}
                          className="text-xs font-medium text-slate-500 hover:text-slate-800"
                        >
                          View Details →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-500">
            Showing {filteredCoils.length} of {coils.length} coils
          </div>
        </Card>
      )}
    </section>
  );
}
