"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Upload,
  Link as LinkIcon,
  Loader2,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Code,
  FolderOpen,
  GraduationCap,
  MessageCircle,
  FileText,
  Bookmark,
  Sparkles,
  Shield,
} from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import * as Tooltip from "@radix-ui/react-tooltip";

// --- Types ---
interface Requirement {
  id: string;
  name: string;
  strength: "strong" | "related" | "gap";
  evidence: string | null;
  citations: number[];
  bridge: string | null;
}

// Citation source labels for hover tooltips
const citationSources: Record<number, { source: string; snippet: string }> = {
  1: { source: "Work Experience — Scale Corp", snippet: "Senior Frontend Engineer, 2022–Present. Led Next.js migration, built design system." },
  2: { source: "Work Experience — DataFlow Inc", snippet: "Frontend Engineer, 2019–2021. Real-time dashboards, testing infrastructure." },
  3: { source: "Skills — Cloud Evidence", snippet: "TypeScript (strict), Docker, GitHub Actions, Vitest, Playwright." },
  4: { source: "Education — UC Berkeley", snippet: "B.S. Computer Science, 2019. HackBerkeley Winner." },
};

interface AnalysisResult {
  application_id: string;
  company: string;
  role: string;
  position: { label: string; basis: string };
  sources: Array<{ name: string; icon: string; count: number }>;
  requirements: Requirement[];
  strategy: string;
  socratic: { question: string; skill_targeted: string };
}

