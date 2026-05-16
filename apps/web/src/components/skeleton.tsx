/**
 * Shimmer skeleton — premium loading placeholder.
 * Uses CSS shimmer animation (globals.css) instead of generic pulse.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer ${className}`} />;
}
