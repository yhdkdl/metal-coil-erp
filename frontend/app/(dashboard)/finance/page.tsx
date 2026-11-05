"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RevenueReport, ProfitByCoil, InventoryValuation } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState, ErrorState } from "@/components/ui/data-state";

export default function FinancePage() {
  const [report, setReport] = useState<RevenueReport>();
  const [profit, setProfit] = useState<ProfitByCoil[]>([]);
  const [inventory, setInventory] = useState<InventoryValuation>();
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([api.getRevenueReport({ granularity: "day" }), api.getProfitByCoil(), api.getInventoryValuation()]).then(([revenue, byCoil, valuation]) => { setReport(revenue); setProfit(byCoil); setInventory(valuation); }).catch((e) => setError(e.message)); }, []);
  if (error) return <ErrorState message={error} />;
  if (!report || !inventory) return <LoadingState />;
  return <section><PageHeader title="Finance" description="Revenue, profit, and current inventory valuation." /><div className="grid gap-4 md:grid-cols-3"><Card><CardContent><p className="text-sm text-slate-500">Revenue</p><p className="mt-2 text-2xl font-semibold">{report.totals.revenue}</p></CardContent></Card><Card><CardContent><p className="text-sm text-slate-500">COGS</p><p className="mt-2 text-2xl font-semibold">{report.totals.cogs}</p></CardContent></Card><Card><CardContent><p className="text-sm text-slate-500">Gross profit</p><p className="mt-2 text-2xl font-semibold">{report.totals.gross_profit}</p></CardContent></Card></div><div className="mt-6 grid gap-6 lg:grid-cols-2"><Card><CardContent><h2 className="font-semibold">Revenue by day</h2><div className="mt-4 space-y-2 text-sm">{report.periods.map((period) => <div key={period.start} className="flex justify-between border-b py-2"><span>{new Date(period.start).toLocaleDateString()}</span><span>{period.revenue}</span></div>)}</div></CardContent></Card><Card><CardContent><h2 className="font-semibold">Inventory valuation</h2><p className="mt-3 text-sm">Pieces: {inventory.total_pieces}</p><p className="text-sm">Cost value: {inventory.total_cost_value}</p><p className="text-sm">List value: {inventory.total_list_value}</p><p className="text-sm">Missing prices: {inventory.null_price_count}</p></CardContent></Card></div><Card className="mt-6"><CardContent><h2 className="font-semibold">Profit by coil</h2><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-3">Coil</th><th className="p-3">Sold</th><th className="p-3">Unsold</th><th className="p-3">Revenue</th><th className="p-3">Profit</th></tr></thead><tbody>{profit.map((row) => <tr key={row.coil_number} className="border-b"><td className="p-3">{row.coil_number}</td><td className="p-3">{row.pieces_sold_count}</td><td className="p-3">{row.pieces_unsold_count}</td><td className="p-3">{row.revenue}</td><td className="p-3">{row.gross_profit}</td></tr>)}</tbody></table></div></CardContent></Card></section>;
}
