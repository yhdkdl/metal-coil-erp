export type Role = "ADMIN" | "PRODUCTION" | "WAREHOUSE" | "SALES" | "FINANCE";
export type User = { id: string; email: string; full_name: string; role: Role };
export type AuthResponse = { access_token: string; token_type: string; user: User };

