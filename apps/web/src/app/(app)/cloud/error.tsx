"use client";

import { Cloud } from "lucide-react";

export default function CloudError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Cloud className="h-10 w-10 text-surface-text-muted" />
      <p className="text-sm font-medium text-surface-text-secondary">
        Something went wrong
      </p>
      <p className="text-xs text-surface-text-muted max-w-sm text-center">
        {error.message || "An unexpected error occurred loading your Profile Cloud."}
      </p>
      <button
        onClick={reset}
        className="mt-2 inline-flex items-center rounded-md bg-surface-2 px-4 py-2 text-xs font-medium text-surface-text-secondary hover:bg-surface-3 transition-colors press focus-ring"
      >
        Try again
      </button>
    </div>
  );
}
