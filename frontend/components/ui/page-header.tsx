import Link from "next/link";
import { Button } from "@/components/ui/button";
export function PageHeader({ title, description, action, href }: { title: string; description?: string; action?: string; href?: string }) {
  return <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">{title}</h1>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>{action && href && <Link href={href}><Button>{action}</Button></Link>}</div>;
}
