"use client";

import { useState, useEffect, useCallback } from "react";
import { Upload, Cloud, Loader2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CloudVisualization } from "@/components/cloud";
import type { CloudData, CloudSkillNode, CloudTrajectoryRole } from "@/components/cloud/types";
import { inferDepthLevel } from "./depth-utils";

interface APIResponse {
  classified: unknown;
  identity?: {
    core_profession: string;
    specializations: string[];
    career_stage: string;
    qualification_country: string | null;
    qualification_degrees: string[];
    niche_differentiators: string[];
  };
  nodes?: Array<{
    id: string;
    name: string;
    category: string;
    tier?: string;
    evidence: Array<Record<string, unknown>>;
    summary: {
      total_months_used: number;
      number_of_roles: number;
      has_impact: boolean;
      has_external_validation: boolean;
      has_depth: boolean;
      has_project: boolean;
      last_used: string | null;
    };
  }>;
  trajectory?: {
    roles: Array<{
      company: string;
      title: string;
      start_date: string;
      end_date: string;
      duration_months: number;
      domain: string;
      seniority_level: number;
      isTraining: boolean;
    }>;
    total_experience_years: number;
  };
  stats?: {
    years: number;
    roles: number;
    skills: number;
    evidencePoints: number;
    domains: number;
    certCount: number;
  };
}

export default function CloudPage() {
  const [data, setData] = useState<CloudData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCloud = useCallback(() => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    Promise.all([
      fetch("/api/cloud").then(r => {
        if (r.status === 401) throw new Error("AUTH_REDIRECT");
        if (!r.ok) throw new Error(`Cloud API error (${r.status})`);
        return r.json();
      }) as Promise<APIResponse>,
      supabase.auth.getUser().then(({ data }) => data.user),
    ])
      .then(([cloudRes, user]) => {
        const name = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "";

        if (!cloudRes.identity || !cloudRes.nodes || !cloudRes.trajectory || !cloudRes.stats) {
          setData(null);
          setLoading(false);
          return;
        }

        const nodes: CloudSkillNode[] = cloudRes.nodes.map(n => ({
          id: n.id,
          name: n.name,
          tier: (n.tier as CloudSkillNode["tier"]) ?? "core_skill",
          category: n.category,
          domain: n.category,
          evidence: n.evidence as CloudSkillNode["evidence"],
          summary: n.summary,
          depth: inferDepthLevel(n.summary),
        }));

        const roles: CloudTrajectoryRole[] = cloudRes.trajectory.roles.map(r => ({
          company: r.company,
          title: r.title,
          start_date: r.start_date,
          end_date: r.end_date,
          duration_months: r.duration_months,
          domain: r.domain,
          seniority_level: r.seniority_level,
          isTraining: r.isTraining,
        }));

        setData({
          identity: {
            name,
            core_profession: cloudRes.identity.core_profession,
            specializations: cloudRes.identity.specializations,
            career_stage: cloudRes.identity.career_stage,
            qualification_country: cloudRes.identity.qualification_country,
            qualification_degrees: cloudRes.identity.qualification_degrees,
            niche_differentiators: cloudRes.identity.niche_differentiators,
          },
          nodes,
          trajectory: { roles },
          stats: cloudRes.stats,
        });
        setLoading(false);
      })
      .catch(err => {
        if (err.message === "AUTH_REDIRECT") {
          window.location.href = "/login";
          return;
        }
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => { loadCloud(); }, [loadCloud]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={loadCloud} />;
  if (!data) return <EmptyState />;

  return <CloudVisualization data={data} animate={false} />;
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Loader2 className="h-6 w-6 text-surface-text-muted animate-spin" />
      <p className="text-sm text-surface-text-muted">Loading your Profile Cloud...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Cloud className="h-10 w-10 text-surface-text-muted" />
      <p className="text-sm font-medium text-surface-text-secondary">Failed to load Cloud</p>
      <p className="text-xs text-surface-text-muted">{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-4 py-2 text-xs font-medium text-surface-text-secondary hover:bg-surface-3 transition-colors press focus-ring"
      >
        Try again
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-surface-border bg-surface-0 px-6 py-16 text-center animate-enter">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-700/10">
        <Upload className="h-5 w-5 text-brand-500" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-surface-text">No Profile Cloud yet</h3>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-surface-text-muted">
        Upload your CV to build your evidence-backed skill profile.
      </p>
      <Link
        href="/onboarding"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-xs font-medium text-white transition-all duration-150 hover:bg-brand-700 press focus-ring"
      >
        Get started
      </Link>
    </div>
  );
}
