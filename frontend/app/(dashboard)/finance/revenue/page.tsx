"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { RevenueReport } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";
import { Button } from "@/components/ui/button";
import { PeriodBarChart } from "@/components/finance/finance-charts";

const formatCurrency = (val?: number | string | null) => {
  if (val == null || val === "") return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

export default function RevenuePage() {
  const [granularity, setGranularity] = useState<"day" | "week" | "month" | "year">("day");
  const [report, setReport] = useState<RevenueReport>();
  const [category, setCategory] = useState("");
  const [customer, setCustomer] = useState("");
  const [debouncedCategory, setDebouncedCategory] = useState("");
  const [debouncedCustomer, setDebouncedCustomer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // 350ms input debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCategory(category.trim());
      setDebouncedCustomer(customer.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [category, customer]);

  useEffect(() => {
    setLoading(true);
    api
      .getRevenueReport({
        granularity,
        category: debouncedCategory || undefined,
        customer: debouncedCustomer || undefined,
      })
      .then(setReport)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [granularity, debouncedCategory, debouncedCustomer]);

  const totals = useMemo(() => {
    if (!report) return { revenue: 0, cogs: 0, profit: 0, margin: 0, sales: 0 };
    const rev = parseFloat(report.totals?.revenue) || 0;
    const cogs = parseFloat(report.totals?.cogs) || 0;
    const profit = parseFloat(report.totals?.gross_profit) || 0;
    const margin = rev > 0 ? (profit / rev) * 100 : 0;
    const sales = report.periods.reduce((sum, p) => sum + (p.sale_count || 0), 0);
    return { revenue: rev, cogs, profit, margin, sales };
  }, [report]);

  function exportCsv() {
    if (!report) return;
    const rows = [
      ["Period Start", "Period End", "Revenue ($)", "COGS ($)", "Gross Profit ($)", "Gross Margin (%)", "Sales Count"],
      ...report.periods.map((row) => {
        const rev = parseFloat(row.revenue) || 0;
        const profit = parseFloat(row.gross_profit) || 0;
        const marginPct = rev > 0 ? ((profit / rev) * 100).toFixed(1) : "0.0";
        return [
          row.start,
          row.end,
          rev.toFixed(2),
          (parseFloat(row.cogs) || 0).toFixed(2),
          profit.toFixed(2),
          marginPct,
          String(row.sale_count),
        ];
      }),
    ];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `revenue-report-${granularity}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

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
            title="Revenue & Periodic P&L Ledger"
            description="Time-series accounting breakdown of billed revenue, cost of goods sold, and gross margins."
          />
          <Button variant="outline" onClick={exportCsv} disabled={!report || report.periods.length === 0}>
            Export P&L CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gross Billed Revenue</p>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {formatCurrency(totals.revenue)}
          </div>
          <p className="text-xs text-slate-400 mt-1">{totals.sales} completed sales orders</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Realized COGS</p>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {formatCurrency(totals.cogs)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Direct material allocation</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Realized Gross Profit</p>
          <div className="mt-2 text-2xl font-bold text-emerald-600 font-mono">
            {formatCurrency(totals.profit)}
          </div>
          <p className="text-xs text-slate-400 mt-1">{totals.margin.toFixed(1)}% blended margin</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Granularity Cadence</p>
          <div className="mt-2 text-2xl font-bold uppercase text-blue-600">
            {granularity}
          </div>
          <p className="text-xs text-slate-400 mt-1">{report?.periods.length || 0} reporting intervals</p>
        </div>
      </div>

      {/* Filter and Granularity Controls */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Filter by piece category (e.g. SHEET)..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                placeholder="Filter by customer name..."
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {(["day", "week", "month", "year"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularity(g)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase transition-colors ${
                  granularity === g
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Periodic Bar Chart Visualizer */}
      {report && report.periods.length > 0 && (
        <Card className="p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Periodic Revenue vs COGS Trend
          </h2>
          <div className="mt-4">
            <PeriodBarChart periods={report.periods} periodType={granularity} />
          </div>
        </Card>
      )}

      {/* Table */}
      {loading ? (
        <LoadingState />
      ) : !report || report.periods.length === 0 ? (
        <EmptyState>No periodic revenue data found for this selection.</EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">Revenue</th>
                  <th className="py-3 px-4 text-right">COGS</th>
                  <th className="py-3 px-4 text-right">Gross Profit</th>
                  <th className="py-3 px-4 text-center">Margin %</th>
                  <th className="py-3 px-4 text-right">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {report.periods.map((row) => {
                  const rev = parseFloat(row.revenue) || 0;
                  const cogs = parseFloat(row.cogs) || 0;
                  const profit = parseFloat(row.gross_profit) || 0;
                  const marginPct = rev > 0 ? (profit / rev) * 100 : 0;
                  return (
                    <tr key={row.start} className="transition-colors hover:bg-slate-50">
                      <td className="py-3 px-4 font-sans text-xs font-medium text-slate-900">
                        {new Date(row.start).toLocaleDateString()}
                        {row.end !== row.start && (
                          <span className="text-slate-400"> – {new Date(row.end).toLocaleDateString()}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        {formatCurrency(rev)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {formatCurrency(cogs)}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(profit)}
                      </td>
                      <td className="py-3 px-4 text-center">
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
                      <td className="py-3 px-4 text-right text-slate-700">
                        {row.sale_count}
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
