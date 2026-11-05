"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { InventoryValuation } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState } from "@/components/ui/data-state";

export default function InventoryValuationPage() {
  const [valuation, setValuation] = useState<InventoryValuation>();
  const [error, setError] = useState("");
  useEffect(() => { api.getInventoryValuation().then(setValuation).catch((e) => setError(e.message)); }, []);
  function exportCsv() { if (!valuation) return; const values = [["warehouse", "pieces", "cost_value", "list_value"], ...valuation.by_warehouse.map((row) => [row.warehouse_name, String(row.piece_count), row.cost_value, row.list_value])]; const blob = new Blob([values.map((row) => row.join(",")).join("\n")], { type: "text/csv" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "inventory-valuation.csv"; link.click(); }
  if (error) return <ErrorState message={error} />; if (!valuation) return <LoadingState />;
  return <section><PageHeader title="Inventory valuation" description="Current value of unsold pieces by warehouse." /><button onClick={exportCsv} className="mb-4 rounded-md border px-4 py-2 text-sm">Export CSV</button><Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-4">Warehouse</th><th className="p-4">Pieces</th><th className="p-4">Cost value</th><th className="p-4">List value</th></tr></thead><tbody>{valuation.by_warehouse.map((row) => <tr key={row.warehouse_id} className="border-b"><td className="p-4">{row.warehouse_name}</td><td className="p-4">{row.piece_count}</td><td className="p-4">{row.cost_value}</td><td className="p-4">{row.list_value}</td></tr>)}</tbody></table></div></Card><p className="mt-4 text-sm text-slate-600">Total cost: {valuation.total_cost_value} · Total list: {valuation.total_list_value} · Missing prices: {valuation.null_price_count}</p></section>;
}
