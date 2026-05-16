import { Skeleton } from "@/components/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-6 w-44" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-surface-border bg-surface-0 p-4 animate-enter"
            style={{ animationDelay: `${i * 75}ms` }}
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3.5 w-3.5 rounded" />
            </div>
            <Skeleton className="mt-3 h-7 w-14" />
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-lg border border-surface-border bg-surface-0 p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-1.5 h-3 w-56" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-surface-border p-4"
            >
              <Skeleton className="h-8 w-8 rounded-md shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1.5 h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
