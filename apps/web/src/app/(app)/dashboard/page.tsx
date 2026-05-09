import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import {
  Briefcase,
  MessageSquare,
  Trophy,
  FileText,
  Search,
  Upload,
  ArrowRight,
  Lightbulb,
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

      // Pattern detection (same logic as /api/applications)
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
          message: `Your applications show a pattern: ${count} JDs flagged "${gap}" as a gap. Want to address this in your Cloud?`,
        }));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">
        Welcome, {firstName}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Your voice, amplified. Let&apos;s find the right opportunity.
      </p>

      {/* Pattern Insights */}
      {patterns.length > 0 && (
        <div className="mt-6 space-y-2">
          {patterns.map((p) => (
            <div
              key={p.gap}
              className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
            >
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900">{p.message}</p>
                <Link
                  href="/cloud"
                  className="mt-1 text-xs font-medium text-amber-700 hover:text-amber-800"
                >
                  View your Cloud profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashCard
          label="Applications"
          value={String(total)}
          icon={Briefcase}
          accent="bg-blue-50 text-blue-600"
        />
        <DashCard
          label="Interviews"
          value={String(interviews)}
          icon={MessageSquare}
          accent="bg-amber-50 text-amber-600"
        />
        <DashCard
          label="Offers"
          value={String(offers)}
          icon={Trophy}
          accent="bg-green-50 text-green-600"
        />
        <DashCard
          label="CV Versions"
          value="0"
          icon={FileText}
          accent="bg-brand-50 text-brand-600"
        />
      </div>

      {/* Getting started */}
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-8">
        <h2 className="text-lg font-semibold text-zinc-900">Get started</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Two ways to begin your evidence-backed job search.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/cv"
            className="group flex items-start gap-4 rounded-lg border border-zinc-200 p-5 transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 group-hover:text-brand-700">
                Upload your CV
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                We'll build your Profile Cloud from your real experience.
              </p>
            </div>
            <ArrowRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-brand-500" />
          </Link>
          <Link
            href="/analyze"
            className="group flex items-start gap-4 rounded-lg border border-zinc-200 p-5 transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 group-hover:text-brand-700">
                Analyze a job description
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Paste a JD and see how your evidence matches up.
              </p>
            </div>
            <ArrowRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-brand-500" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function DashCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
