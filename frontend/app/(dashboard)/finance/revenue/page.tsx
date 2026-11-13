"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RevenueReport } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState } from "@/components/ui/data-state";

export default function RevenuePage() {
  const [granularity, setGranularity] = useState<"day" | "week" | "month" | "year">("day");
  const [report, setReport] = useState<RevenueReport>();
  const [category, setCategory] = useState("");
  const [customer, setCustomer] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { api.getRevenueReport({ granularity, category: category || undefined, customer: customer || undefined }).then(setReport).catch((e) => setError(e.message)); }, [granularity, category, customer]);
  function exportCsv() { if (!report) return; const rows = [["start", "end", "revenue", "cogs", "gross_profit", "sale_count"], ...report.periods.map((row) => [row.start, row.end, row.revenue, row.cogs, row.gross_profit, String(row.sale_count)])]; const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "revenue.csv"; link.click(); URL.revokeObjectURL(url); }
  if (error) return <ErrorState message={error} />; if (!report) return <LoadingState />;
  return <section><PageHeader title="Revenue" description="Revenue by reporting period." /><Card className="mb-4"><div className="grid gap-4 p-4 sm:grid-cols-2"><label className="text-sm font-medium">Piece category<input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Filter by category" className="mt-1 h-10 w-full rounded-md border px-3 font-normal" /></label><label className="text-sm font-medium">Customer<input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Filter by customer" className="mt-1 h-10 w-full rounded-md border px-3 font-normal" /></label></div></Card><div className="mb-4 flex gap-3"><select value={granularity} onChange={(e) => setGranularity(e.target.value as typeof granularity)} className="h-10 rounded-md border px-3"><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option></select><button onClick={exportCsv} className="rounded-md border px-4 text-sm">Export CSV</button></div><Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-4">Period</th><th className="p-4">Revenue</th><th className="p-4">COGS</th><th className="p-4">Gross profit</th><th className="p-4">Sales</th></tr></thead><tbody>{report.periods.map((row) => <tr key={row.start} className="border-b"><td className="p-4">{new Date(row.start).toLocaleDateString()}</td><td className="p-4">{row.revenue}</td><td className="p-4">{row.cogs}</td><td className="p-4">{row.gross_profit}</td><td className="p-4">{row.sale_count}</td></tr>)}</tbody></table></div></Card></section>;
}
