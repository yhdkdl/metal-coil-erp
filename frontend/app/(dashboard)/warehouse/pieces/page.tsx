"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { api } from "@/lib/api";
import { Piece, PieceStockSummary, Warehouse } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  PackageCheck,
  Search,
  Warehouse as WarehouseIcon,
  RotateCcw,
  Layers,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
} from "lucide-react";

export default function PiecesPage() {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [summary, setSummary] = useState<PieceStockSummary[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Filter input states (immediate typing)
  const [searchCode, setSearchCode] = useState("");
  const [category, setCategory] = useState("");
  const [thickness, setThickness] = useState("");
  const [warehouseId, setWarehouseId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Debounced states
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedCategory, setDebouncedCategory] = useState("");
  const [debouncedThickness, setDebouncedThickness] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  // Debounce text inputs (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedSearch(searchCode);
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchCode]);

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
        setDebouncedThickness(thickness);
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [thickness]);

  // Fetch warehouses ONCE on mount
  useEffect(() => {
    api.listWarehouses()
      .then(setWarehouses)
      .catch((e) => setError(e.message));
  }, []);

  // Fetch pieces & summary when debounced filters change
  useEffect(() => {
    let cancelled = false;
    setRefreshing(true);

    const queryFilters = {
      q: debouncedSearch.trim() || undefined,
      category: debouncedCategory.trim() || undefined,
      thickness_mm: debouncedThickness.trim() || undefined,
      warehouse_id: warehouseId !== "ALL" ? warehouseId : undefined,
      status: statusFilter !== "ALL" ? statusFilter : undefined,
    };

    Promise.all([
      api.listPieces(queryFilters),
      api.getPieceSummary({
        category: debouncedCategory.trim() || undefined,
        thickness_mm: debouncedThickness.trim() || undefined,
      }),
    ])
      .then(([items, overview]) => {
        if (!cancelled) {
          setPieces(items);
          setSummary(overview);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, debouncedCategory, debouncedThickness, warehouseId, statusFilter]);

  function handleResetFilters() {
    setSearchCode("");
    setCategory("");
    setThickness("");
    setWarehouseId("ALL");
    setStatusFilter("ALL");
  }

  const hasActiveFilters = Boolean(
    searchCode || category || thickness || warehouseId !== "ALL" || statusFilter !== "ALL"
  );

  const warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w.name]));

  // Calculate summary metrics
  const totalPiecesCount = summary.reduce((acc, s) => acc + s.total_pieces, 0);
  const totalInStock = summary.reduce((acc, s) => acc + s.in_stock_pieces, 0);
  const totalInMain = summary.reduce((acc, s) => acc + s.in_main, 0);
  const totalInOutlet = summary.reduce((acc, s) => acc + s.in_outlet, 0);
  const totalSold = summary.reduce((acc, s) => acc + s.sold, 0);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Finished Piece Inventory"
          description="Trace cut pieces, dimensional specifications, and warehouse stock distribution."
        />
        <div className="flex items-center gap-3">
          <Link
            href="/warehouse/transfers/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowRightLeft size={15} /> Transfer to Outlet
          </Link>
          <Link
            href="/sales/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-amber-300"
          >
            New Sale
          </Link>
        </div>
      </div>

      {/* KPI Operational Scorecards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Available Stock
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <PackageCheck size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-slate-900">{totalInStock}</p>
            <p className="mt-1 text-xs text-slate-500">Ready to fulfill contracts</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Main Warehouse
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <WarehouseIcon size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-slate-900">{totalInMain}</p>
            <p className="mt-1 text-xs text-slate-500">Wholesale / Bulk fulfillment</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Retail Outlet
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600">
                <WarehouseIcon size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-slate-900">{totalInOutlet}</p>
            <p className="mt-1 text-xs text-slate-500">Walk-in retail stock</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Sold & Dispatched
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50 text-purple-600">
                <TrendingUp size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-slate-900">{totalSold}</p>
            <p className="mt-1 text-xs text-slate-500">Of {totalPiecesCount} total produced</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="text-xs font-medium text-slate-600">Piece Code</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <input
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="e.g. COIL-2026..."
                  className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Category / Name</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. SHEET"
                  className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Thickness (mm)</label>
              <input
                type="number"
                step="0.001"
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
                placeholder="Thickness"
                className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Warehouse Location</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-slate-900 focus:outline-none"
              >
                <option value="ALL">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Stock Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-slate-900 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="IN_MAIN">In Main Warehouse</option>
                <option value="IN_OUTLET">In Outlet Warehouse</option>
                <option value="SOLD">Sold</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <span className="text-slate-500">
                Filtered pieces: <strong>{pieces.length}</strong> matching records
              </span>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
              >
                <RotateCcw size={13} />
                Clear filters
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Summary Table */}
      {summary.length > 0 && (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900">Stock Overview by Cut Profile & Thickness</h3>
                <p className="text-xs text-slate-500">Tally across all storage locations and commercial status.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="p-3.5">Category / Name</th>
                    <th className="p-3.5">Thickness</th>
                    <th className="p-3.5 text-right">Produced</th>
                    <th className="p-3.5 text-right">In Stock</th>
                    <th className="p-3.5 text-right">Main Facility</th>
                    <th className="p-3.5 text-right">Retail Outlet</th>
                    <th className="p-3.5 text-right">Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.map((row) => (
                    <tr key={`${row.category}-${row.thickness_mm}`} className="transition hover:bg-slate-50/70">
                      <td className="p-3.5 font-semibold text-slate-900">{row.category}</td>
                      <td className="p-3.5 font-mono text-slate-600">{row.thickness_mm} mm</td>
                      <td className="p-3.5 text-right font-mono font-medium text-slate-900">{row.total_pieces}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-600">{row.in_stock_pieces}</td>
                      <td className="p-3.5 text-right font-mono text-slate-700">{row.in_main}</td>
                      <td className="p-3.5 text-right font-mono text-slate-700">{row.in_outlet}</td>
                      <td className="p-3.5 text-right font-mono text-slate-400">{row.sold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Pieces Table */}
      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <LoadingState />
      ) : pieces.length === 0 ? (
        <EmptyState>No finished pieces matching your filter.</EmptyState>
      ) : (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Piece Code</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Grade</th>
                  <th className="p-4">Thickness</th>
                  <th className="p-4">Dimensions</th>
                  <th className="p-4 text-right">Weight</th>
                  <th className="p-4">Location</th>
                  <th className="p-4 text-right">Selling Price</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pieces.map((p) => {
                  const locationName =
                    p.warehouse_name || warehouseMap[p.current_warehouse_id] || "Warehouse";
                  return (
                    <tr key={p.id} className="transition hover:bg-slate-50/80">
                      <td className="p-4">
                        <Link
                          className="font-bold text-blue-600 hover:underline"
                          href={`/warehouse/pieces/${p.id}`}
                        >
                          {p.piece_code}
                        </Link>
                      </td>
                      <td className="p-4 font-semibold text-slate-900">{p.category}</td>
                      <td className="p-4 text-slate-700">{p.grade}</td>
                      <td className="p-4 font-mono text-slate-700">{p.thickness_mm} mm</td>
                      <td className="p-4 font-mono text-xs text-slate-500">
                        {p.width_mm} × {p.length_mm} mm
                      </td>
                      <td className="p-4 text-right font-mono font-medium text-slate-800">
                        {p.weight_kg} kg
                      </td>
                      <td className="p-4 text-xs font-medium text-slate-700 flex items-center gap-1.5 pt-5">
                        <WarehouseIcon size={14} className="text-slate-400 shrink-0" />
                        <span>{locationName}</span>
                      </td>
                      <td className="p-4 text-right font-mono font-bold">
                        {p.selling_price ? (
                          <span className="text-slate-900">${parseFloat(p.selling_price).toFixed(2)}</span>
                        ) : (
                          <span className="text-amber-600 text-xs font-semibold">Unpriced</span>
                        )}
                      </td>
                      <td className="p-4">
                        <StatusBadge value={p.status} />
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
