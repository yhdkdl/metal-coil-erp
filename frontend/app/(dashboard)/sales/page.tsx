"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Sale } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { api.listSales().then(setSales).catch((e) => setError(e.message)); }, []);
  return <section><PageHeader title="Sales" description="Bulk and retail sales." action="New sale" href="/sales/new?channel=bulk" />
    {error ? <ErrorState message={error} /> : !sales.length ? <EmptyState>No sales recorded.</EmptyState> : <Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-4">Sale</th><th className="p-4">Customer</th><th className="p-4">Channel</th><th className="p-4">Total</th><th className="p-4">Status</th><th className="p-4">Date</th></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id} className="border-b last:border-0"><td className="p-4"><Link className="font-medium underline" href={`/sales/${sale.id}`}>{sale.sale_number}</Link></td><td className="p-4">{sale.customer_name}</td><td className="p-4">{sale.sale_type}</td><td className="p-4">{sale.total_amount}</td><td className="p-4"><StatusBadge value={sale.status} /></td><td className="p-4">{new Date(sale.created_at).toLocaleString()}</td></tr>)}</tbody></table></div></Card>}
  </section>;
}
