"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StockTransfer, Warehouse } from "@/types";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";
import { Button } from "@/components/ui/button";

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.listStockTransfers(), api.listWarehouses()]).then(([items, locations]) => {
      setTransfers(items); setWarehouses(locations);
    }).catch((e) => setError(e.message));
  }, []);
  const name = (id: string) => warehouses.find((warehouse) => warehouse.id === id)?.name ?? id.slice(0, 8);
  return <section><PageHeader title="Transfers" description="Move finished pieces from Main to Outlet." action="New transfer" href="/warehouse/transfers/new" />
    {error ? <ErrorState message={error} /> : !warehouses.length && !transfers.length ? <LoadingState /> : !transfers.length ? <EmptyState>No transfers recorded.</EmptyState> :
      <Card><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-4">Date</th><th className="p-4">Pieces</th><th className="p-4">Weight</th><th className="p-4">From</th><th className="p-4">To</th><th className="p-4">Note</th></tr></thead><tbody>{transfers.map((transfer) => <tr key={transfer.transfer_group_id} className="border-b last:border-0"><td className="p-4">{new Date(transfer.created_at).toLocaleString()}</td><td className="p-4">{transfer.piece_count}</td><td className="p-4">{transfer.total_weight_kg} kg</td><td className="p-4">{name(transfer.from_warehouse_id)}</td><td className="p-4">{name(transfer.to_warehouse_id)}</td><td className="p-4 text-slate-500">{transfer.note ?? "—"}</td></tr>)}</tbody></table></div></Card>}
  </section>;
}
