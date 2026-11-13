"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Piece, SaleType, Warehouse } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState, EmptyState, LoadingState } from "@/components/ui/data-state";

const formatCurrency = (val?: number | string | null) => {
  if (val == null || val === "") return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

export default function NewSalePage() {
  const router = useRouter();
  const [channel, setChannel] = useState<SaleType>("BULK");
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selected, setSelected] = useState<Record<string, string | undefined>>({});
  const [customer, setCustomer] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setChannel(new URLSearchParams(window.location.search).get("channel") === "retail" ? "RETAIL" : "BULK");
  }, []);

  function changeChannel(value: SaleType) {
    setChannel(value);
    setSelected({});
    setSearch("");
    window.history.replaceState(null, "", `/sales/new?channel=${value.toLowerCase()}`);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    Promise.all([
      api.listPieces({ status: channel === "BULK" ? "IN_MAIN" : "IN_OUTLET" }),
      api.listWarehouses(),
    ])
      .then(([available, locations]) => {
        if (!active) return;
        setPieces(available);
        const eligible = locations.filter((item) => item.type === (channel === "BULK" ? "MAIN" : "OUTLET"));
        setWarehouses(eligible);
        setWarehouseId(eligible[0]?.id ?? "");
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Unable to load inventory");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [channel]);

  const chosen = useMemo(() => {
    return pieces.filter((piece) => selected[piece.id] !== undefined);
  }, [pieces, selected]);

  const visiblePieces = useMemo(() => {
    if (!search.trim()) return pieces;
    const q = search.toLowerCase();
    return pieces.filter(
      (p) =>
        p.piece_code.toLowerCase().includes(q) ||
        p.grade.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [pieces, search]);

  const pricedPieceCount = useMemo(() => {
    return pieces.filter((piece) => piece.selling_price != null && piece.selling_price !== "").length;
  }, [pieces]);

  const totalAmount = useMemo(() => {
    return chosen.reduce(
      (sum, piece) => sum + Number(selected[piece.id] || piece.selling_price || 0),
      0
    );
  }, [chosen, selected]);

  const totalWeightKg = useMemo(() => {
    return chosen.reduce((sum, piece) => sum + Number(piece.weight_kg || 0), 0);
  }, [chosen]);

  function togglePiece(piece: Piece, checked: boolean) {
    if (piece.selling_price == null) return;
    setSelected((current) => ({
      ...current,
      [piece.id]: checked ? (piece.selling_price ?? undefined) : undefined,
    }));
  }

  function handleCustomPriceChange(pieceId: string, val: string) {
    setSelected((current) => ({
      ...current,
      [pieceId]: val,
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!customer.trim() || !chosen.length || !warehouseId) {
      setError("Please specify customer name, dispatch warehouse, and at least one item.");
      return;
    }

    if (
      !window.confirm(
        `Create ${channel.toLowerCase()} sales order for ${customer} containing ${chosen.length} pieces (${formatCurrency(totalAmount)})?`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const sale = await api.createSale({
        sale_type: channel,
        customer_name: customer.trim(),
        warehouse_id: warehouseId,
        notes: notes.trim() || undefined,
        line_items: chosen.map((piece) => ({
          piece_id: piece.id,
          sale_price: selected[piece.id] || piece.selling_price || "0",
        })),
      });
      router.push(`/sales/${sale.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate sales order");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/sales"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          ← Back to Sales Orders
        </Link>
        <div className="mt-2">
          <PageHeader
            title="Create Sales Order"
            description="Generate customer invoice and book inventory dispatch from Main or Outlet warehouses."
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Channel Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => changeChannel("BULK")}
          className={`flex items-center gap-2 border-b-2 py-3 px-6 text-sm font-semibold transition-colors ${
            channel === "BULK"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Bulk Wholesale Order</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            Main Plant Inventory
          </span>
        </button>

        <button
          type="button"
          onClick={() => changeChannel("RETAIL")}
          className={`flex items-center gap-2 border-b-2 py-3 px-6 text-sm font-semibold transition-colors ${
            channel === "RETAIL"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Retail Outlet Order</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            Outlet Inventory
          </span>
        </button>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Customer & Fulfillment Header */}
        <Card className="p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            1. Order Header & Dispatch Facility
          </h2>

          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">
                Customer / Account Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="e.g. Apex Industrial Fabricators LLC"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">
                Dispatch Warehouse <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                {warehouses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">
                Order Notes / PO Reference
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. PO-98421, FOB Destination"
                className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>
        </Card>

        {/* Pricing notice if pieces unpriced */}
        {pricedPieceCount < pieces.length && (
          <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            <span>
              <strong>Note:</strong> {pieces.length - pricedPieceCount} unsold pieces lack preset catalog prices and cannot be selected.
            </span>
            <Link href="/sales/pricing" className="font-semibold underline hover:text-amber-950">
              Set Prices in Pricing Engine →
            </Link>
          </div>
        )}

        {/* Piece Selection Table */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-4 sm:flex sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                2. Select Available Finished Stock
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {visiblePieces.length} available items in {channel === "BULK" ? "Main Yard" : "Outlet"}
              </p>
            </div>

            <div className="mt-3 sm:mt-0">
              <input
                type="text"
                placeholder="Search piece code, grade, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-64 rounded-lg border border-slate-200 px-3 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>

          {visiblePieces.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              {pieces.length === 0
                ? "No inventory available in this warehouse channel."
                : "No pieces match your search filter."}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-slate-200 bg-white text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4 w-12 text-center">Select</th>
                    <th className="py-2.5 px-4">Piece Code</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Grade</th>
                    <th className="py-2.5 px-4">Dimensions</th>
                    <th className="py-2.5 px-4 text-right">Weight</th>
                    <th className="py-2.5 px-4 text-right">Selling Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visiblePieces.map((piece) => {
                    const isSelected = selected[piece.id] !== undefined;
                    const isUnpriced = piece.selling_price == null;
                    return (
                      <tr
                        key={piece.id}
                        onClick={() => !isUnpriced && togglePiece(piece, !isSelected)}
                        className={`transition-colors ${
                          isUnpriced
                            ? "cursor-not-allowed bg-slate-50/50 opacity-50"
                            : isSelected
                            ? "cursor-pointer bg-blue-50/70 hover:bg-blue-50"
                            : "cursor-pointer hover:bg-slate-50"
                        }`}
                      >
                        <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            disabled={isUnpriced}
                            checked={isSelected}
                            onChange={(e) => togglePiece(piece, e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs font-semibold text-slate-900">
                          {piece.piece_code}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-700">{piece.category}</td>
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-700">{piece.grade}</td>
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-500">
                          {piece.thickness_mm} × {piece.width_mm} × {piece.length_mm} mm
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs font-medium text-slate-900">
                          {Number(piece.weight_kg).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-slate-900">
                          {isUnpriced ? (
                            <span className="text-amber-700">Unpriced</span>
                          ) : (
                            formatCurrency(piece.selling_price)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Selected Line Items Order Review */}
        {chosen.length > 0 && (
          <Card className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              3. Order Line Items Manifest ({chosen.length} items)
            </h2>

            <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {chosen.map((piece) => (
                <div key={piece.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {piece.piece_code}
                    </span>
                    <span className="text-xs text-slate-500">
                      {piece.category} · {piece.grade} · {piece.weight_kg} kg
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Sale Price:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={selected[piece.id] ?? ""}
                      onChange={(e) => handleCustomPriceChange(piece.id, e.target.value)}
                      className="h-8 w-28 rounded-md border border-slate-200 px-2 text-right font-mono text-xs focus:border-slate-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => togglePiece(piece, false)}
                      className="text-xs text-red-500 hover:text-red-700 ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Order Totals Bar */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Order Commercial Total
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-2xl font-bold text-slate-900 font-mono">
                {formatCurrency(totalAmount)}
              </span>
              <span className="text-sm font-semibold text-blue-600 font-mono">
                {chosen.length} pieces ({totalWeightKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button disabled={busy || chosen.length === 0 || !customer.trim() || !warehouseId}>
              {busy ? "Generating Order..." : `Book Sales Order (${formatCurrency(totalAmount)})`}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
