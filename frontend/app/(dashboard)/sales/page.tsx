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
  const [customer, setCustomer] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { api.listSales({ customer: customer || undefined, category: category || undefined }).then(setSales).catch((e) => setError(e.message)); }, [customer, category]);
  return <section><PageHeader title="Sales" description="Bulk and retail sales." action="New sale" href="/sales/new" />
    <Card className="mb-4"><div className="grid gap-4 p-4 sm:grid-cols-2"><label className="text-sm font-medium">Customer/name<input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Search customer or name" className="mt-1 h-10 w-full rounded-md border px-3 font-normal" /></label><label className="text-sm font-medium">Piece category<input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Filter by category" className="mt-1 h-10 w-full rounded-md border px-3 font-normal" /></label></div></Card>
    {error ? <ErrorState message={error} /> : !sales.length ? <EmptyState>No matching sales recorded.</EmptyState> : <Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-4">Sale</th><th className="p-4">Customer</th><th className="p-4">Channel</th><th className="p-4">Total</th><th className="p-4">Status</th><th className="p-4">Date</th></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id} className="border-b last:border-0"><td className="p-4"><Link className="font-medium underline" href={`/sales/${sale.id}`}>{sale.sale_number}</Link></td><td className="p-4">{sale.customer_name}</td><td className="p-4">{sale.sale_type}</td><td className="p-4">{sale.total_amount}</td><td className="p-4"><StatusBadge value={sale.status} /></td><td className="p-4">{new Date(sale.created_at).toLocaleString()}</td></tr>)}</tbody></table></div></Card>}
  </section>;
}
