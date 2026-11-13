import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { CoilForm } from "@/components/warehouse/coil-form";

export default function NewCoilPage() {
  return (
    <section className="space-y-6">
      <div>
        <Link
          href="/warehouse/coils"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          ← Back to Master Coils
        </Link>
        <div className="mt-2">
          <PageHeader
            title="Receive Master Coil"
            description="Log inbound raw steel coil directly into yard inventory with heat tracking and cost basis."
          />
        </div>
      </div>
      <CoilForm />
    </section>
  );
}
