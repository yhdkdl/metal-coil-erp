import { cn } from "@/lib/utils";
export function StatusBadge({ value }: { value?: string | null }) {
  const tone = value?.toLowerCase().includes("stock") || value?.toLowerCase().includes("main") || value?.toLowerCase().includes("completed") ? "bg-emerald-50 text-emerald-700" : value?.toLowerCase().includes("cancel") ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", tone)}>{value?.replaceAll("_", " ") ?? "—"}</span>;
}
