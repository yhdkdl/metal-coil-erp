"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ProfitByCoil } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState } from "@/components/ui/data-state";

export default function ProfitByCoilPage() {
  const [rows, setRows] = useState<ProfitByCoil[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { api.getProfitByCoil().then(setRows).catch((e) => setError(e.message)); }, []);
  function exportCsv() { const values = [["coil_number", "sold", "unsold", "revenue", "cogs", "gross_profit"], ...rows.map((row) => [row.coil_number, String(row.pieces_sold_count), String(row.pieces_unsold_count), row.revenue, row.cogs, row.gross_profit])]; const blob = new Blob([values.map((row) => row.join(",")).join("\n")], { type: "text/csv" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "profit-by-coil.csv"; link.click(); }
  if (error) return <ErrorState message={error} />; if (!rows.length) return <LoadingState />;
  return <section><PageHeader title="Profit by coil" description="Revenue and cost for each source coil." /><button onClick={exportCsv} className="mb-4 rounded-md border px-4 py-2 text-sm">Export CSV</button><Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-4">Coil</th><th className="p-4">Sold</th><th className="p-4">Unsold</th><th className="p-4">Revenue</th><th className="p-4">COGS</th><th className="p-4">Profit</th></tr></thead><tbody>{rows.map((row) => <tr key={row.coil_number} className="border-b"><td className="p-4">{row.coil_number}</td><td className="p-4">{row.pieces_sold_count}</td><td className="p-4">{row.pieces_unsold_count}</td><td className="p-4">{row.revenue}</td><td className="p-4">{row.cogs}</td><td className="p-4">{row.gross_profit}</td></tr>)}</tbody></table></div></Card></section>;
}
