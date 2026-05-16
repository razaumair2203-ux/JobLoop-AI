import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import {
  Briefcase,
  MessageSquare,
  Trophy,
  Search,
  Upload,
  ArrowRight,
  Lightbulb,
  TrendingUp,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { user } = await getAuthUser(supabase);

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

  // Fetch real stats
  let total = 0;
  let interviews = 0;
  let offers = 0;
  let patterns: Array<{ gap: string; count: number; message: string }> = [];

  if (user) {
    const { data: apps } = await supabase
      .from("applications")
      .select("id, outcome, match_analysis")
      .eq("user_id", user.id);

    if (apps) {
      total = apps.length;
      interviews = apps.filter((a) => a.outcome === "interview" || a.outcome === "callback").length;
      offers = apps.filter((a) => a.outcome === "offer").length;

      // Pattern detection
      const gapCounts: Record<string, number> = {};
      for (const app of apps) {
        const gaps = (app.match_analysis as { gaps?: string[] })?.gaps ?? [];
        for (const gap of gaps) {
          const key = gap.toLowerCase();
          gapCounts[key] = (gapCounts[key] || 0) + 1;
        }
      }
      patterns = Object.entries(gapCounts)
        .filter(([, count]) => count >= 2)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([gap, count]) => ({
          gap,
          count,
          message: `${count} JDs flagged "${gap}" as a gap. Consider addressing this in your Cloud.`,
        }));
    }
  }

  const conversionRate = total > 0 ? Math.round((interviews / total) * 100) : 0;

  const stats = [
    { label: "Applications", value: total, icon: Briefcase },
    { label: "Interviews", value: interviews, icon: MessageSquare },
    { label: "Offers", value: offers, icon: Trophy },
    { label: "Conversion", value: conversionRate, suffix: "%", icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-enter">
        <h1 className="text-xl font-semibold text-surface-text tracking-tight">
          Welcome, {firstName}
        </h1>
        <p className="mt-0.5 text-sm text-surface-text-muted">
          Your voice, amplified. Let&apos;s find the right opportunity.
        </p>
      </div>

      {/* Stat cards — staggered entrance + hover lift */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="group rounded-lg border border-surface-border bg-surface-0 p-4 transition-all duration-150 hover:-translate-y-px hover:shadow-sm hover:border-surface-text-muted/20 animate-enter"
            style={{ animationDelay: `${(i + 1) * 75}ms` }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-surface-text-muted">{stat.label}</p>
              <stat.icon className="h-3.5 w-3.5 text-surface-text-muted transition-colors group-hover:text-surface-text-secondary" />
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-surface-text">
              {stat.value}
              {stat.suffix && <span className="text-base font-medium text-surface-text-secondary">{stat.suffix}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Pattern Insights */}
      {patterns.length > 0 && (
        <div className="space-y-2 animate-enter" style={{ animationDelay: "400ms" }}>
          <h2 className="text-xs font-medium uppercase tracking-wider text-surface-text-muted">
            Patterns
          </h2>
          {patterns.map((p, i) => (
            <div
              key={p.gap}
              className="flex items-start gap-3 rounded-lg border border-surface-border bg-surface-0 p-3 transition-colors hover:bg-surface-2/50 animate-enter"
              style={{ animationDelay: `${450 + i * 75}ms` }}
            >
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-surface-text">{p.message}</p>
                <Link
                  href="/cloud"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-surface-text-secondary hover:text-surface-text transition-colors"
                >
                  View Cloud
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state — guides user when fresh */}
      {total === 0 && (
        <div
          className="rounded-lg border border-dashed border-surface-border bg-surface-0 p-8 text-center animate-enter"
          style={{ animationDelay: "400ms" }}
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-700/10">
            <Briefcase className="h-5 w-5 text-brand-500" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-surface-text">No applications yet</h3>
          <p className="mt-1 text-xs text-surface-text-muted max-w-xs mx-auto">
            Upload your CV to build your Profile Cloud, then analyze job descriptions to start tracking.
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div
        className="rounded-lg border border-surface-border bg-surface-0 p-5 animate-enter"
        style={{ animationDelay: "500ms" }}
      >
        <h2 className="text-sm font-medium text-surface-text">Get started</h2>
        <p className="mt-0.5 text-xs text-surface-text-muted">
          Two ways to begin your evidence-backed job search.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/cv"
            className="group flex items-start gap-3 rounded-lg border border-surface-border p-4 transition-all duration-150 hover:bg-surface-2 hover:-translate-y-px hover:shadow-sm press focus-ring animate-enter"
            style={{ animationDelay: "575ms" }}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-500 transition-colors group-hover:bg-brand-100 dark:bg-brand-700/10 dark:group-hover:bg-brand-700/20">
              <Upload className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-text">Upload your CV</p>
              <p className="mt-0.5 text-xs text-surface-text-muted">
                We&apos;ll build your Profile Cloud from your real experience.
              </p>
            </div>
            <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-surface-text-muted opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/analyze"
            className="group flex items-start gap-3 rounded-lg border border-surface-border p-4 transition-all duration-150 hover:bg-surface-2 hover:-translate-y-px hover:shadow-sm press focus-ring animate-enter"
            style={{ animationDelay: "650ms" }}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-500 transition-colors group-hover:bg-brand-100 dark:bg-brand-700/10 dark:group-hover:bg-brand-700/20">
              <Search className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-text">Analyze a job description</p>
              <p className="mt-0.5 text-xs text-surface-text-muted">
                Paste a JD and see how your evidence matches up.
              </p>
            </div>
            <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-surface-text-muted opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
