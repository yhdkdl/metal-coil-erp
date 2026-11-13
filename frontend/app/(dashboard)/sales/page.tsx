"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { api } from "@/lib/api";
import { Sale, SaleStatus, SaleType } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Download, Plus, Search, RotateCcw, ShoppingBag, DollarSign, Layers } from "lucide-react";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [customer, setCustomer] = useState("");
  const [category, setCategory] = useState("");
  const [channel, setChannel] = useState<SaleType | "ALL">("ALL");
  const [status, setStatus] = useState<SaleStatus | "ALL">("ALL");
  const [debouncedCustomer, setDebouncedCustomer] = useState("");
  const [debouncedCategory, setDebouncedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  // Debounce customer and category inputs (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedCustomer(customer);
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [customer]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedCategory(category);
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [category]);

  // Fetch sales when filters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    api.listSales({
      customer: debouncedCustomer.trim() || undefined,
      category: debouncedCategory.trim() || undefined,
      channel: channel !== "ALL" ? channel : undefined,
      status: status !== "ALL" ? status : undefined,
    })
      .then((data) => {
        if (!cancelled) {
          setSales(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedCustomer, debouncedCategory, channel, status]);

  // CSV Export handler with fallback
  async function handleExportCsv() {
    try {
      setExporting(true);
      await api.downloadSalesCsv({
        customer: debouncedCustomer.trim() || undefined,
        category: debouncedCategory.trim() || undefined,
        channel: channel !== "ALL" ? channel : undefined,
        status: status !== "ALL" ? status : undefined,
      });
    } catch {
      // Fallback: Client-side CSV export of current sales
      if (sales.length === 0) return;
      const headers = [
        "Sale Number",
        "Sale Date",
        "Customer Name",
        "Sale Channel",
        "Status",
        "Total Amount",
        "Notes"
      ];
      const rows = sales.map((s) => [
        `"${s.sale_number}"`,
        `"${s.created_at}"`,
        `"${(s.customer_name || "").replace(/"/g, '""')}"`,
        `"${s.sale_type}"`,
        `"${s.status}"`,
        s.total_amount,
        `"${(s.notes || "").replace(/"/g, '""')}"`
      ]);
      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `sales-summary-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function handleResetFilters() {
    setCustomer("");
    setCategory("");
    setChannel("ALL");
    setStatus("ALL");
  }

  const hasActiveFilters = Boolean(
    customer || category || channel !== "ALL" || status !== "ALL"
  );

  const totalFilteredRevenue = sales.reduce(
    (acc, curr) => acc + (parseFloat(curr.total_amount) || 0),
    0
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Sales Orders"
          description="Manage wholesale bulk contracts and retail outlet transactions."
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCsv}
            disabled={exporting || sales.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            title="Export all sales with complete line item details to CSV"
          >
            <Download size={16} />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <Link
            href="/sales/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-amber-300"
          >
            <Plus size={16} />
            New sale
          </Link>
        </div>
      </div>

      {/* Quick summary KPI metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Orders
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <ShoppingBag size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{sales.length}</p>
            <p className="mt-1 text-xs text-slate-500">
              {hasActiveFilters ? "Matching current filter" : "All recorded sales"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Filtered Revenue
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <DollarSign size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-slate-900">
              ${totalFilteredRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-slate-500">Combined total value</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Channel Mix
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600">
                <Layers size={16} />
              </div>
            </div>
            <p className="mt-2 text-base font-semibold text-slate-800">
              {sales.filter((s) => s.sale_type === "BULK").length} Bulk · {sales.filter((s) => s.sale_type === "RETAIL").length} Retail
            </p>
            <p className="mt-1 text-xs text-slate-500">Main warehouse vs Outlet</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-slate-600">Customer</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Filter customer..."
                  className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Piece Category / Name</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Filter category..."
                  className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Sale Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as typeof channel)}
                className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-slate-900 focus:outline-none"
              >
                <option value="ALL">All Channels</option>
                <option value="BULK">Bulk (Main)</option>
                <option value="RETAIL">Retail (Outlet)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-slate-900 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <span className="text-slate-500">
                Filtered results: <strong>{sales.length}</strong> matching sales
              </span>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
              >
                <RotateCcw size={13} />
                Reset filters
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Table */}
      {error ? (
        <ErrorState message={error} />
      ) : loading && sales.length === 0 ? (
        <LoadingState />
      ) : sales.length === 0 ? (
        <EmptyState>No matching sales recorded.</EmptyState>
      ) : (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="sm:hidden px-4 py-2 bg-slate-50 border-b border-slate-100 text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>↔ Swipe table horizontally to see all columns</span>
            <span className="font-mono text-[10px] text-slate-400">6 columns</span>
          </div>
          <div className="overflow-x-auto w-full max-w-full touch-pan-x overscroll-x-contain">
            <table className="w-full text-left text-sm min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="p-3.5 whitespace-nowrap">Sale Order</th>
                  <th className="p-3.5 whitespace-nowrap">Customer Name</th>
                  <th className="p-3.5 whitespace-nowrap">Channel</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Total Amount</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Status</th>
                  <th className="p-3.5 whitespace-nowrap">Order Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((sale) => (
                  <tr key={sale.id} className="transition hover:bg-slate-50/80">
                    <td className="p-3.5 whitespace-nowrap">
                      <Link
                        className="font-bold text-blue-600 hover:underline block font-mono text-xs"
                        href={`/sales/${sale.id}`}
                      >
                        {sale.sale_number}
                      </Link>
                    </td>
                    <td className="p-3.5 font-medium text-slate-900 whitespace-nowrap">{sale.customer_name}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${
                          sale.sale_type === "BULK"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {sale.sale_type}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-semibold text-slate-900 text-right text-xs whitespace-nowrap">
                      ${parseFloat(sale.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <StatusBadge value={sale.status} />
                    </td>
                    <td className="p-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(sale.created_at).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  );
}