// --- Helpers ---
const strengthConfig = {
  strong: {
    label: "Strong match",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  related: {
    label: "Related experience",
    dot: "bg-sky-500",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
  },
  gap: {
    label: "Gap to address",
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
};

const positionConfig: Record<string, { bg: string; text: string }> = {
  "Strong position": { bg: "bg-emerald-50", text: "text-emerald-700" },
  Competitive: { bg: "bg-sky-50", text: "text-sky-700" },
  Stretch: { bg: "bg-amber-50", text: "text-amber-700" },
  "Major gaps": { bg: "bg-zinc-100", text: "text-zinc-600" },
};

const sourceIcons: Record<string, React.ComponentType<{ className?: string }>> =
  {
    briefcase: Briefcase,
    code: Code,
    folder: FolderOpen,
    "graduation-cap": GraduationCap,
  };

export default function AnalyzePage() {
  const [phase, setPhase] = useState<"input" | "loading" | "results">("input");
  const [jdText, setJdText] = useState("");
  const [url, setUrl] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [socraticAnswer, setSocraticAnswer] = useState("");

  async function handleAnalyze() {
    if (jdText.length < 50) {
      setError("Please paste at least 50 characters of the job description.");
      return;
    }
    setError(null);
    setPhase("loading");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: jdText, url, company, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await res.json();
      setAnalysis(data);
      setPhase("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("input");
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-zinc-900">
              Analyzing job description...
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Matching against your Profile Cloud evidence
            </p>
          </div>
          {/* Skeleton cards */}
          <div className="mt-8 w-full max-w-2xl space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-zinc-200 bg-white p-5"
              >
                <div className="h-4 w-1/3 rounded bg-zinc-200" />
                <div className="mt-3 h-3 w-2/3 rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "results" && analysis) {
    return <AnalysisResults analysis={analysis} onBack={() => setPhase("input")} socraticAnswer={socraticAnswer} onSocraticChange={setSocraticAnswer} />;
  }

  // --- Input Phase ---
  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-zinc-900">
          Analyze a Job Description
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Paste a JD and see how your evidence matches up — no scores, just
          clarity.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {/* Main textarea */}
        <div>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={10}
            placeholder="Paste the full job description here..."
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-1 text-xs text-zinc-400">
            {jdText.length} characters{" "}
            {jdText.length > 0 && jdText.length < 50 && "— need at least 50"}
          </p>
        </div>

        {/* URL input */}
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5">
          <LinkIcon className="h-4 w-4 shrink-0 text-zinc-400" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Or paste job posting URL (optional)"
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          />
        </div>

        {/* Company + Role */}
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name (optional)"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role title (optional)"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* PDF upload hint */}
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-500">
          <Upload className="h-4 w-4" />
          <span>PDF upload coming soon — paste text for now</span>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={jdText.length < 50}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Search className="h-5 w-5" />
          Analyze
        </button>
      </div>
    </div>
  );
}

// --- Analysis Results Component ---
function AnalysisResults({
  analysis,
  onBack,
  socraticAnswer,
  onSocraticChange,
}: {
  analysis: AnalysisResult;
  onBack: () => void;
  socraticAnswer: string;
  onSocraticChange: (v: string) => void;
}) {
  const pos = positionConfig[analysis.position.label] || positionConfig["Competitive"];
  const strongCount = analysis.requirements.filter((r) => r.strength === "strong").length;
  const relatedCount = analysis.requirements.filter((r) => r.strength === "related").length;
  const gapCount = analysis.requirements.filter((r) => r.strength === "gap").length;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        New analysis
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {analysis.role}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{analysis.company}</p>
        </div>
        <span className={`rounded-full px-4 py-1.5 text-sm font-medium ${pos.bg} ${pos.text}`}>
          {analysis.position.label}
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-500">{analysis.position.basis}</p>

      {/* Evidence strength summary bar */}
      <div className="mt-4 flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="font-medium text-zinc-700">{strongCount} Strong</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
          <span className="font-medium text-zinc-700">{relatedCount} Related</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="font-medium text-zinc-700">{gapCount} Gap</span>
        </span>
      </div>

      {/* Evidence Sources */}
      <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
        {analysis.sources.map((src) => {
          const Icon = sourceIcons[src.icon] || Briefcase;
          return (
            <div
              key={src.name}
              className="flex shrink-0 items-center gap-2.5 rounded-lg border border-zinc-200 bg-white px-4 py-2.5"
            >
              <Icon className="h-4 w-4 text-brand-500" />
              <div>
                <p className="text-sm font-medium text-zinc-700">{src.name}</p>
                <p className="text-xs text-zinc-400">
                  {src.count} evidence points
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Requirement Breakdown */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900">
          Requirement Breakdown
        </h2>
        <div className="mt-4 space-y-2">
          {analysis.requirements.map((req) => (
            <RequirementRow key={req.id} requirement={req} />
          ))}
        </div>
      </div>

      {/* Keyword Frequency Matching */}
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-900">Keyword Frequency</h2>
          </div>
          <span className="text-xs text-zinc-400">JD mentions vs. your CV</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Keywords mentioned multiple times in the JD signal high importance. Ensure your CV mentions them at least once.
        </p>
        <div className="mt-4 space-y-2">
          {[
            { keyword: "React", jdCount: 5, cvCount: 3, status: "good" as const },
            { keyword: "TypeScript", jdCount: 4, cvCount: 2, status: "good" as const },
            { keyword: "Next.js", jdCount: 3, cvCount: 2, status: "good" as const },
            { keyword: "CI/CD", jdCount: 3, cvCount: 1, status: "low" as const },
            { keyword: "Kubernetes", jdCount: 2, cvCount: 0, status: "missing" as const },
            { keyword: "Design System", jdCount: 2, cvCount: 2, status: "good" as const },
            { keyword: "GraphQL", jdCount: 2, cvCount: 0, status: "missing" as const },
            { keyword: "Performance", jdCount: 3, cvCount: 2, status: "good" as const },
          ].map((kw) => (
            <div key={kw.keyword} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm font-medium text-zinc-700">{kw.keyword}</span>
              <div className="flex flex-1 items-center gap-2">
                <div className="flex-1">
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.max(kw.jdCount, kw.cvCount) }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-4 w-4 rounded-sm ${
                          i < kw.cvCount
                            ? kw.status === "good"
                              ? "bg-emerald-400"
                              : "bg-amber-400"
                            : i < kw.jdCount
                              ? "border border-dashed border-zinc-300 bg-zinc-50"
                              : "bg-zinc-100"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <span className="w-16 shrink-0 text-right text-xs text-zinc-500">
                  {kw.cvCount}/{kw.jdCount}
                </span>
                <span
                  className={`w-16 shrink-0 text-right text-xs font-medium ${
                    kw.status === "good"
                      ? "text-emerald-600"
                      : kw.status === "low"
                        ? "text-amber-600"
                        : "text-zinc-400"
                  }`}
                >
                  {kw.status === "good" ? "Covered" : kw.status === "low" ? "Low" : "Missing"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ATS Detection */}
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-900">ATS Detection</h2>
          </div>
          <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-600">
            Greenhouse
          </span>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          We detected this company likely uses <strong>Greenhouse</strong> for hiring. Here&apos;s what that means for your application:
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Format tip</p>
            <p className="mt-1 text-xs text-zinc-600">
              Greenhouse parses single-column PDFs well. Avoid tables, columns, or graphics.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Application portal</p>
            <p className="mt-1 text-xs text-zinc-600">
              Expect structured fields for work history. Your CV will be parsed into sections automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Application Strategy */}
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-semibold text-zinc-900">
            Application Strategy
          </h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          {analysis.strategy}
        </p>
      </div>

      {/* Socratic Card */}
      <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-6">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-brand-500" />
          <h3 className="font-semibold text-zinc-900">Tell me more</h3>
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-600">
            {analysis.socratic.skill_targeted}
          </span>
        </div>
        <p className="mt-3 text-sm text-zinc-700">
          {analysis.socratic.question}
        </p>
        <textarea
          value={socraticAnswer}
          onChange={(e) => onSocraticChange(e.target.value)}
          rows={3}
          placeholder="Your answer helps us build stronger evidence..."
          className="mt-3 w-full rounded-lg border border-brand-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-3">
        <Link
          href="/cv"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 font-medium text-white transition-colors hover:bg-brand-700"
        >
          <FileText className="h-5 w-5" />
          Generate tailored CV
        </Link>
        <button className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-6 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
          <Bookmark className="h-5 w-5" />
          Save to tracker
        </button>
      </div>
    </div>
  );
}

// --- Collapsible Requirement Row ---
function RequirementRow({ requirement }: { requirement: Requirement }) {
  const [open, setOpen] = useState(false);
  const config = strengthConfig[requirement.strength];

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-4 text-left transition-colors hover:bg-zinc-50">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${config.dot}`} />
        <span className="flex-1 text-sm font-medium text-zinc-900">
          {requirement.name}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
          {config.label}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        )}
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
        <div className="px-5 pb-4 pt-2">
          {requirement.evidence && (
            <Tooltip.Provider delayDuration={200}>
              <p className="text-sm leading-relaxed text-zinc-600">
                {requirement.evidence}
                {requirement.citations.map((c) => {
                  const src = citationSources[c];
                  return (
                    <Tooltip.Root key={c}>
                      <Tooltip.Trigger asChild>
                        <span className="ml-1 inline-flex h-5 w-5 cursor-help items-center justify-center rounded bg-brand-100 text-xs font-medium text-brand-600 hover:bg-brand-200 transition-colors">
                          {c}
                        </span>
                      </Tooltip.Trigger>
                      {src && (
                        <Tooltip.Portal>
                          <Tooltip.Content
                            side="top"
                            sideOffset={4}
                            className="z-50 max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg"
                          >
                            <p className="text-xs font-semibold text-zinc-800">{src.source}</p>
                            <p className="mt-0.5 text-xs text-zinc-500">{src.snippet}</p>
                            <Tooltip.Arrow className="fill-white" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      )}
                    </Tooltip.Root>
                  );
                })}
              </p>
            </Tooltip.Provider>
          )}
          {requirement.bridge && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-medium text-amber-700">
                Bridge strategy
              </p>
              <p className="mt-1 text-sm text-amber-800">
                {requirement.bridge}
              </p>
            </div>
          )}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
