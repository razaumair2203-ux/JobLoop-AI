import { Skeleton } from "@/components/skeleton";

export default function DiscoverLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-full rounded-md" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg border border-surface-border bg-surface-0 p-5 space-y-3 animate-enter" style={{ animationDelay: `${i * 50}ms` }}>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
