import * as React from "react";
import { cn } from "@/lib/utils";
export function Button({ className, variant = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" }) { return <button className={cn("inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50", variant === "outline" ? "border bg-white text-slate-700 hover:bg-slate-50" : "bg-slate-900 text-white hover:bg-slate-700", className)} {...props} />; }
