"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import {
  ArrowUpRight,
  Factory,
  Layers3,
  PackageCheck,
  ScanLine,
  ShoppingCart,
  Warehouse,
  Plus,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState, ErrorState } from "@/components/ui/data-state";
import { Coil, PieceStockSummary, ProductionRun, Warehouse as WarehouseType } from "@/types";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dashboard states
  const [todaySummary, setTodaySummary] = useState<PieceStockSummary[]>([]);
  const [overallPieces, setOverallPieces] = useState<PieceStockSummary[]>([]);
  const [coils, setCoils] = useState<Coil[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [activeRunsCount, setActiveRunsCount] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      router.replace("/login");
      return;
    }

    const todayDate = new Date().toISOString().slice(0, 10);

    Promise.allSettled([
      api.getPieceSummary({ produced_on: todayDate }),
      api.getPieceSummary(),
      api.listCoils({ limit: 100 }),
      api.listWarehouses(),
      api.listProductionRuns({ limit: 20 }),
    ]).then(([todayRes, overallRes, coilsRes, whRes, runsRes]) => {
      if (todayRes.status === "fulfilled") setTodaySummary(todayRes.value);
      if (overallRes.status === "fulfilled") setOverallPieces(overallRes.value);
      if (coilsRes.status === "fulfilled") setCoils(coilsRes.value);
      if (whRes.status === "fulfilled") setWarehouses(whRes.value);
      if (runsRes.status === "fulfilled") {
        const active = runsRes.value.filter(
          (r: ProductionRun) => r.status === "OPEN" || r.status === "IN_PROGRESS"
        ).length;
        setActiveRunsCount(active);
      }
      setLoading(false);
    }).catch((e) => {
      setError(e.message);
      setLoading(false);
    });
  }, [router]);

  // Derived KPI calculations
  const rawCoilsInStock = coils.filter((c) => c.status === "IN_STOCK");
  const totalCoilWeightKg = rawCoilsInStock.reduce(
    (acc, c) => acc + (parseFloat(c.total_weight_kg) || 0),
    0
  );
  const totalCoilWeightTons = (totalCoilWeightKg / 1000).toFixed(1);

  const totalFinishedInStock = overallPieces.reduce(
    (acc, row) => acc + row.in_stock_pieces,
    0
  );
  const totalMainStock = overallPieces.reduce((acc, row) => acc + row.in_main, 0);
  const totalOutletStock = overallPieces.reduce((acc, row) => acc + row.in_outlet, 0);

  const todayProducedTotal = todaySummary.reduce((acc, row) => acc + row.total_pieces, 0);
  const todayInStockTotal = todaySummary.reduce((acc, row) => acc + row.in_stock_pieces, 0);
  const todaySoldTotal = todaySummary.reduce((acc, row) => acc + row.sold, 0);

  const coreModules = [
    {
      href: "/warehouse/coils",
      label: "Coil Inventory",
      detail: "Master coil tracking, heat numbers, raw weights, and supplier receipts.",
      icon: Layers3,
      tone: "bg-amber-100 text-amber-800",
    },
    {
      href: "/production",
      label: "Production Floor",
      detail: "Slitting and shearing runs, staging output sheets, and operator tracking.",
      icon: Factory,
      tone: "bg-blue-100 text-blue-800",
    },
    {
      href: "/warehouse/pieces",
      label: "Finished Pieces",
      detail: "Piece-to-coil traceability, dimensional specs, and warehouse distribution.",
      icon: PackageCheck,
      tone: "bg-emerald-100 text-emerald-800",
    },
    {
      href: "/sales",
      label: "Sales & Orders",
      detail: "Wholesale bulk contracts and retail outlet transactions with customer billing.",
      icon: ShoppingCart,
      tone: "bg-purple-100 text-purple-800",
    },
    {
      href: "/finance",
      label: "Financial Analytics",
      detail: "Real-time P&L, gross margins, coil batch economics, and inventory asset valuation.",
      icon: DollarSign,
      tone: "bg-teal-100 text-teal-800",
    },
    {
      href: "/warehouse/transfers",
      label: "Warehouse Logistics",
      detail: "Batch transfers from Main production facility to Retail outlet warehouses.",
      icon: Warehouse,
      tone: "bg-rose-100 text-rose-800",
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 w-full max-w-[100vw] overflow-x-hidden">
      <Sidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col w-full max-w-full overflow-x-hidden">
        <Header onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden p-3 sm:p-6 md:p-8 pb-24 lg:pb-8 space-y-6 sm:space-y-8">
          <div className="mx-auto max-w-7xl w-full min-w-0 space-y-6 sm:space-y-8">
            {/* Hero / Control Center Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121c29] via-[#1a2738] to-[#142030] p-6 text-white shadow-xl md:p-10 border border-slate-800">
              <div className="relative z-10 max-w-3xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 border border-amber-400/20">
                    <ScanLine size={14} /> Industrial Operations Hub
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Traceability Active
                  </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight md:text-5xl text-white">
                  Metal Coil Traceability ERP
                </h1>
                <p className="mt-3 max-w-2xl text-sm md:text-base leading-relaxed text-slate-300">
                  Unified operational command: from imported raw coil intake, precision floor cutting,
                  traceable finished stock, to wholesale and retail commercial fulfillment.
                </p>

                {/* Quick Action Shortcuts */}
                <div className="mt-6 flex flex-wrap items-center gap-2.5">
                  <Link
                    href="/warehouse/coils/new"
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-amber-300"
                  >
                    <Plus size={15} /> Receive Raw Coil
                  </Link>
                  <Link
                    href="/production/new"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-white/20"
                  >
                    <Factory size={15} /> Start Production Run
                  </Link>
                  <Link
                    href="/warehouse/transfers/new"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-white/20"
                  >
                    <ArrowRightLeft size={15} /> Stock Transfer
                  </Link>
                  <Link
                    href="/sales/new"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-white/20"
                  >
                    <ShoppingCart size={15} /> New Sale
                  </Link>
                </div>
              </div>

              {/* Subtle background industrial geometry */}
              <div className="absolute -right-20 -top-32 h-96 w-96 rounded-full border-[40px] border-white/[.03]" />
              <div className="absolute -bottom-48 right-20 h-96 w-96 rounded-full border-[2px] border-amber-400/10" />
            </div>

            {/* Operational KPI Scorecard */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Card 1: Raw Coil Inventory */}
              <Card className="border-slate-200 shadow-sm transition hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Raw Coils in Stock
                    </span>
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-800">
                      <Layers3 size={18} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">
                      {rawCoilsInStock.length}
                    </span>
                    <span className="text-xs font-medium text-slate-500">coils available</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-600">
                    <span>Total Raw Weight:</span>
                    <strong className="font-mono text-slate-900">{totalCoilWeightTons} t</strong>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Production Floor Velocity */}
              <Card className="border-slate-200 shadow-sm transition hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Today&apos;s Output
                    </span>
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-100 text-blue-800">
                      <Factory size={18} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">
                      {todayProducedTotal}
                    </span>
                    <span className="text-xs font-medium text-slate-500">pieces cut today</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-600">
                    <span>Floor Runs Active:</span>
                    <strong className="font-mono text-slate-900">{activeRunsCount} active</strong>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Traceable Finished Goods */}
              <Card className="border-slate-200 shadow-sm transition hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Finished Pieces Stock
                    </span>
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                      <PackageCheck size={18} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">
                      {totalFinishedInStock}
                    </span>
                    <span className="text-xs font-medium text-slate-500">ready to sell</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-600">
                    <span>Main / Outlet Split:</span>
                    <strong className="font-mono text-slate-900">
                      {totalMainStock} Main · {totalOutletStock} Outlet
                    </strong>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Financial & Commercial Hub */}
              <Card className="border-slate-200 shadow-sm transition hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Fulfillment & Margins
                    </span>
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-100 text-purple-800">
                      <TrendingUp size={18} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">100%</span>
                    <span className="text-xs font-medium text-slate-500">traceability</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-600">
                    <span>Facility Logistics:</span>
                    <strong className="text-slate-900">{warehouses.length} active warehouses</strong>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Core Operational Floor Section */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column (2/3): Today's Production Floor Activity */}
              <div className="lg:col-span-2">
                <Card className="border-slate-200 shadow-sm h-full">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-900">Today&apos;s Production Floor</h2>
                          <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                            {todaySummary.length} profiles
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Finished pieces produced today grouped by product name/category and thickness.
                        </p>
                      </div>
                      <Link
                        href="/warehouse/pieces"
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900"
                      >
                        Inspect all inventory <ArrowUpRight size={14} />
                      </Link>
                    </div>

                    {error ? (
                      <div className="mt-4"><ErrorState message={error} /></div>
                    ) : loading ? (
                      <LoadingState />
                    ) : todaySummary.length === 0 ? (
                      <div className="mt-8 text-center py-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                        <Factory className="mx-auto text-slate-400 mb-3" size={32} />
                        <h4 className="text-sm font-semibold text-slate-800">No pieces produced today yet</h4>
                        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                          Launch a new slitting or shearing run to begin cutting raw coils into traceable finished goods.
                        </p>
                        <Link
                          href="/production/new"
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-sm hover:bg-amber-300 transition"
                        >
                          <Plus size={14} /> Start Production Run
                        </Link>
                      </div>
                    ) : (
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[560px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">
                              <th className="p-3">Product Name</th>
                              <th className="p-3">Thickness</th>
                              <th className="p-3 text-right">Produced</th>
                              <th className="p-3 text-right">In Stock</th>
                              <th className="p-3 text-right">Sold</th>
                              <th className="p-3 text-right">Fulfillment Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {todaySummary.map((row) => {
                              const availRatio = row.total_pieces > 0
                                ? Math.round((row.in_stock_pieces / row.total_pieces) * 100)
                                : 0;
                              return (
                                <tr key={`${row.category}-${row.thickness_mm}`} className="transition hover:bg-slate-50/70">
                                  <td className="p-3 font-semibold text-slate-900">{row.category}</td>
                                  <td className="p-3 font-mono text-slate-600">{row.thickness_mm} mm</td>
                                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                                    {row.total_pieces}
                                  </td>
                                  <td className="p-3 text-right font-mono text-emerald-700 font-semibold">
                                    {row.in_stock_pieces}
                                  </td>
                                  <td className="p-3 text-right font-mono text-slate-500">
                                    {row.sold}
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="inline-flex items-center justify-end gap-2">
                                      <div className="w-16 h-2 rounded-full bg-slate-200 overflow-hidden flex">
                                        <div
                                          style={{ width: `${availRatio}%` }}
                                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                        />
                                      </div>
                                      <span className="font-mono text-xs text-slate-700">{availRatio}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-semibold text-slate-900 text-xs uppercase tracking-wider">
                              <td colSpan={2} className="p-3">Total Produced Today</td>
                              <td className="p-3 text-right font-mono font-bold text-sm">{todayProducedTotal}</td>
                              <td className="p-3 text-right font-mono text-emerald-700 font-bold text-sm">{todayInStockTotal}</td>
                              <td className="p-3 text-right font-mono text-slate-600 text-sm">{todaySoldTotal}</td>
                              <td className="p-3 text-right text-xs text-slate-500 font-normal">Floor Summary</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column (1/3): Warehouse & Logistics Balance */}
              <div className="space-y-6">
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-slate-900">Warehouse Allocation</h3>
                        <p className="text-xs text-slate-500">Finished goods readiness</p>
                      </div>
                      <Warehouse size={18} className="text-slate-400" />
                    </div>

                    <div className="mt-4 space-y-4">
                      {/* Main Production Warehouse */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">Main Facility</span>
                          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                            Bulk Channels
                          </span>
                        </div>
                        <p className="mt-1 text-2xl font-black font-mono text-slate-900">{totalMainStock}</p>
                        <p className="text-xs text-slate-500">Pieces stored for wholesale orders</p>
                      </div>

                      {/* Retail Outlet */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">Retail Outlet</span>
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                            Retail Channels
                          </span>
                        </div>
                        <p className="mt-1 text-2xl font-black font-mono text-slate-900">{totalOutletStock}</p>
                        <p className="text-xs text-slate-500">Pieces available for walk-in retail sales</p>
                      </div>

                      {/* Visual Capacity Split Bar */}
                      <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-100">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                          <span>Inventory Balance</span>
                          <span className="font-mono text-slate-900">{totalFinishedInStock} pcs in stock</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden flex">
                          <div
                            style={{
                              width: `${
                                totalFinishedInStock > 0
                                  ? (totalMainStock / totalFinishedInStock) * 100
                                  : 50
                              }%`,
                            }}
                            className="bg-blue-500 h-full transition-all duration-300"
                            title={`Main Facility: ${totalMainStock} pcs`}
                          />
                          <div
                            style={{
                              width: `${
                                totalFinishedInStock > 0
                                  ? (totalOutletStock / totalFinishedInStock) * 100
                                  : 50
                              }%`,
                            }}
                            className="bg-emerald-500 h-full transition-all duration-300"
                            title={`Retail Outlet: ${totalOutletStock} pcs`}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>Main: {totalFinishedInStock > 0 ? Math.round((totalMainStock / totalFinishedInStock) * 100) : 0}%</span>
                          <span>Outlet: {totalFinishedInStock > 0 ? Math.round((totalOutletStock / totalFinishedInStock) * 100) : 0}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <Link
                        href="/warehouse/transfers"
                        className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
                      >
                        <span>Manage Stock Transfers</span>
                        <ArrowRightLeft size={14} />
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                {/* System Traceability Guarantee Card */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                    <CheckCircle2 size={16} className="text-amber-600" />
                    100% Coil Traceability
                  </div>
                  <p className="mt-1.5 text-xs text-amber-800 leading-relaxed">
                    Every piece cut retains full lineage to its raw mother coil, mill heat number, allocated cost, and production run.
                  </p>
                </div>
              </div>
            </div>

            {/* Department Navigation Modules */}
            <div>
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900">ERP System Workspaces</h3>
                <p className="text-xs text-slate-500">Direct access to core production, logistics, and sales modules.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {coreModules.map(({ href, label, detail, icon: Icon, tone }) => (
                  <Link href={href} key={href}>
                    <Card className="group h-full border-slate-200 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-md">
                      <CardContent className="flex items-start justify-between p-5">
                        <div>
                          <div className={`mb-3.5 grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
                            <Icon size={19} />
                          </div>
                          <h4 className="font-bold text-slate-900 group-hover:text-amber-600 transition">
                            {label}
                          </h4>
                          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{detail}</p>
                        </div>
                        <ArrowUpRight
                          className="text-slate-300 transition group-hover:text-slate-900 shrink-0 ml-2"
                          size={18}
                        />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </main>
        <BottomNav onOpenMenu={() => setMenuOpen(true)} />
      </div>
    </div>
  );
}
