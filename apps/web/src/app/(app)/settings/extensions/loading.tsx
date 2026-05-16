import { Skeleton } from "@/components/skeleton";

export default function ExtensionsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <div className="rounded-lg border border-surface-border bg-surface-0 divide-y divide-surface-border">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-md" />
              <div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
