"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { api } from "@/lib/api";
import { RevenueReport, ProfitByCoil, InventoryValuation, SalesBreakdownRow } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState, ErrorState } from "@/components/ui/data-state";
import {
  PeriodBarChart,
  CategoryShareChart,
  WarehouseAssetVisualizer,
} from "@/components/finance/finance-charts";
import {
  Download,
  RotateCcw,
  Search,
  DollarSign,
  TrendingUp,
  BarChart3,
  Layers3,
  Warehouse,
  Calendar,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Percent,
} from "lucide-react";

type ReportTab = "breakdown" | "revenue" | "coils" | "inventory";

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("breakdown");
  const [period, setPeriod] = useState<"day" | "month" | "year">("month");
  const [report, setReport] = useState<RevenueReport>();
  const [profit, setProfit] = useState<ProfitByCoil[]>([]);
  const [inventory, setInventory] = useState<InventoryValuation>();
  const [breakdown, setBreakdown] = useState<SalesBreakdownRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filter input states (immediate typing)
  const [category, setCategory] = useState("");
  const [customer, setCustomer] = useState("");

  // Debounced filter states (350ms delay for API calls)
  const [debouncedCategory, setDebouncedCategory] = useState("");
  const [debouncedCustomer, setDebouncedCustomer] = useState("");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  // Debounce inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedCategory(category);
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [category]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedCustomer(customer);
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [customer]);

  // Compute reporting date range
  const range = useMemo(() => {
    const now = new Date();
    if (period === "year") {
      return { from: `${now.getFullYear()}-01-01`, to: now.toISOString().slice(0, 10) };
    }
    if (period === "month") {
      return {
        from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
        to: now.toISOString().slice(0, 10),
      };
    }
    return { from: now.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
  }, [period]);

  // Initial load: fetch static inventory valuation once
  useEffect(() => {
    api.getInventoryValuation()
      .then(setInventory)
      .catch((e) => setError(e.message));
  }, []);

  // Fetch sales, revenue, and profit reports when range or debounced filters change
  useEffect(() => {
    let cancelled = false;
    setError("");
    setRefreshing(true);

    const filters = {
      ...range,
      category: debouncedCategory.trim() || undefined,
      customer: debouncedCustomer.trim() || undefined,
    };

    Promise.all([
      api.getRevenueReport({ ...filters, granularity: period }),
      api.getProfitByCoil(filters),
      api.getSalesBreakdown(filters),
    ])
      .then(([revenue, byCoil, salesBreakdown]) => {
        if (!cancelled) {
          setReport(revenue);
          setProfit(byCoil);
          setBreakdown(salesBreakdown);
          setInitialLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setInitialLoading(false);
        }
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, range, debouncedCategory, debouncedCustomer]);

  function handleResetFilters() {
    setCategory("");
    setCustomer("");
  }

  function handleRefreshAll() {
    setRefreshing(true);
    const filters = {
      ...range,
      category: debouncedCategory.trim() || undefined,
      customer: debouncedCustomer.trim() || undefined,
    };
    Promise.all([
      api.getRevenueReport({ ...filters, granularity: period }),
      api.getProfitByCoil(filters),
      api.getSalesBreakdown(filters),
      api.getInventoryValuation(),
    ])
      .then(([revenue, byCoil, salesBreakdown, valuation]) => {
        setReport(revenue);
        setProfit(byCoil);
        setBreakdown(salesBreakdown);
        setInventory(valuation);
      })
      .catch((e) => setError(e.message))
      .finally(() => setRefreshing(false));
  }

  // Export current active view to CSV
  function exportActiveViewCsv() {
    setExporting(true);
    try {
      let headers: string[] = [];
      let rows: (string | number)[][] = [];
      let filename = `finance-report-${new Date().toISOString().slice(0, 10)}.csv`;

      if (activeTab === "breakdown") {
        filename = `sales-breakdown-${new Date().toISOString().slice(0, 10)}.csv`;
        headers = ["Category", "Thickness (mm)", "Customer", "Channel", "Pieces Sold", "Revenue", "COGS", "Gross Profit", "Margin %"];
        rows = breakdown.map((r) => {
          const rev = parseFloat(r.revenue) || 0;
          const profitVal = parseFloat(r.gross_profit) || 0;
          const margin = rev > 0 ? ((profitVal / rev) * 100).toFixed(1) + "%" : "0.0%";
          return [
            `"${r.category}"`,
            r.thickness_mm,
            `"${r.customer}"`,
            r.sale_type,
            r.pieces_sold,
            r.revenue,
            r.cogs,
            r.gross_profit,
            `"${margin}"`,
          ];
        });
      } else if (activeTab === "revenue") {
        if (!report) return;
        filename = `revenue-trend-${new Date().toISOString().slice(0, 10)}.csv`;
        headers = ["Period Start", "Period End", "Revenue", "COGS", "Gross Profit", "Margin %", "Sales Count"];
        rows = report.periods.map((r) => {
          const rev = parseFloat(r.revenue) || 0;
          const profitVal = parseFloat(r.gross_profit) || 0;
          const margin = rev > 0 ? ((profitVal / rev) * 100).toFixed(1) + "%" : "0.0%";
          return [
            `"${r.start}"`,
            `"${r.end}"`,
            r.revenue,
            r.cogs,
            r.gross_profit,
            `"${margin}"`,
            r.sale_count,
          ];
        });
      } else if (activeTab === "coils") {
        filename = `coil-profitability-${new Date().toISOString().slice(0, 10)}.csv`;
        headers = ["Coil Number", "Pieces Sold", "Pieces Unsold", "Total Cost", "Revenue", "Gross Profit", "Margin %"];
        rows = profit.map((r) => {
          const rev = parseFloat(r.revenue) || 0;
          const profitVal = parseFloat(r.gross_profit) || 0;
          const margin = rev > 0 ? ((profitVal / rev) * 100).toFixed(1) + "%" : "0.0%";
          return [
            `"${r.coil_number}"`,
            r.pieces_sold_count,
            r.pieces_unsold_count,
            r.coil_cost,
            r.revenue,
            r.gross_profit,
            `"${margin}"`,
          ];
        });
      } else if (activeTab === "inventory") {
        if (!inventory) return;
        filename = `inventory-valuation-${new Date().toISOString().slice(0, 10)}.csv`;
        headers = ["Warehouse Name", "Unsold Pieces", "Cost Value", "List Value", "Potential Margin"];
        rows = inventory.by_warehouse.map((r) => {
          const cost = parseFloat(r.cost_value) || 0;
          const list = parseFloat(r.list_value) || 0;
          const potential = (list - cost).toFixed(2);
          return [
            `"${r.warehouse_name}"`,
            r.piece_count,
            r.cost_value,
            r.list_value,
            potential,
          ];
        });
      }

      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (error && !report) return <ErrorState message={error} />;
  if (initialLoading || !report || !inventory) return <LoadingState />;

  const revNum = parseFloat(report.totals.revenue) || 0;
  const cogsNum = parseFloat(report.totals.cogs) || 0;
  const profitNum = parseFloat(report.totals.gross_profit) || 0;
  const marginPct = revNum > 0 ? ((profitNum / revNum) * 100).toFixed(1) : "0.0";
  const totalPiecesSold = breakdown.reduce((acc, row) => acc + row.pieces_sold, 0);

  const hasActiveFilters = Boolean(category || customer);

  return (
    <section className="space-y-6">
      {/* Page Header with Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Financial Intelligence"
          description="Real-time gross margin, sales analytics, coil batch economics, and inventory capital."
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            title="Refresh all financial data"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin text-amber-500" : ""} />
            {refreshing ? "Syncing..." : "Sync Data"}
          </button>
          <button
            onClick={exportActiveViewCsv}
            disabled={exporting}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            title="Export currently visible report to CSV"
          >
            <Download size={15} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Background Fetch Status Banner */}
      {refreshing && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          Updating metrics for active filters...
        </div>
      )}

      {/* Executive Financial Scorecard */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Gross Revenue
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <DollarSign size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-slate-900">
              ${revNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-slate-500">In selected period</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Cost of Goods (COGS)
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600">
                <Layers size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-slate-900">
              ${cogsNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-slate-500">Allocated coil material cost</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Gross Profit
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-slate-900">
              ${profitNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-slate-500">Net realized gain</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Gross Margin
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600">
                <Percent size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">{marginPct}%</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  parseFloat(marginPct) >= 20
                    ? "bg-emerald-100 text-emerald-800"
                    : parseFloat(marginPct) >= 10
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {parseFloat(marginPct) >= 20 ? "Healthy" : parseFloat(marginPct) >= 10 ? "Moderate" : "Low"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{totalPiecesSold} pieces fulfilled</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Inventory Asset Value
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50 text-purple-600">
                <Warehouse size={16} />
              </div>
            </div>
            <p className="mt-2 text-xl font-bold font-mono text-slate-900">
              ${parseFloat(inventory.total_cost_value || "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              List: ${parseFloat(inventory.total_list_value || "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({inventory.total_pieces} pcs)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Period Controls Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Period Pills */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Calendar size={14} /> Period
              </div>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {(["day", "month", "year"] as const).map((val) => (
                  <button
                    key={val}
                    onClick={() => setPeriod(val)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                      period === val
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {val === "day" ? "Today" : val === "month" ? "Month to Date" : "Year to Date"}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Filter Inputs */}
            <div className="flex flex-1 flex-col gap-3 sm:flex-row lg:max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Filter category / product name..."
                  className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Filter customer name..."
                  className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Active Filter Tags & Reset */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500">Active filters:</span>
                {category && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-amber-900">
                    Category: <strong>{category}</strong>
                    <button onClick={() => setCategory("")} className="hover:text-amber-950 font-bold ml-1">✕</button>
                  </span>
                )}
                {customer && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-blue-900">
                    Customer: <strong>{customer}</strong>
                    <button onClick={() => setCustomer("")} className="hover:text-blue-950 font-bold ml-1">✕</button>
                  </span>
                )}
              </div>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
              >
                <RotateCcw size={13} />
                Clear all
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clean Tab Navigation for Reports */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto text-sm font-medium">
          <button
            onClick={() => setActiveTab("breakdown")}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 transition ${
              activeTab === "breakdown"
                ? "border-amber-500 font-bold text-slate-950"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            <BarChart3 size={16} />
            Sales Breakdown ({breakdown.length})
          </button>

          <button
            onClick={() => setActiveTab("revenue")}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 transition ${
              activeTab === "revenue"
                ? "border-amber-500 font-bold text-slate-950"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            <TrendingUp size={16} />
            P&L by Period ({report.periods.length})
          </button>

          <button
            onClick={() => setActiveTab("coils")}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 transition ${
              activeTab === "coils"
                ? "border-amber-500 font-bold text-slate-950"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            <Layers3 size={16} />
            Coil Batch Profitability ({profit.length})
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 transition ${
              activeTab === "inventory"
                ? "border-amber-500 font-bold text-slate-950"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            <Warehouse size={16} />
            Inventory Capital & Valuation
          </button>
        </nav>
      </div>

      {/* Tab 1: Sales Breakdown by Category, Thickness, and Customer */}
      {activeTab === "breakdown" && (
        <div className="space-y-6">
          <CategoryShareChart breakdown={breakdown} />

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-900">Product Line & Customer Profitability</h3>
                  <p className="text-xs text-slate-500">
                    Granular performance grouped by piece category, thickness, customer, and channel.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {breakdown.length} line combinations
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[840px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="p-3.5">Category / Name</th>
                      <th className="p-3.5">Thickness</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Channel</th>
                      <th className="p-3.5 text-right">Pieces</th>
                      <th className="p-3.5 text-right">Revenue</th>
                      <th className="p-3.5 text-right">COGS</th>
                      <th className="p-3.5 text-right">Gross Profit</th>
                      <th className="p-3.5 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {breakdown.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-sm text-slate-500">
                          No sales found matching the selected period and filters.
                        </td>
                      </tr>
                    ) : (
                      breakdown.map((row) => {
                        const rowRev = parseFloat(row.revenue) || 0;
                        const rowProfit = parseFloat(row.gross_profit) || 0;
                        const rowMargin = rowRev > 0 ? ((rowProfit / rowRev) * 100).toFixed(1) : "0.0";
                        return (
                          <tr
                            key={`${row.category}-${row.thickness_mm}-${row.customer}-${row.sale_type}`}
                            className="transition hover:bg-slate-50/70"
                          >
                            <td className="p-3.5 font-medium text-slate-900">{row.category}</td>
                            <td className="p-3.5 font-mono text-slate-600">{row.thickness_mm} mm</td>
                            <td className="p-3.5 text-slate-800">{row.customer}</td>
                            <td className="p-3.5">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                                  row.sale_type === "BULK"
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                }`}
                              >
                                {row.sale_type}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-mono font-medium text-slate-800">
                              {row.pieces_sold}
                            </td>
                            <td className="p-3.5 text-right font-mono font-semibold text-slate-900">
                              ${rowRev.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-3.5 text-right font-mono text-slate-500">
                              ${parseFloat(row.cogs).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-3.5 text-right font-mono font-semibold text-emerald-600">
                              +${rowProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-slate-700">
                              {rowMargin}%
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {breakdown.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-semibold text-slate-900">
                        <td colSpan={4} className="p-3.5">Total Filtered Summary</td>
                        <td className="p-3.5 text-right font-mono">{totalPiecesSold}</td>
                        <td className="p-3.5 text-right font-mono text-slate-900">
                          ${revNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 text-right font-mono text-slate-500">
                          ${cogsNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 text-right font-mono text-emerald-600">
                          +${profitNum.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 text-right font-mono">{marginPct}%</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: P&L Trend (Revenue by Period) */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm p-5">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-600" />
                Periodic Revenue & Cost Trajectory
              </h3>
              <p className="text-xs text-slate-500">
                Visualizing Gross Revenue against Material Cost (COGS) across periods. Hover over any bar to view exact figures and margins.
              </p>
            </div>
            <PeriodBarChart periods={report.periods} periodType={period} />
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-900">P&L Revenue Velocity</h3>
                  <p className="text-xs text-slate-500">
                    Periodic financial trajectory ({period === "day" ? "Daily" : period === "month" ? "Monthly" : "Yearly"} view).
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="p-3.5">Date Period</th>
                      <th className="p-3.5 text-right">Gross Revenue</th>
                      <th className="p-3.5 text-right">COGS</th>
                      <th className="p-3.5 text-right">Gross Profit</th>
                      <th className="p-3.5 text-right">Margin %</th>
                      <th className="p-3.5 text-right">Sales Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.periods.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-sm text-slate-500">
                          No financial activity in this period.
                        </td>
                      </tr>
                    ) : (
                      report.periods.map((item) => {
                        const pRev = parseFloat(item.revenue) || 0;
                        const pProfit = parseFloat(item.gross_profit) || 0;
                        const pMargin = pRev > 0 ? ((pProfit / pRev) * 100).toFixed(1) : "0.0";
                        return (
                          <tr key={item.start} className="transition hover:bg-slate-50/70">
                            <td className="p-3.5 font-medium text-slate-900">
                              {new Date(item.start).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="p-3.5 text-right font-mono font-semibold text-slate-900">
                              ${pRev.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-3.5 text-right font-mono text-slate-500">
                              ${parseFloat(item.cogs).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-3.5 text-right font-mono font-semibold text-emerald-600">
                              +${pProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-slate-700">
                              {pMargin}%
                            </td>
                            <td className="p-3.5 text-right font-mono text-slate-600">
                              {item.sale_count}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Coil Batch Profitability */}
      {activeTab === "coils" && (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900">Mother Coil Unit Economics</h3>
                <p className="text-xs text-slate-500">
                  Track direct revenue, realized profit, and remaining inventory per imported mother coil.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="p-3.5">Coil Number</th>
                    <th className="p-3.5 text-right">Sold Pieces</th>
                    <th className="p-3.5 text-right">Unsold Pieces</th>
                    <th className="p-3.5 text-center">Batch Sold Ratio</th>
                    <th className="p-3.5 text-right">Coil Total Cost</th>
                    <th className="p-3.5 text-right">Realized Revenue</th>
                    <th className="p-3.5 text-right">Gross Profit</th>
                    <th className="p-3.5 text-right">Realized Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profit.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-sm text-slate-500">
                        No coil data recorded.
                      </td>
                    </tr>
                  ) : (
                    profit.map((row) => {
                      const cRev = parseFloat(row.revenue) || 0;
                      const cProfit = parseFloat(row.gross_profit) || 0;
                      const cMargin = cRev > 0 ? ((cProfit / cRev) * 100).toFixed(1) : "0.0";
                      const totalCoilPieces = row.pieces_sold_count + row.pieces_unsold_count;
                      const soldRatio = totalCoilPieces > 0 ? Math.round((row.pieces_sold_count / totalCoilPieces) * 100) : 0;

                      return (
                        <tr key={row.coil_number} className="transition hover:bg-slate-50/70">
                          <td className="p-3.5 font-semibold text-slate-900">{row.coil_number}</td>
                          <td className="p-3.5 text-right font-mono text-emerald-700 font-medium">
                            {row.pieces_sold_count}
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-600">
                            {row.pieces_unsold_count}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center gap-2">
                              <div className="w-16 h-2 rounded-full bg-slate-200 overflow-hidden flex">
                                <div
                                  style={{ width: `${soldRatio}%` }}
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                />
                              </div>
                              <span className="font-mono text-xs text-slate-700">{soldRatio}%</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-500">
                            ${parseFloat(row.coil_cost).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-right font-mono font-semibold text-slate-900">
                            ${cRev.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-right font-mono font-semibold text-emerald-600">
                            +${cProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-700">
                            {cMargin}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Inventory Asset Capital & Valuation */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          <WarehouseAssetVisualizer inventory={inventory} />

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Capital Tied Up
                </span>
                <p className="mt-2 text-2xl font-bold font-mono text-slate-900">
                  ${parseFloat(inventory.total_cost_value || "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="mt-1 text-xs text-slate-500">Combined cost basis of {inventory.total_pieces} unsold pieces</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Potential Realizable Value
                </span>
                <p className="mt-2 text-2xl font-bold font-mono text-emerald-600">
                  ${parseFloat(inventory.total_list_value || "0").toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="mt-1 text-xs text-slate-500">Based on catalog selling prices</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Unpriced Pieces Alert
                </span>
                <p className={`mt-2 text-2xl font-bold font-mono ${inventory.null_price_count > 0 ? "text-amber-600" : "text-slate-900"}`}>
                  {inventory.null_price_count}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {inventory.null_price_count > 0 ? "Pieces require price setting before sale" : "All pieces priced"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-900">Warehouse Capital Distribution</h3>
                  <p className="text-xs text-slate-500">Inventory asset value partitioned across warehouses.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="p-4">Warehouse Facility</th>
                      <th className="p-4 text-right">Unsold Pieces</th>
                      <th className="p-4 text-right">Cost Value Basis</th>
                      <th className="p-4 text-right">List Selling Value</th>
                      <th className="p-4 text-right">Unrealized Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventory.by_warehouse.map((row) => {
                      const costVal = parseFloat(row.cost_value) || 0;
                      const listVal = parseFloat(row.list_value) || 0;
                      const unrealized = listVal - costVal;
                      return (
                        <tr key={row.warehouse_id} className="transition hover:bg-slate-50/70">
                          <td className="p-4 font-semibold text-slate-900">{row.warehouse_name}</td>
                          <td className="p-4 text-right font-mono">{row.piece_count}</td>
                          <td className="p-4 text-right font-mono text-slate-600">
                            ${costVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-right font-mono font-medium text-slate-900">
                            ${listVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-right font-mono font-semibold text-emerald-600">
                            +${unrealized.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
