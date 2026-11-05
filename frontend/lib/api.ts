import { AuthResponse, Coil, CoilDetail, CoilInput, Payment, PaymentMethod, Piece, PieceTrace, ProductionOutput, ProductionOutputInput, ProductionRun, ProductionRunDetail, ProductionRunInput, Sale, SaleDetail, SaleStatus, SaleType, StockTransfer, StockTransferResult, Warehouse } from "@/types";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
export class ApiError extends Error { status: number; details?: unknown; constructor(message: string, status: number, details?: unknown) { super(message); this.name = "ApiError"; this.status = status; this.details = details; } }
function errorMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(errorMessage).filter(Boolean).join("; ");
  if (value && typeof value === "object") { const item = value as Record<string, unknown>; if ("msg" in item) return String(item.msg); if ("detail" in item) return errorMessage(item.detail); if ("message" in item) return String(item.message); }
  return "Request failed";
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) { let body: unknown; try { body = await response.json(); } catch { body = undefined; } throw new ApiError(errorMessage(body), response.status, body); }
  if (response.status === 204) return undefined as T;
  return response.json();
}
function query(params?: Record<string, string | number | undefined>) {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") search.set(key, String(value)); });
  const result = search.toString();
  return result ? `?${result}` : "";
}
export async function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}
export async function register(email: string, password: string, full_name: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify({ email, password, full_name }) });
}
export const api = {
  listCoils: (params?: { status?: string; search?: string; skip?: number; limit?: number }) => request<Coil[]>(`/coils/${query(params)}`),
  getCoil: (id: string) => request<CoilDetail>(`/coils/${id}`),
  getCoilDetail: (id: string) => request<CoilDetail>(`/coils/${id}`),
  createCoil: (input: CoilInput) => request<Coil>("/coils/", { method: "POST", body: JSON.stringify(input) }),
  listPieces: (params?: { status?: string; coil_id?: string; warehouse_id?: string; category?: string; q?: string }) => request<Piece[]>(`/pieces/${query(params)}`),
  getPiece: (id: string) => request<Piece>(`/pieces/${id}`),
  listProductionRuns: (params?: { status?: string; coil_id?: string; skip?: number; limit?: number }) => request<ProductionRun[]>(`/production-runs/${query(params)}`),
  getProductionRun: (id: string) => request<ProductionRunDetail>(`/production-runs/${id}`),
  createProductionRun: (input: ProductionRunInput) => request<ProductionRun>("/production-runs/", { method: "POST", body: JSON.stringify(input) }),
  addProductionOutput: (id: string, input: ProductionOutputInput) => request<ProductionOutput>(`/production-runs/${id}/outputs`, { method: "POST", body: JSON.stringify(input) }),
  deleteProductionOutput: (runId: string, outputId: string) => request<void>(`/production-runs/${runId}/outputs/${outputId}`, { method: "DELETE" }),
  deleteOutput: (runId: string, outputId: string) => request<void>(`/production-runs/${runId}/outputs/${outputId}`, { method: "DELETE" }),
  completeProductionRun: (id: string) => request<Piece[]>(`/production-runs/${id}/complete`, { method: "POST" }),
  cancelProductionRun: (id: string) => request<ProductionRun>(`/production-runs/${id}/cancel`, { method: "POST" }),
  tracePiece: (id: string) => request<PieceTrace>(`/pieces/${id}/trace`),
  getPieceTrace: (id: string) => request<PieceTrace>(`/pieces/${id}/trace`),
  listWarehouses: () => request<Warehouse[]>("/warehouses/"),
  listStockTransfers: (params?: { from?: string; to?: string; warehouse_id?: string }) => request<StockTransfer[]>(`/stock-transfers/${query(params)}`),
  createStockTransfer: (input: { piece_ids: string[]; to_warehouse_id: string; note?: string }) => request<StockTransferResult>("/stock-transfers/", { method: "POST", body: JSON.stringify(input) }),
  listSales: (params?: { from?: string; to?: string; channel?: SaleType; status?: SaleStatus; customer?: string }) => request<Sale[]>(`/sales/${query(params)}`),
  getSale: (id: string) => request<SaleDetail>(`/sales/${id}`),
  createSale: (input: { sale_type: SaleType; customer_name: string; warehouse_id: string; line_items: { piece_id: string; sale_price: string }[]; notes?: string }) => request<SaleDetail>("/sales/", { method: "POST", body: JSON.stringify(input) }),
  recordPayment: (id: string, input: { amount: string; method: PaymentMethod; reference?: string }) => request<Payment>(`/sales/${id}/payments`, { method: "POST", body: JSON.stringify(input) }),
  cancelSale: (id: string) => request<SaleDetail>(`/sales/${id}/cancel`, { method: "POST" }),
};
