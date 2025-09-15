export default function Loading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-7 w-48 bg-white/10 rounded"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-24 bg-white/10 rounded"></div>
        <div className="h-24 bg-white/10 rounded"></div>
        <div className="h-24 bg-white/10 rounded"></div>
      </div>
      <div className="h-64 bg-white/10 rounded"></div>
    </div>
  );
}
