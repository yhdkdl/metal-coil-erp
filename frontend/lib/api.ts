import { AdminUserInput, AuthResponse, Coil, CoilDetail, CoilInput, InventoryValuation, Payment, PaymentMethod, Piece, PieceTrace, PriceHistory, ProfitByCoil, ProductionOutput, ProductionOutputInput, ProductionRun, ProductionRunDetail, ProductionRunInput, RevenueReport, Role, Sale, SaleDetail, SaleStatus, SaleType, StockTransfer, StockTransferResult, User, Warehouse } from "@/types";
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const GET_CACHE_TTL = 15_000;
const cache = new Map<string, { expiresAt: number; value: unknown }>();
const inFlight = new Map<string, Promise<unknown>>();
export class ApiError extends Error { status: number; details?: unknown; constructor(message: string, status: number, details?: unknown) { super(message); this.name = "ApiError"; this.status = status; this.details = details; } }
function errorMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(errorMessage).filter(Boolean).join("; ");
  if (value && typeof value === "object") { const item = value as Record<string, unknown>; if ("msg" in item) return String(item.msg); if ("detail" in item) return errorMessage(item.detail); if ("message" in item) return String(item.message); }
  return "Request failed";
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError("NEXT_PUBLIC_API_URL is not configured.", 0);
  }
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const method = (init.method ?? "GET").toUpperCase();
  const cacheKey = `${method}:${path}`;
  if (method === "GET") {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    const pending = inFlight.get(cacheKey);
    if (pending) return pending as Promise<T>;
  }
  let response: Response;
  const fetchRequest = async (): Promise<T> => {
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    throw new ApiError(`Unable to reach the backend at ${API_URL}. ${message}`, 0, error);
  }
  if (!response.ok) { let body: unknown; try { body = await response.json(); } catch { body = undefined; } throw new ApiError(errorMessage(body), response.status, body); }
  if (response.status === 204) return undefined as T;
  const value = await response.json() as T;
  if (method === "GET") cache.set(cacheKey, { expiresAt: Date.now() + GET_CACHE_TTL, value });
  return value;
  };
  if (method !== "GET") {
    const result = await fetchRequest();
    invalidateCache();
    return result;
  }
  const pending = fetchRequest();
  inFlight.set(cacheKey, pending);
  try { return await pending; } finally { inFlight.delete(cacheKey); }
}
function invalidateCache(prefix?: string) {
  Array.from(cache.keys()).forEach((key) => { if (!prefix || key.includes(`:${prefix}`)) cache.delete(key); });
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
  updatePiecePrice: (id: string, input: { selling_price: string; reason?: string }) => request<Piece>(`/pieces/${id}/price`, { method: "PATCH", body: JSON.stringify(input) }),
  listWarehouses: () => request<Warehouse[]>("/warehouses/"),
  listStockTransfers: (params?: { from?: string; to?: string; warehouse_id?: string }) => request<StockTransfer[]>(`/stock-transfers/${query(params)}`),
  createStockTransfer: (input: { piece_ids: string[]; to_warehouse_id: string; note?: string }) => request<StockTransferResult>("/stock-transfers/", { method: "POST", body: JSON.stringify(input) }),
  listSales: (params?: { from?: string; to?: string; channel?: SaleType; status?: SaleStatus; customer?: string }) => request<Sale[]>(`/sales/${query(params)}`),
  getSale: (id: string) => request<SaleDetail>(`/sales/${id}`),
  createSale: (input: { sale_type: SaleType; customer_name: string; warehouse_id: string; line_items: { piece_id: string; sale_price: string }[]; notes?: string }) => request<SaleDetail>("/sales/", { method: "POST", body: JSON.stringify(input) }),
  recordPayment: (id: string, input: { amount: string; method: PaymentMethod; reference?: string }) => request<Payment>(`/sales/${id}/payments`, { method: "POST", body: JSON.stringify(input) }),
  cancelSale: (id: string) => request<SaleDetail>(`/sales/${id}/cancel`, { method: "POST" }),
  getRevenueReport: (params?: { from?: string; to?: string; granularity?: "day" | "week" | "month" | "year"; channel?: string; warehouse_id?: string }) => request<RevenueReport>(`/reports/revenue${query(params)}`),
  getProfitByCoil: (params?: { from?: string; to?: string }) => request<ProfitByCoil[]>(`/reports/profit-by-coil${query(params)}`),
  getInventoryValuation: () => request<InventoryValuation>("/reports/inventory-valuation"),
  getPriceHistory: (id: string) => request<PriceHistory[]>(`/pieces/${id}/price-history`),
  bulkPriceUpdate: (input: { filter: { grade?: string; category?: string; thickness_mm?: string; warehouse_id?: string }; adjustment: { type: "set" | "percent" | "absolute"; value: string }; reason?: string }) => request<{ affected_count: number; pieces: Piece[]; skipped_count: number }>("/pieces/bulk-price-update", { method: "POST", body: JSON.stringify(input) }),
  listUsers: () => request<User[]>("/users/"),
  createUser: (input: AdminUserInput) => request<User>("/users/", { method: "POST", body: JSON.stringify(input) }),
  updateUser: (id: string, input: { full_name?: string; role?: Role }) => request<User>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
};
