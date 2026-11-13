"use client";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { ProductionRun, ProductionRunStatus } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Factory, Plus, Search, Layers, Clock, CheckCircle2, RotateCcw } from "lucide-react";

export default function ProductionPage() {
  const [runs, setRuns] = useState<ProductionRun[]>([]);
  const [statusFilter, setStatusFilter] = useState<ProductionRunStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.listProductionRuns()
      .then((data) => {
        setRuns(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      const matchesStatus = statusFilter === "ALL" || run.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        run.machine_type.toLowerCase().includes(q) ||
        (run.coil_number && run.coil_number.toLowerCase().includes(q)) ||
        (run.operator_name && run.operator_name.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [runs, statusFilter, search]);

  const activeRuns = runs.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS").length;
  const completedRuns = runs.filter((r) => r.status === "COMPLETED").length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Production Floor"
          description="Slitting and shearing runs, machine operator terminals, and finished piece staging."
        />
        <Link
          href="/production/new"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-400 px-4 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-amber-300"
        >
          <Plus size={16} /> Start Production Run
        </Link>
      </div>

      {/* Operational Scorecard */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Floor Runs
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <Factory size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">{activeRuns}</span>
              {activeRuns > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                  Live Cutting
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">Currently staging or in-progress</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Completed Runs
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-slate-900">{completedRuns}</p>
            <p className="mt-1 text-xs text-slate-500">Pieces produced and moved to Main</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Runs Logged
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700">
                <Layers size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono text-slate-900">{runs.length}</p>
            <p className="mt-1 text-xs text-slate-500">Total historical cutting runs</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search machine, coil number, or operator..."
                className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-slate-900 focus:outline-none"
              />
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(["ALL", "OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                    statusFilter === st
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL" ? "All Runs" : st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Runs Table */}
      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <LoadingState />
      ) : filteredRuns.length === 0 ? (
        <EmptyState>No production runs matching your filter.</EmptyState>
      ) : (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="p-3 sm:p-4">Run Terminal</th>
                  <th className="p-4 hidden sm:table-cell">Machine Line</th>
                  <th className="p-4 hidden md:table-cell">Source Mother Coil</th>
                  <th className="p-4 hidden md:table-cell">Operator</th>
                  <th className="p-3 sm:p-4 text-center">Status</th>
                  <th className="p-4 hidden lg:table-cell">Started At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRuns.map((run) => (
                  <tr key={run.id} className="transition hover:bg-slate-50/80">
                    <td className="p-3 sm:p-4">
                      <Link
                        className="font-bold text-blue-600 hover:underline block font-mono text-xs sm:text-sm"
                        href={`/production/${run.id}`}
                      >
                        Terminal #{run.id.slice(0, 8).toUpperCase()}
                      </Link>
                      <div className="text-[11px] font-medium text-slate-900 sm:hidden mt-0.5">
                        {run.machine_type}
                      </div>
                      <div className="text-[10px] text-slate-500 sm:hidden font-mono">
                        {run.coil_number || `Coil #${run.coil_id.slice(0, 8)}`}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-900 hidden sm:table-cell">{run.machine_type}</td>
                    <td className="p-4 hidden md:table-cell">
                      <Link
                        href={`/warehouse/coils/${run.coil_id}`}
                        className="font-mono font-medium text-slate-800 hover:text-amber-600 underline"
                      >
                        {run.coil_number || `Coil #${run.coil_id.slice(0, 8)}`}
                      </Link>
                    </td>
                    <td className="p-4 text-slate-700 hidden md:table-cell">{run.operator_name || "Floor Operator"}</td>
                    <td className="p-3 sm:p-4 text-center">
                      <StatusBadge value={run.status} />
                    </td>
                    <td className="p-4 text-xs text-slate-500 font-mono hidden lg:table-cell">
                      {new Date(run.started_at).toLocaleString(undefined, {
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
