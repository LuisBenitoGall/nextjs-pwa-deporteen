export default function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-md bg-slate-800" />
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded-md bg-slate-800" />
          <div className="h-8 w-16 rounded-md bg-slate-800" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-700">
        <div className="h-10 bg-slate-800/70" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-t border-slate-800 px-4 py-3">
            <div className="h-4 flex-1 rounded bg-slate-800" />
            <div className="h-4 w-24 rounded bg-slate-800" />
            <div className="h-4 w-20 rounded bg-slate-800" />
            <div className="h-4 w-16 rounded bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
