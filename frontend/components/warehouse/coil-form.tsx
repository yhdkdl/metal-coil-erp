"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
const fields = [["coil_number","Coil number"],["heat_number","Heat number"],["supplier","Supplier"],["grade","Grade"],["thickness_mm","Thickness (mm)"],["width_mm","Width (mm)"],["total_weight_kg","Weight (kg)"],["cost_per_kg","Cost per kg"]];
export function CoilForm() {
  const [values, setValues] = useState<Record<string,string>>({}); const [error,setError]=useState(""); const [saving,setSaving]=useState(false); const router=useRouter();
  async function submit(e: FormEvent) { e.preventDefault(); setSaving(true); setError(""); try { const numeric=["thickness_mm","width_mm","total_weight_kg","cost_per_kg"]; const input=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,numeric.includes(k)?Number(v):v])); const coil=await api.createCoil(input as never); router.push(`/warehouse/coils/${coil.id}`); } catch (e) { setError(e instanceof Error?e.message:"Unable to create coil"); } finally { setSaving(false); } }
  return <form onSubmit={submit} className="max-w-3xl space-y-6 rounded-xl border bg-white p-6 shadow-sm"><div className="grid gap-5 sm:grid-cols-2">{fields.map(([name,label])=><label key={name} className="text-sm font-medium text-slate-700">{label}<input required type={name.includes("mm")||name.includes("kg")?"number":"text"} step={name.includes("mm")||name.includes("kg")?"0.01":undefined} value={values[name]??""} onChange={e=>setValues({...values,[name]:e.target.value})} className="mt-2 h-10 w-full rounded-md border px-3 font-normal outline-none focus:ring-2 focus:ring-slate-300" /></label>)}</div>{error&&<p className="text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={()=>router.back()}>Cancel</Button><Button disabled={saving}>{saving?"Saving…":"Create coil"}</Button></div></form>;
}
