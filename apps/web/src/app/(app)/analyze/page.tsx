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
  CheckCircle2,
  AlertTriangle,
  Award,
  Shield,
  Lightbulb,
  Target,
} from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import * as Tooltip from "@radix-ui/react-tooltip";

// --- Types ---
interface EvidenceSource {
  type: string;
  label: string;
  detail: string | null;
}

interface Requirement {
  id: string;
  name: string;
  strength: "strong" | "related" | "gap";
  evidence: string | null;
  evidence_sources: EvidenceSource[];
  bridge: string | null;
}

interface SocraticQuestion {
  id: string;
  question: string;
  skill_targeted: string;
  skill_name?: string;
}

interface AnalysisResult {
  application_id: string;
  company: string;
  role: string;
  position: { label: string; basis: string };
  sources: Array<{ name: string; icon: string; count: number }>;
  requirements: Requirement[];
  strategy: string;
  lead_with: string[];
  biggest_risk: string;
  insights: string[];
  socratic_questions: SocraticQuestion[];
  same_company_history?: Array<{
    id: string;
    role: string;
    outcome: string | null;
    notes: string | null;
    applied_date: string | null;
  }> | null;
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
  "Major gaps": { bg: "bg-surface-2", text: "text-surface-text-secondary" },
};

const sourceIcons: Record<string, React.ComponentType<{ className?: string }>> =
  {
    briefcase: Briefcase,
    code: Code,
    folder: FolderOpen,
    "graduation-cap": GraduationCap,
    award: Award,
  };

