"use client";
import React, { useState } from "react";
import { RevenuePeriod, SalesBreakdownRow, InventoryValuation, ProfitByCoil } from "@/types";
import { TrendingUp, DollarSign, Layers, Warehouse, BarChart2, PieChart } from "lucide-react";

interface PeriodBarChartProps {
  periods: RevenuePeriod[];
  periodType?: "day" | "week" | "month" | "year";
}

export function PeriodBarChart({ periods, periodType }: PeriodBarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!periods || periods.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-xs text-slate-500">
        No periodic revenue data available for visualization.
      </div>
    );
  }

  // Calculate highest revenue / cogs value for scaling
  const maxVal = Math.max(
    ...periods.map((p) => Math.max(parseFloat(p.revenue) || 0, parseFloat(p.cogs) || 0)),
    100
  );

  return (
    <div className="space-y-4">
      {/* Legend & Summary Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="h-3 w-3 rounded-sm bg-emerald-500" />
            <span>Gross Revenue</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="h-3 w-3 rounded-sm bg-slate-400" />
            <span>COGS (Material Cost)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="h-3 w-3 rounded-sm bg-amber-400" />
            <span>Gross Profit</span>
          </div>
        </div>
        <span className="text-slate-500 font-mono text-[11px]">
          Peak Value: ${maxVal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* Main Bar Chart Grid */}
      <div className="relative pt-6 pb-2">
        {/* Background Grid Guidelines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-slate-400 border-dashed w-full" />
          <div className="border-b border-slate-400 border-dashed w-full" />
          <div className="border-b border-slate-400 border-dashed w-full" />
          <div className="border-b border-slate-400 w-full" />
        </div>

        {/* Bars Container */}
        <div className="relative flex h-56 items-end gap-2 sm:gap-4 px-2">
          {periods.map((p, idx) => {
            const rev = parseFloat(p.revenue) || 0;
            const cogs = parseFloat(p.cogs) || 0;
            const profit = parseFloat(p.gross_profit) || 0;
            const revHeight = Math.max(Math.min((rev / maxVal) * 100, 100), 2);
            const cogsHeight = Math.max(Math.min((cogs / maxVal) * 100, 100), 2);
            const marginPct = rev > 0 ? ((profit / rev) * 100).toFixed(1) : "0.0";

            const dateLabel = new Date(p.start).toLocaleDateString(undefined, {
              month: "short",
              day: periodType === "day" ? "numeric" : undefined,
              year: periodType === "year" ? "numeric" : undefined,
            });

            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={p.start}
                className="group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Floating Tooltip */}
                {isHovered && (
                  <div className="absolute -top-24 z-30 min-w-[180px] rounded-xl border border-slate-800 bg-slate-900/95 p-3 text-xs text-white shadow-2xl backdrop-blur pointer-events-none">
                    <p className="font-bold border-b border-slate-700 pb-1 text-amber-300">
                      {new Date(p.start).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: periodType === "day" ? "numeric" : undefined,
                      })}
                    </p>
                    <div className="mt-1.5 space-y-1 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Revenue:</span>
                        <span className="font-bold text-emerald-400">${rev.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">COGS:</span>
                        <span className="text-slate-300">${cogs.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-700/80 pt-1">
                        <span className="text-slate-400">Profit:</span>
                        <span className="font-bold text-amber-300">+${profit.toLocaleString("en-US", { minimumFractionDigits: 2 })} ({marginPct}%)</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Orders:</span>
                        <span>{p.sale_count}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Paired Bar Columns */}
                <div className="flex items-end gap-1 w-full justify-center">
                  {/* Revenue Bar */}
                  <div
                    style={{ height: `${revHeight}%` }}
                    className={`w-full max-w-[20px] rounded-t-sm transition-all duration-200 ${
                      isHovered ? "bg-emerald-400 shadow-md shadow-emerald-500/20" : "bg-emerald-500"
                    }`}
                  />
                  {/* COGS Bar */}
                  <div
                    style={{ height: `${cogsHeight}%` }}
                    className={`w-full max-w-[20px] rounded-t-sm transition-all duration-200 ${
                      isHovered ? "bg-slate-300" : "bg-slate-400"
                    }`}
                  />
                </div>

                {/* X-axis Date Label */}
                <span className="mt-2 text-[11px] font-semibold text-slate-600 truncate max-w-[50px] text-center">
                  {dateLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface CategoryShareChartProps {
  breakdown: SalesBreakdownRow[];
}

export function CategoryShareChart({ breakdown }: CategoryShareChartProps) {
  if (!breakdown || breakdown.length === 0) return null;

  // Group by category
  const categoryMap = new Map<string, { revenue: number; cogs: number; profit: number; pieces: number }>();
  let grandTotalRev = 0;

  breakdown.forEach((row) => {
    const rev = parseFloat(row.revenue) || 0;
    const cogs = parseFloat(row.cogs) || 0;
    const profit = parseFloat(row.gross_profit) || 0;
    grandTotalRev += rev;

    const existing = categoryMap.get(row.category) || { revenue: 0, cogs: 0, profit: 0, pieces: 0 };
    existing.revenue += rev;
    existing.cogs += cogs;
    existing.profit += profit;
    existing.pieces += row.pieces_sold;
    categoryMap.set(row.category, existing);
  });

  const categories = Array.from(categoryMap.entries())
    .map(([category, stats]) => ({
      category,
      ...stats,
      sharePct: grandTotalRev > 0 ? (stats.revenue / grandTotalRev) * 100 : 0,
      marginPct: stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Palette colors for category distribution
  const colors = [
    { bg: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-400" },
    { bg: "bg-blue-500", text: "text-blue-700", ring: "ring-blue-400" },
    { bg: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-400" },
    { bg: "bg-purple-500", text: "text-purple-700", ring: "ring-purple-400" },
    { bg: "bg-rose-500", text: "text-rose-700", ring: "ring-rose-400" },
    { bg: "bg-cyan-500", text: "text-cyan-700", ring: "ring-cyan-400" },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PieChart size={16} className="text-amber-500" />
            Product Line Revenue Share & Gross Margins
          </h4>
          <p className="text-xs text-slate-500">
            Market share and margin yield across cut profiles
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-slate-800">
          Total: ${grandTotalRev.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Proportional Multi-Segment Progress Bar */}
      <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100 flex shadow-inner">
        {categories.map((c, i) => {
          const color = colors[i % colors.length];
          return (
            <div
              key={c.category}
              style={{ width: `${c.sharePct}%` }}
              className={`${color.bg} transition-all duration-300 relative group`}
              title={`${c.category}: ${c.sharePct.toFixed(1)}% ($${c.revenue.toLocaleString()})`}
            />
          );
        })}
      </div>

      {/* Category Metric Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
        {categories.map((c, i) => {
          const color = colors[i % colors.length];
          return (
            <div
              key={c.category}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition hover:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <span className={`h-2.5 w-2.5 rounded-full ${color.bg}`} />
                  {c.category}
                </span>
                <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 border border-slate-200 shadow-2xs">
                  {c.sharePct.toFixed(1)}% Share
                </span>
              </div>

              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-base font-bold font-mono text-slate-900">
                  ${c.revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-semibold text-emerald-600 font-mono">
                  {c.marginPct.toFixed(1)}% Margin
                </span>
              </div>

              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>{c.pieces} units sold</span>
                <span>Profit: +${c.profit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface WarehouseAssetVisualizerProps {
  inventory: InventoryValuation;
}

export function WarehouseAssetVisualizer({ inventory }: WarehouseAssetVisualizerProps) {
  if (!inventory || !inventory.by_warehouse || inventory.by_warehouse.length === 0) return null;

  const totalCost = parseFloat(inventory.total_cost_value || "0") || 1;
  const totalList = parseFloat(inventory.total_list_value || "0") || 1;
  const unrealizedProfit = Math.max(totalList - totalCost, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Warehouse size={16} className="text-purple-600" />
            Capital Allocation & Realizable Value Spread
          </h4>
          <p className="text-xs text-slate-500">
            Comparison between raw tied-up cost capital and prospective catalogue sale value
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
            Cost Basis
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            List Selling Value
          </div>
        </div>
      </div>

      {/* Warehouse Bars */}
      <div className="space-y-4 pt-1">
        {inventory.by_warehouse.map((wh) => {
          const cost = parseFloat(wh.cost_value) || 0;
          const list = parseFloat(wh.list_value) || 0;
          const whProfit = Math.max(list - cost, 0);
          const maxWh = Math.max(list, cost, 1);
          const costPct = (cost / maxWh) * 100;
          const listPct = (list / maxWh) * 100;

          return (
            <div key={wh.warehouse_id} className="space-y-2 rounded-xl bg-slate-50/70 p-4 border border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-bold text-slate-900">{wh.warehouse_name}</span>
                  <span className="ml-2 text-xs font-semibold text-slate-500">
                    ({wh.piece_count} unsold pieces)
                  </span>
                </div>
                <div className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Unrealized Gain: +${whProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Comparative Progress Bars */}
              <div className="space-y-1.5 pt-1">
                {/* Cost Bar */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="w-16 font-mono font-medium text-slate-500">Cost:</span>
                  <div className="flex-1 h-3 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      style={{ width: `${costPct}%` }}
                      className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    />
                  </div>
                  <span className="w-24 text-right font-mono font-bold text-slate-800">
                    ${cost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* List Bar */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="w-16 font-mono font-medium text-slate-500">List:</span>
                  <div className="flex-1 h-3 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      style={{ width: `${listPct}%` }}
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    />
                  </div>
                  <span className="w-24 text-right font-mono font-bold text-emerald-700">
                    ${list.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

