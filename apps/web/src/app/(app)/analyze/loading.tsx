import { Skeleton } from "@/components/skeleton";

export default function AnalyzeLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="rounded-lg border border-surface-border bg-surface-0 p-5 space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="flex justify-end">
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}
