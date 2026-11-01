import { AuthResponse } from "@/types";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!response.ok) throw new Error((await response.json()).detail ?? "Unable to sign in");
  return response.json();
}
export async function register(email: string, password: string, full_name: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, full_name }) });
  if (!response.ok) throw new Error((await response.json()).detail ?? "Unable to register");
  return response.json();
}

