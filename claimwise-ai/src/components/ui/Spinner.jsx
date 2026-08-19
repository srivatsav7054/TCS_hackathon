export default function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      <span className="text-xs text-slate-400">Loading claims…</span>
    </div>
  );
}