const evidenceTypeIcons: Record<string, { icon: string; color: string }> = {
  role: { icon: "briefcase", color: "text-blue-600 bg-blue-50 border-blue-200" },
  certification: { icon: "shield", color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  impact: { icon: "target", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  award: { icon: "award", color: "text-amber-600 bg-amber-50 border-amber-200" },
  project: { icon: "folder", color: "text-violet-600 bg-violet-50 border-violet-200" },
  socratic: { icon: "message", color: "text-brand-600 bg-brand-50 border-brand-200" },
};

export default function AnalyzePage() {
  const [phase, setPhase] = useState<"input" | "loading" | "results">("input");
  const [jdText, setJdText] = useState("");
  const [url, setUrl] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
            <p className="text-lg font-semibold text-surface-text">
              Analyzing job description...
            </p>
            <p className="mt-1 text-sm text-surface-text-muted">
              Matching against your Profile Cloud evidence
            </p>
          </div>
          {/* Skeleton cards */}
          <div className="mt-8 w-full max-w-2xl space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-surface-border bg-surface-0 p-5 animate-enter"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="h-4 w-1/3 shimmer" />
                <div className="mt-3 h-3 w-2/3 shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "results" && analysis) {
    return <AnalysisResults analysis={analysis} onBack={() => setPhase("input")} />;
  }

  // --- Input Phase ---
  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-surface-text">
          Analyze a Job Description
        </h1>
        <p className="mt-1 text-sm text-surface-text-muted">
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
            className="w-full rounded-lg border border-surface-border bg-surface-0 px-4 py-3 text-sm text-surface-text placeholder:text-surface-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-1 text-xs text-surface-text-muted">
            {jdText.length} characters{" "}
            {jdText.length > 0 && jdText.length < 50 && "— need at least 50"}
          </p>
        </div>

        {/* URL input */}
        <div className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface-2 px-4 py-2.5">
          <LinkIcon className="h-4 w-4 shrink-0 text-surface-text-muted" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Or paste job posting URL (optional)"
            className="flex-1 bg-transparent text-sm text-surface-text placeholder:text-surface-text-muted focus:outline-none"
          />
        </div>

        {/* Company + Role */}
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name (optional)"
            className="rounded-lg border border-surface-border bg-surface-0 px-4 py-2.5 text-sm text-surface-text placeholder:text-surface-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role title (optional)"
            className="rounded-lg border border-surface-border bg-surface-0 px-4 py-2.5 text-sm text-surface-text placeholder:text-surface-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* PDF upload hint */}
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-surface-border px-4 py-3 text-sm text-surface-text-muted">
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
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
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
}: {
  analysis: AnalysisResult;
  onBack: () => void;
}) {
  const [socraticAnswers, setSocraticAnswers] = useState<Record<string, string>>({});
  const [socraticSubmitting, setSocraticSubmitting] = useState<string | null>(null);
  const [socraticResults, setSocraticResults] = useState<Record<string, { node_updated: string; is_new_skill: boolean }>>({});
  const [saved, setSaved] = useState(false);

  const pos = positionConfig[analysis.position.label] || positionConfig["Competitive"];
  const strongCount = analysis.requirements.filter((r) => r.strength === "strong").length;
  const relatedCount = analysis.requirements.filter((r) => r.strength === "related").length;
  const gapCount = analysis.requirements.filter((r) => r.strength === "gap").length;

  // Socratic questions from engine (persisted with DB-generated UUIDs)
  const allQuestions: SocraticQuestion[] = analysis.socratic_questions ?? [];

  async function submitSocraticAnswer(q: SocraticQuestion) {
    const answer = (socraticAnswers[q.skill_targeted] ?? "").trim();
    if (answer.length < 5) return;

    setSocraticSubmitting(q.skill_targeted);
    try {
      const res = await fetch("/api/socratic/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: q.id,
          skill_name: q.skill_name || q.skill_targeted,
          answer,
          question_text: q.question,
          application_id: analysis.application_id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Map API response shape { results: [{skill, status, is_new}] } to UI state
        const firstResult = data.results?.[0];
        setSocraticResults(prev => ({
          ...prev,
          [q.skill_targeted]: {
            node_updated: firstResult?.skill ?? q.skill_targeted,
            is_new_skill: firstResult?.is_new ?? false,
          },
        }));
      }
    } catch { /* non-critical */ }
    setSocraticSubmitting(null);
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm text-surface-text-muted transition-colors hover:text-surface-text"
      >
        <ArrowLeft className="h-4 w-4" />
        New analysis
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-text">
            {analysis.role}
          </h1>
          <p className="mt-1 text-sm text-surface-text-muted">{analysis.company}</p>
        </div>
        <span className={`rounded-full px-4 py-1.5 text-sm font-medium ${pos.bg} ${pos.text}`}>
          {analysis.position.label}
        </span>
      </div>
      <p className="mt-2 text-sm text-surface-text-muted">{analysis.position.basis}</p>

      {/* Evidence strength summary bar */}
      <div className="mt-4 flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="font-medium text-surface-text-secondary">{strongCount} Strong</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
          <span className="font-medium text-surface-text-secondary">{relatedCount} Related</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="font-medium text-surface-text-secondary">{gapCount} Gap</span>
        </span>
      </div>

      {/* Evidence Sources */}
      <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
        {analysis.sources.map((src) => {
          const Icon = sourceIcons[src.icon] || Briefcase;
          return (
            <div
              key={src.name}
              className="flex shrink-0 items-center gap-2.5 rounded-lg border border-surface-border bg-surface-0 px-4 py-2.5"
            >
              <Icon className="h-4 w-4 text-brand-500" />
              <div>
                <p className="text-sm font-medium text-surface-text-secondary">{src.name}</p>
                <p className="text-xs text-surface-text-muted">
                  {src.count} evidence points
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lead With + Biggest Risk */}
      {(analysis.lead_with?.length > 0 || analysis.biggest_risk) && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {analysis.lead_with?.length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-emerald-800">Lead with</h3>
              </div>
              <ul className="mt-2 space-y-1">
                {analysis.lead_with.map((item, i) => (
                  <li key={i} className="text-sm text-emerald-700">{item}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.biggest_risk && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-800">Biggest risk</h3>
              </div>
              <p className="mt-2 text-sm text-amber-700">{analysis.biggest_risk}</p>
            </div>
          )}
        </div>
      )}

      {/* Requirement Breakdown */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-surface-text">
          Requirement Breakdown
        </h2>
        <div className="mt-4 space-y-2">
          {analysis.requirements.map((req) => (
            <RequirementRow key={req.id} requirement={req} />
          ))}
        </div>
      </div>

      {/* Application Strategy */}
      <div className="mt-8 rounded-lg border border-surface-border bg-surface-0 p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-semibold text-surface-text">
            Application Strategy
          </h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-surface-text-secondary">
          {analysis.strategy}
        </p>
        {analysis.insights?.length > 0 && (
          <div className="mt-4 space-y-2">
            {analysis.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <p className="text-sm text-surface-text-secondary">{insight}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Socratic Cards */}
      {allQuestions.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-surface-text-secondary">
            <MessageCircle className="h-4 w-4 text-brand-500" />
            Strengthen your position
          </h3>
          {allQuestions.map((q) => {
            const submitted = !!socraticResults[q.skill_targeted];
            const submitting = socraticSubmitting === q.skill_targeted;
            return (
              <div key={q.skill_targeted} className="rounded-lg border border-brand-200 bg-brand-50 p-5">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                    {q.skill_targeted}
                  </span>
                </div>
                <p className="mt-2 text-sm text-surface-text-secondary">{q.question}</p>
                {submitted ? (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">
                      {socraticResults[q.skill_targeted].is_new_skill
                        ? `Added "${socraticResults[q.skill_targeted].node_updated}" to your Cloud`
                        : `Strengthened "${socraticResults[q.skill_targeted].node_updated}" in your Cloud`}
                    </span>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={socraticAnswers[q.skill_targeted] ?? ""}
                      onChange={(e) => setSocraticAnswers(prev => ({ ...prev, [q.skill_targeted]: e.target.value }))}
                      rows={2}
                      placeholder="Share specific examples — even indirect exposure counts..."
                      disabled={submitting}
                      className="mt-3 w-full rounded-lg border border-brand-200 bg-surface-0 px-3 py-2 text-sm text-surface-text placeholder:text-surface-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-surface-2"
                    />
                    <button
                      onClick={() => submitSocraticAnswer(q)}
                      disabled={submitting || (socraticAnswers[q.skill_targeted] ?? "").trim().length < 5}
                      className="mt-2 flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating Cloud...</>
                      ) : (
                        <>Submit <ChevronRight className="h-3.5 w-3.5" /></>
                      )}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex gap-3">
        <Link
          href={`/cv?app=${analysis.application_id}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 font-medium text-white transition-colors hover:bg-brand-700"
        >
          <FileText className="h-5 w-5" />
          Generate tailored CV
        </Link>
        <button
          onClick={() => setSaved(true)}
          disabled={saved}
          className="flex items-center justify-center gap-2 rounded-lg border border-surface-border px-6 py-3 font-medium text-surface-text-secondary transition-colors hover:bg-surface-2 disabled:opacity-60"
        >
          {saved ? (
            <><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Saved</>
          ) : (
            <><Bookmark className="h-5 w-5" /> Save to tracker</>
          )}
        </button>
      </div>
      {saved && (
        <p className="mt-2 text-center text-xs text-surface-text-muted">
          Added to your <Link href="/tracker" className="text-brand-600 hover:underline">Application Tracker</Link>
        </p>
      )}
    </div>
  );
}

// --- Collapsible Requirement Row ---
function RequirementRow({ requirement }: { requirement: Requirement }) {
  const [open, setOpen] = useState(false);
  const config = strengthConfig[requirement.strength];

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <Collapsible.Trigger className="flex w-full items-center gap-3 rounded-lg border border-surface-border bg-surface-0 px-5 py-4 text-left transition-colors hover:bg-surface-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${config.dot}`} />
        <span className="flex-1 text-sm font-medium text-surface-text">
          {requirement.name}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
          {config.label}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-surface-text-muted" />
        ) : (
          <ChevronRight className="h-4 w-4 text-surface-text-muted" />
        )}
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
        <div className="px-5 pb-4 pt-2">
          {requirement.evidence && (
            <p className="text-sm leading-relaxed text-surface-text-secondary">
              {requirement.evidence}
            </p>
          )}

          {/* Evidence source tags */}
          {requirement.evidence_sources?.length > 0 && (
            <Tooltip.Provider delayDuration={200}>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {requirement.evidence_sources.map((src, i) => {
                  const typeConfig = evidenceTypeIcons[src.type] || { color: "text-surface-text-secondary bg-surface-2 border-surface-border" };
                  return (
                    <Tooltip.Root key={i}>
                      <Tooltip.Trigger asChild>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium cursor-help ${typeConfig.color}`}>
                          {src.type === "role" && <Briefcase className="h-2.5 w-2.5" />}
                          {src.type === "certification" && <Shield className="h-2.5 w-2.5" />}
                          {src.type === "impact" && <Target className="h-2.5 w-2.5" />}
                          {src.type === "award" && <Award className="h-2.5 w-2.5" />}
                          {src.type === "project" && <FolderOpen className="h-2.5 w-2.5" />}
                          {src.type === "socratic" && <MessageCircle className="h-2.5 w-2.5" />}
                          {src.label.length > 30 ? src.label.slice(0, 30) + "..." : src.label}
                        </span>
                      </Tooltip.Trigger>
                      {src.detail && (
                        <Tooltip.Portal>
                          <Tooltip.Content
                            side="top"
                            sideOffset={4}
                            className="z-50 max-w-xs rounded-lg border border-surface-border bg-surface-0 px-3 py-2 shadow-lg"
                          >
                            <p className="text-xs font-semibold text-surface-text">{src.label}</p>
                            <p className="mt-0.5 text-xs text-surface-text-muted">{src.detail}</p>
                            <Tooltip.Arrow className="fill-white" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      )}
                    </Tooltip.Root>
                  );
                })}
              </div>
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
