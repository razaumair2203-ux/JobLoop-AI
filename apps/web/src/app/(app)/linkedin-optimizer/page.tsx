"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  AlertTriangle,
  Eye,
  Sparkles,
} from "lucide-react";

type SectionScore = {
  section: string;
  status: "strong" | "needs_work" | "missing";
  suggestion: string;
};

const mockSections: SectionScore[] = [
  {
    section: "Headline",
    status: "needs_work",
    suggestion: "Your headline says 'Software Engineer'. Try 'Senior Frontend Engineer | React, Next.js, Design Systems | Building high-performance web apps' to include keywords recruiters search for.",
  },
  {
    section: "About / Summary",
    status: "strong",
    suggestion: "Your summary is well-written and aligns with your Profile Cloud. Consider adding a call-to-action like 'Open to opportunities in frontend platform roles.'",
  },
  {
    section: "Experience",
    status: "strong",
    suggestion: "Your experience section matches your CV evidence well. Ensure each role has 3-5 bullet points with quantified achievements.",
  },
  {
    section: "Skills & Endorsements",
    status: "needs_work",
    suggestion: "You have 12 skills listed but React and TypeScript aren't in your top 3. Pin your strongest skills — recruiters filter by top skills.",
  },
  {
    section: "Featured Section",
    status: "missing",
    suggestion: "Add a Featured section with links to your portfolio, a key project, or a blog post. This increases profile engagement by 2x.",
  },
  {
    section: "Recommendations",
    status: "needs_work",
    suggestion: "You have 2 recommendations. Aim for 3-5 from managers or senior peers. Consider reaching out to your lead at Scale Corp.",
  },
];

const statusConfig = {
  strong: { label: "Strong", icon: Check, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  needs_work: { label: "Needs work", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  missing: { label: "Missing", icon: AlertTriangle, color: "text-zinc-500", bg: "bg-zinc-50", border: "border-zinc-200" },
};

export default function LinkedInOptimizerPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const strong = mockSections.filter((s) => s.status === "strong").length;
  const total = mockSections.length;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-lg font-semibold text-zinc-900">LinkedIn Optimizer</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Align your LinkedIn profile with your Profile Cloud for maximum recruiter visibility
      </p>

      {/* Overall score */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">Profile alignment</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">
              {strong}/{total} sections optimized
            </p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-brand-200 bg-brand-50">
            <span className="text-lg font-bold text-brand-700">{Math.round((strong / total) * 100)}%</span>
          </div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${(strong / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Section breakdown */}
      <div className="mt-6 space-y-3">
        {mockSections.map((section) => {
          const config = statusConfig[section.status];
          const isExpanded = expanded === section.section;

          return (
            <button
              key={section.section}
              onClick={() => setExpanded(isExpanded ? null : section.section)}
              className={`w-full rounded-xl border text-left transition-all ${
                isExpanded ? `${config.border} ${config.bg}` : "border-zinc-200 bg-white hover:bg-zinc-50"
              } p-4`}
            >
              <div className="flex items-center gap-3">
                <config.icon className={`h-4 w-4 ${config.color}`} />
                <span className="flex-1 text-sm font-medium text-zinc-900">{section.section}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${config.bg} ${config.color}`}>
                  {config.label}
                </span>
                <ArrowRight className={`h-4 w-4 text-zinc-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              </div>
              {isExpanded && (
                <div className="mt-3 flex items-start gap-2 border-t border-zinc-100 pt-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                  <p className="text-sm leading-relaxed text-zinc-600">{section.suggestion}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Sync CTA */}
      <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-5">
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5 text-brand-500" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Preview your optimized profile</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              See how your profile looks to recruiters with the suggested changes applied
            </p>
          </div>
          <button className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700">
            Preview
          </button>
        </div>
      </div>
    </div>
  );
}
