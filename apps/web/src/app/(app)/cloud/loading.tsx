import { Skeleton } from "@/components/skeleton";

export default function CloudLoading() {
  return (
    <div className="space-y-6">
      {/* Identity card skeleton */}
      <div className="rounded-2xl bg-surface-3 p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
      </div>
      {/* Tab bar */}
      <div className="flex gap-6 border-b border-surface-border pb-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Skill rows */}
      <div className="space-y-1">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 animate-enter" style={{ animationDelay: `${i * 40}ms` }}>
            <Skeleton className="h-4 w-[140px] shrink-0" />
            <Skeleton className="h-3 flex-1 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
