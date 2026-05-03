"use client";

import { useEffect, useState } from "react";
import { Cloud, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { UploadResult } from "../page";

interface StepCloudProps {
  uploadResults: UploadResult[];
  onNext: () => void;
}

interface CloudNodeSummary {
  name: string;
  type: string;
  category: string;
  evidence_count: number;
}

export function StepCloud({ uploadResults, onNext }: StepCloudProps) {
  const [nodes, setNodes] = useState<CloudNodeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const skipped = uploadResults.length === 0;

  useEffect(() => {
    if (skipped) {
      setLoading(false);
      return;
    }

    async function loadCloud() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("cloud_nodes")
        .select("name, type, category, evidence")
        .eq("user_id", user.id);

      if (data) {
        setNodes(
          data.map((n) => ({
            name: n.name,
            type: n.type,
            category: n.category,
            evidence_count: Array.isArray(n.evidence) ? n.evidence.length : 0,
          })),
        );
      }
      setLoading(false);
    }

    // Small delay so the animation feels intentional
    const timer = setTimeout(loadCloud, 800);
    return () => clearTimeout(timer);
  }, [skipped]);

  // Upload summary
  const successful = uploadResults.filter((r) => r.status === "parsed");
  const failed = uploadResults.filter((r) => r.error);
  const totalSkills = successful.reduce(
    (sum, r) => sum + (r.skills_found ?? 0),
    0,
  );

  if (skipped) {
    return (
      <div className="text-center">
        <Cloud className="mx-auto h-12 w-12 text-zinc-300" />
        <h2 className="mt-4 text-xl font-semibold text-zinc-900">
          No CVs uploaded yet
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Your Profile Cloud is empty. You can upload CVs later from the
          dashboard to build your evidence base.
        </p>
        <button
          onClick={onNext}
          className="mt-6 h-10 w-full rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900">
        Your Profile Cloud
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        {loading
          ? "Building your cloud from uploaded CVs..."
          : `Built from ${successful.length} CV${successful.length !== 1 ? "s" : ""}. Each skill is backed by evidence from your real experience.`}
      </p>

      {/* Upload results summary */}
      {!loading && (successful.length > 0 || failed.length > 0) && (
        <div className="mt-4 space-y-2">
          {successful.map((r) => (
            <div
              key={r.filename}
              className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm"
            >
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-green-800">
                {r.filename} &mdash; {r.skills_found} skills,{" "}
                {r.experience_count} roles
              </span>
            </div>
          ))}
          {failed.map((r) => (
            <div
              key={r.filename}
              className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm"
            >
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-800">
                {r.filename} &mdash; {r.error}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Skill cloud visualization */}
      {loading ? (
        <div className="mt-8 flex items-center justify-center gap-2 py-12 text-sm text-zinc-400">
          <Cloud className="h-5 w-5 animate-pulse" />
          Analyzing your experience...
        </div>
      ) : nodes.length > 0 ? (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {nodes.map((node) => (
            <div
              key={node.name}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                node.evidence_count >= 2
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600"
              }`}
            >
              {node.name}
              {node.evidence_count >= 2 && (
                <span className="ml-1.5 text-xs text-brand-400">
                  {node.evidence_count}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 text-center text-sm text-zinc-400">
          No skills extracted yet.
        </div>
      )}

      {!loading && (
        <div className="mt-8 text-center">
          {nodes.length > 0 && (
            <p className="mb-4 text-sm font-medium text-green-600">
              {nodes.length} skills identified
              {totalSkills > 0 && ` across ${successful.length} CV${successful.length > 1 ? "s" : ""}`}
            </p>
          )}
          <button
            onClick={onNext}
            className="h-10 w-full rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
