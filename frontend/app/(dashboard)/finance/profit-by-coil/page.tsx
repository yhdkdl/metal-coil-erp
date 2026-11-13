"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ProfitByCoil } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";
import { Button } from "@/components/ui/button";

const formatCurrency = (val?: number | string | null) => {
  if (val == null || val === "") return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

export default function ProfitByCoilPage() {
  const [rows, setRows] = useState<ProfitByCoil[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .getProfitByCoil()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const totalRev = rows.reduce((sum, r) => sum + (parseFloat(r.revenue) || 0), 0);
    const totalCogs = rows.reduce((sum, r) => sum + (parseFloat(r.cogs) || 0), 0);
    const totalProfit = rows.reduce((sum, r) => sum + (parseFloat(r.gross_profit) || 0), 0);
    const margin = totalRev > 0 ? (totalProfit / totalRev) * 100 : 0;
    return { totalRev, totalCogs, totalProfit, margin };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.coil_number.toLowerCase().includes(q));
  }, [rows, search]);

  function exportCsv() {
    const values = [
      ["Coil Number", "Acquisition Cost ($)", "Pieces Sold", "Pieces Unsold", "Revenue ($)", "COGS ($)", "Gross Profit ($)", "Gross Margin (%)"],
      ...filteredRows.map((row) => {
        const rev = parseFloat(row.revenue) || 0;
        const cogs = parseFloat(row.cogs) || 0;
        const profit = parseFloat(row.gross_profit) || 0;
        const marginPct = rev > 0 ? ((profit / rev) * 100).toFixed(1) : "0.0";
        return [
          `"${row.coil_number.replace(/"/g, '""')}"`,
          (parseFloat(row.coil_cost) || 0).toFixed(2),
          String(row.pieces_sold_count),
          String(row.pieces_unsold_count),
          rev.toFixed(2),
          cogs.toFixed(2),
          profit.toFixed(2),
          marginPct,
        ];
      }),
    ];
    const blob = new Blob([values.map((row) => row.join(",")).join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `profit-by-coil-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/finance"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          ← Back to Financial Hub
        </Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title="Coil Unit Economics & Lineage Profitability"
            description="Trace realization margin, revenue, and COGS back to individual source master coils."
          />
          <Button variant="outline" onClick={exportCsv} disabled={filteredRows.length === 0}>
            Export Coil Profitability CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Source Coils Traced</p>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {rows.length}
          </div>
          <p className="text-xs text-slate-400 mt-1">Master rolls in circulation</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Realized Revenue</p>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {formatCurrency(stats.totalRev)}
          </div>
          <p className="text-xs text-slate-400 mt-1">From processed pieces</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Realized COGS</p>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {formatCurrency(stats.totalCogs)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Allocated acquisition cost</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Aggregate Gross Profit</p>
          <div className="mt-2 text-2xl font-bold text-emerald-600 font-mono">
            {formatCurrency(stats.totalProfit)}
          </div>
          <p className="text-xs text-slate-400 mt-1">{stats.margin.toFixed(1)}% realized margin</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="relative max-w-sm">
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
            placeholder="Search coil number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
      </Card>

      {/* Table */}
      {filteredRows.length === 0 ? (
        <EmptyState>No coil profitability data found.</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="sm:hidden px-4 py-1.5 bg-slate-100/70 border-b border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>👉 Swipe horizontally for all columns</span>
            <span className="text-slate-400 font-mono">← / →</span>
          </div>
          <div className="overflow-x-auto touch-pan-x overscroll-x-contain">
            <table className="w-full text-left text-sm min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                  <th className="py-3 px-3 sm:px-4">Coil Number</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Inbound Cost</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Sold / Unsold</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Revenue</th>
                  <th className="py-3 px-3 sm:px-4 text-right">COGS</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Gross Profit</th>
                  <th className="py-3 px-3 sm:px-4 text-center">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {filteredRows.map((row) => {
                  const rev = parseFloat(row.revenue) || 0;
                  const cogs = parseFloat(row.cogs) || 0;
                  const profit = parseFloat(row.gross_profit) || 0;
                  const marginPct = rev > 0 ? (profit / rev) * 100 : 0;
                  return (
                    <tr key={row.coil_number} className="transition-colors hover:bg-slate-50 whitespace-nowrap">
                      <td className="py-3 px-3 sm:px-4 font-semibold text-slate-900 font-sans">
                        <div className="font-mono text-xs sm:text-sm">{row.coil_number}</div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right text-slate-600">
                        {formatCurrency(row.coil_cost)}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <span className="font-semibold text-blue-600">{row.pieces_sold_count}</span>
                        <span className="text-slate-400"> / </span>
                        <span className="text-slate-600">{row.pieces_unsold_count}</span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-medium text-slate-900">
                        {formatCurrency(rev)}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right text-slate-600">
                        {formatCurrency(cogs)}
                      </td>
                      <td className={`py-3 px-3 sm:px-4 text-right font-bold ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(profit)}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                            marginPct >= 20
                              ? "bg-emerald-50 text-emerald-700"
                              : marginPct > 0
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {marginPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  );
}
