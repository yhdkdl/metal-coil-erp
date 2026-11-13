"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { InventoryValuation } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState } from "@/components/ui/data-state";
import { Button } from "@/components/ui/button";
import { WarehouseAssetVisualizer } from "@/components/finance/finance-charts";

const formatCurrency = (val?: number | string | null) => {
  if (val == null || val === "") return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

export default function InventoryValuationPage() {
  const [valuation, setValuation] = useState<InventoryValuation>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getInventoryValuation()
      .then(setValuation)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function exportCsv() {
    if (!valuation) return;
    const values = [
      ["Warehouse", "Piece Count", "Cost Basis ($)", "List Value ($)", "Unrealized Margin ($)"],
      ...valuation.by_warehouse.map((row) => {
        const cost = parseFloat(row.cost_value) || 0;
        const list = parseFloat(row.list_value) || 0;
        return [
          `"${row.warehouse_name.replace(/"/g, '""')}"`,
          String(row.piece_count),
          cost.toFixed(2),
          list.toFixed(2),
          (list - cost).toFixed(2),
        ];
      }),
    ];
    const blob = new Blob([values.map((row) => row.join(",")).join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventory-valuation-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!valuation) return null;

  const totalCost = parseFloat(valuation.total_cost_value) || 0;
  const totalList = parseFloat(valuation.total_list_value) || 0;
  const unrealizedProfit = totalList - totalCost;

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
            title="Inventory Asset Valuation"
            description="Balance sheet valuation of unsold finished stock segmented by facility location."
          />
          <Button variant="outline" onClick={exportCsv}>
            Export Valuation CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Unsold Items</p>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {valuation.total_pieces.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {valuation.null_price_count > 0 ? `${valuation.null_price_count} unpriced items` : "All pieces priced"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Asset Cost Basis</p>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {formatCurrency(totalCost)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Allocated slitting/raw cost</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Catalog List Value</p>
          <div className="mt-2 text-2xl font-bold text-blue-600 font-mono">
            {formatCurrency(totalList)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Potential retail revenue</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unrealized Margin</p>
          <div className="mt-2 text-2xl font-bold text-emerald-600 font-mono">
            {formatCurrency(unrealizedProfit)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {totalList > 0 ? ((unrealizedProfit / totalList) * 100).toFixed(1) : 0}% potential margin
          </p>
        </div>
      </div>

      {/* Graphical Breakdown */}
      <Card className="p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
          Warehouse Asset Distribution
        </h2>
        <div className="mt-4">
          <WarehouseAssetVisualizer inventory={valuation} />
        </div>
      </Card>

      {/* Detailed Table */}
      <Card className="overflow-hidden">
        <div className="sm:hidden px-4 py-1.5 bg-slate-100/70 border-b border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>👉 Swipe horizontally for all columns</span>
          <span className="text-slate-400 font-mono">← / →</span>
        </div>
        <div className="overflow-x-auto touch-pan-x overscroll-x-contain">
          <table className="w-full text-left text-sm min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                <th className="py-3 px-3 sm:px-4">Warehouse</th>
                <th className="py-3 px-3 sm:px-4 text-right">Pieces</th>
                <th className="py-3 px-3 sm:px-4 text-right">Cost Basis</th>
                <th className="py-3 px-3 sm:px-4 text-right">List Value</th>
                <th className="py-3 px-3 sm:px-4 text-right">Unrealized Gain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {valuation.by_warehouse.map((row) => {
                const cost = parseFloat(row.cost_value) || 0;
                const list = parseFloat(row.list_value) || 0;
                const spread = list - cost;
                return (
                  <tr key={row.warehouse_id} className="transition-colors hover:bg-slate-50 whitespace-nowrap">
                    <td className="py-3 px-3 sm:px-4 font-sans text-xs sm:text-sm font-semibold text-slate-900">
                      {row.warehouse_name}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right font-medium text-slate-800">
                      {row.piece_count.toLocaleString()} pcs
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right text-slate-700">
                      {formatCurrency(cost)}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right font-semibold text-blue-600">
                      {formatCurrency(list)}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right font-bold text-emerald-600">
                      {formatCurrency(spread)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
