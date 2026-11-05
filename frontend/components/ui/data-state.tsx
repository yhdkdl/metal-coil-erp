export function LoadingState() { return <div className="rounded-lg border border-dashed p-10 text-center text-sm text-slate-500">Loading…</div>; }
export function ErrorState({ message }: { message: string }) { return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</div>; }
export function EmptyState({ children }: { children: React.ReactNode }) { return <div className="rounded-lg border border-dashed p-10 text-center text-sm text-slate-500">{children}</div>; }
