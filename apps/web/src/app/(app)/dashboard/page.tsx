import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Briefcase,
  MessageSquare,
  Trophy,
  FileText,
  Search,
  Upload,
  ArrowRight,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">
        Welcome, {firstName}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Your voice, amplified. Let's find the right opportunity.
      </p>

      {/* Stat cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashCard
          label="Applications"
          value="0"
          icon={Briefcase}
          accent="bg-blue-50 text-blue-600"
        />
        <DashCard
          label="Interviews"
          value="0"
          icon={MessageSquare}
          accent="bg-amber-50 text-amber-600"
        />
        <DashCard
          label="Offers"
          value="0"
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
