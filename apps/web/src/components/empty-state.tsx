import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-surface-border bg-surface-0 px-6 py-16 text-center animate-enter">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-700/10">
        <Icon className="h-5 w-5 text-brand-500" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-surface-text">{title}</h3>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-surface-text-muted">
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-xs font-medium text-white transition-all duration-150 hover:bg-brand-700 press focus-ring"
        >
          {action.label}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
