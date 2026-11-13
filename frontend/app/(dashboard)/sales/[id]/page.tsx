"use client";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { PaymentMethod, SaleDetail } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  CreditCard,
  DollarSign,
  PackageCheck,
  Warehouse,
  Calendar,
  AlertCircle,
  FileText,
  User,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sale, setSale] = useState<SaleDetail>();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) {
      api.getSale(id)
        .then(setSale)
        .catch((e) => setError(e.message));
    }
  }, [id]);

  async function pay(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.recordPayment(id, {
        amount,
        method,
        reference: reference.trim() || undefined,
      });
      setSale(await api.getSale(id));
      setAmount("");
      setReference("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to record payment");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!window.confirm("Cancel this sale and return its pieces to active inventory?")) {
      return;
    }
    setBusy(true);
    try {
      setSale(await api.cancelSale(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to cancel sale");
    } finally {
      setBusy(false);
    }
  }

  if (error && !sale) return <ErrorState message={error} />;
  if (!sale) return <LoadingState />;

  const isPaid = sale.status === "PAID";
  const isCancelled = sale.status === "CANCELLED";
  const canCancel = !isCancelled && parseFloat(sale.amount_paid) === 0;

  return (
    <section className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/sales"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2"
          >
            <ArrowLeft size={14} /> Back to Sales Orders
          </Link>
          <PageHeader
            title={sale.sale_number}
            description={`Order placed for ${sale.customer_name} via ${sale.sale_type} channel`}
          />
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-bold ${sale.sale_type === "BULK"
              ? "bg-blue-50 text-blue-700 border border-blue-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
          >
            {sale.sale_type} CHANNEL
          </span>
          <StatusBadge value={sale.status} />
        </div>
      </div>

      {/* Financial Scorecard */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Contract Amount
            </span>
            <p className="mt-2 text-2xl font-bold font-mono text-slate-900">
              ${parseFloat(sale.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-slate-500">{sale.line_items.length} line items sold</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Amount Paid to Date
            </span>
            <p className="mt-2 text-2xl font-bold font-mono text-emerald-600">
              ${parseFloat(sale.amount_paid).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-slate-500">{sale.payments.length} payment records</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Balance Due
            </span>
            <p className={`mt-2 text-2xl font-bold font-mono ${parseFloat(sale.amount_due) > 0 ? "text-amber-600" : "text-slate-900"}`}>
              ${parseFloat(sale.amount_due).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {parseFloat(sale.amount_due) === 0 ? "Paid in full" : "Outstanding receivable"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2/3): Sold Line Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-900">Sold Items & Piece Specifications</h3>
                  <p className="text-xs text-slate-500">
                    Traceable finished pieces fulfilled under this sales order.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-600 font-mono">
                  {sale.line_items.length} pieces
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="p-3.5">Piece Code</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Grade</th>
                      <th className="p-3.5">Dimensions</th>
                      <th className="p-3.5 text-right">Weight</th>
                      <th className="p-3.5 text-right">Sale Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sale.line_items.map((item, idx) => (
                      <tr key={item.piece_id || idx} className="transition hover:bg-slate-50/70">
                        <td className="p-3.5 font-semibold">
                          <Link
                            href={`/warehouse/pieces/${item.piece_id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {item.piece_code || item.piece_id.slice(0, 12)}
                          </Link>
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">{item.category || "—"}</td>
                        <td className="p-3.5 text-slate-600">{item.grade || "—"}</td>
                        <td className="p-3.5 font-mono text-slate-600">
                          {item.thickness_mm ? `${item.thickness_mm} × ${item.width_mm} × ${item.length_mm} mm` : "—"}
                        </td>
                        <td className="p-3.5 text-right font-mono text-slate-700">
                          {item.weight_kg ? `${item.weight_kg} kg` : "—"}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                          ${parseFloat(item.sale_price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                      <td colSpan={5} className="p-3.5">Total Sale Amount</td>
                      <td className="p-3.5 text-right font-mono text-base">
                        ${parseFloat(sale.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Order Metadata */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Order Log & Fulfillment Data
              </h4>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs uppercase font-semibold text-slate-400">Customer Name</dt>
                  <dd className="mt-1 font-bold text-slate-800">{sale.customer_name}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase font-semibold text-slate-400">Warehouse Location</dt>
                  <dd className="mt-1 font-medium text-slate-800">
                    {sale.warehouse_name || (sale.sale_type === "BULK" ? "Main Production Warehouse" : "Retail Outlet")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase font-semibold text-slate-400">Created At</dt>
                  <dd className="mt-1 text-slate-600 font-mono text-xs">
                    {new Date(sale.created_at).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase font-semibold text-slate-400">Completed Date</dt>
                  <dd className="mt-1 text-slate-600 font-mono text-xs">
                    {sale.completed_at ? new Date(sale.completed_at).toLocaleString() : "Pending"}
                  </dd>
                </div>
                {sale.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase font-semibold text-slate-400">Order Notes</dt>
                    <dd className="mt-1 text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                      {sale.notes}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3): Payment Terminal & Cancellation */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard size={17} className="text-emerald-600" />
                  Payments
                </h3>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  {sale.payments.length} recorded
                </span>
              </div>

              {/* Payment Records List */}
              {sale.payments.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No payments recorded against this order.</p>
              ) : (
                <div className="space-y-2">
                  {sale.payments.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          ${parseFloat(p.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {p.method} {p.reference ? `· Ref: ${p.reference}` : ""}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(p.paid_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Record Payment Form */}
              {!isPaid && !isCancelled && (
                <form onSubmit={pay} className="space-y-3 pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Record New Payment
                  </h4>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Amount ($)</label>
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={sale.amount_due}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Max ${sale.amount_due}`}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Payment Method</label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-slate-900 focus:outline-none"
                    >
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600">Payment Reference</label>
                    <input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Transaction / check number"
                      className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>

                  <Button className="w-full mt-2" disabled={busy}>
                    {busy ? "Processing..." : "Submit Payment"}
                  </Button>
                </form>
              )}

              {/* Order Cancellation */}
              {canCancel && (
                <div className="pt-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    className="w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
                    disabled={busy}
                    onClick={cancel}
                  >
                    <XCircle size={15} className="mr-1.5" />
                    Cancel Order
                  </Button>
                  <p className="mt-1.5 text-[11px] text-slate-400 text-center">
                    Pieces will immediately return to available warehouse inventory.
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
