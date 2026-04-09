export default function LoadingPlayer() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse">
      <div className="h-8 w-48 rounded bg-gray-200 mb-4" />
      <div className="flex items-center gap-4 mb-6">
        <div className="h-16 w-16 rounded-full bg-gray-200" />
        <div className="space-y-2">
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-28 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="h-40 w-full rounded-2xl bg-gray-100" />
    </div>
  );
}
