import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  action,
  href,
}: {
  title: string;
  description?: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action && href && (
        <div className="shrink-0">
          <Link href={href}>
            <Button className="w-full sm:w-auto">{action}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
