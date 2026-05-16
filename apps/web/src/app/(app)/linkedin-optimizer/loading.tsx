import { Skeleton } from "@/components/skeleton";

export default function LinkedInOptimizerLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-6 w-44" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="rounded-lg border border-surface-border bg-surface-0 p-5 space-y-4">
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-5 w-5 rounded shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-1 h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
