export default function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
      {/* Header with health dot and name */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2 flex-1">
          <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full" />
          <div className="h-5 bg-slate-300 dark:bg-slate-600 rounded w-3/4" />
        </div>
        <div className="w-4 h-4 bg-slate-300 dark:bg-slate-600 rounded" />
      </div>

      {/* Description skeleton */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-full" />
        <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-2/3" />
      </div>

      {/* Footer */}
      <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-1/3" />
    </div>
  );
}