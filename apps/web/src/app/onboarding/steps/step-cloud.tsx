"use client";

import { useEffect, useState, useRef } from "react";
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  Award,
  Shield,
  FolderKanban,
  TrendingUp,
  Layers,
  Clock,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Radar,
  GitBranch,
  Loader2,
  GraduationCap,
  User,
  MessageSquare,
} from "lucide-react";
import type { UploadResult } from "../page";
import {
  ConflictResolution,
  type ConflictQuestion,
  type ConflictAnswer,
} from "./conflict-resolution";
import { CloudVisualization, type CloudData } from "@/components/cloud";

// ============================================================
// TYPES — matching /api/cloud response
// ============================================================

interface DepthAssessment {
  level: "mentioned" | "applied" | "proficient" | "expert";
  totalMonths: number;
  roleCount: number;
  hasImpact: boolean;
  hasCertification: boolean;
  hasProject: boolean;
  hasAward: boolean;
  score: number;
}

interface EvidenceItem {
  type: string;
  company?: string;
  title?: string;
  duration_months?: number;
  name?: string;
  issuer?: string;
  description?: string;
  [key: string]: unknown;
}

interface ClassifiedSkill {
  name: string;
  domain: string;
  category: string;
  depth: DepthAssessment;
  evidence: EvidenceItem[];
}

interface TaxonomyCategory {
  name: string;
  displayName: string;
  skills: ClassifiedSkill[];
}

interface TaxonomyDomain {
  name: string;
  displayName: string;
  categories: TaxonomyCategory[];
}

interface ClassifiedRole {
  title: string;
  company: string;
  startYear: number;
  endYear: number;
  domain: string;
  durationMonths: number;
}

interface SkillGap {
  skillName: string;
  reason: string;
  priority: "p0" | "p1" | "p2";
  type: "missing" | "shallow" | "stale";
}

interface ClassifiedCloud {
  domains: TaxonomyDomain[];
  topSkills: ClassifiedSkill[];
  roles: ClassifiedRole[];
  careerSpan: { startYear: number; endYear: number; years: number };
  totalRoles: number;
  totalEvidencePoints: number;
  gaps: SkillGap[];
}

// ============================================================
// COLORS
// ============================================================

const DOMAIN_COLORS: Record<string, { hex: string; text: string; bg: string; bar: string; barBg: string; border: string }> = {
  defense_aerospace:  { hex: "#e11d48", text: "text-rose-700",    bg: "bg-rose-50",    bar: "bg-rose-500",    barBg: "bg-rose-100",    border: "border-rose-200" },
  management:         { hex: "#2563eb", text: "text-blue-700",    bg: "bg-blue-50",    bar: "bg-blue-500",    barBg: "bg-blue-100",    border: "border-blue-200" },
  quality_compliance: { hex: "#059669", text: "text-emerald-700", bg: "bg-emerald-50", bar: "bg-emerald-500", barBg: "bg-emerald-100", border: "border-emerald-200" },
  maintenance_ops:    { hex: "#0284c7", text: "text-sky-700",     bg: "bg-sky-50",     bar: "bg-sky-500",     barBg: "bg-sky-100",     border: "border-sky-200" },
  technology:         { hex: "#7c3aed", text: "text-violet-700",  bg: "bg-violet-50",  bar: "bg-violet-500",  barBg: "bg-violet-100",  border: "border-violet-200" },
  leadership:         { hex: "#d97706", text: "text-amber-700",   bg: "bg-amber-50",   bar: "bg-amber-500",   barBg: "bg-amber-100",   border: "border-amber-200" },
  tools:              { hex: "#57534e", text: "text-stone-600",   bg: "bg-stone-50",   bar: "bg-stone-400",   barBg: "bg-stone-100",   border: "border-stone-200" },
  healthcare:         { hex: "#dc2626", text: "text-red-700",     bg: "bg-red-50",     bar: "bg-red-500",     barBg: "bg-red-100",     border: "border-red-200" },
  finance:            { hex: "#16a34a", text: "text-green-700",   bg: "bg-green-50",   bar: "bg-green-500",   barBg: "bg-green-100",   border: "border-green-200" },
  education:          { hex: "#0891b2", text: "text-cyan-700",    bg: "bg-cyan-50",    bar: "bg-cyan-500",    barBg: "bg-cyan-100",    border: "border-cyan-200" },
  design:             { hex: "#ec4899", text: "text-pink-700",    bg: "bg-pink-50",    bar: "bg-pink-500",    barBg: "bg-pink-100",    border: "border-pink-200" },
  hr:                 { hex: "#f97316", text: "text-orange-700",  bg: "bg-orange-50",  bar: "bg-orange-500",  barBg: "bg-orange-100",  border: "border-orange-200" },
  marketing:          { hex: "#a855f7", text: "text-purple-700",  bg: "bg-purple-50",  bar: "bg-purple-500",  barBg: "bg-purple-100",  border: "border-purple-200" },
  construction:       { hex: "#78716c", text: "text-stone-700",   bg: "bg-stone-50",   bar: "bg-stone-500",   barBg: "bg-stone-100",   border: "border-stone-200" },
  legal:              { hex: "#4338ca", text: "text-indigo-700",  bg: "bg-brand-50",  bar: "bg-brand-500",  barBg: "bg-indigo-100",  border: "border-indigo-200" },
  operations:         { hex: "#0d9488", text: "text-teal-700",    bg: "bg-teal-50",    bar: "bg-teal-500",    barBg: "bg-teal-100",    border: "border-teal-200" },
  energy:             { hex: "#ca8a04", text: "text-yellow-700",  bg: "bg-yellow-50",  bar: "bg-yellow-500",  barBg: "bg-yellow-100",  border: "border-yellow-200" },
  general:            { hex: "#71717a", text: "text-surface-text-secondary",    bg: "bg-surface-2",    bar: "bg-surface-3",    barBg: "bg-surface-2",    border: "border-surface-border" },
};

const DEPTH_LEVELS = {
  expert:     { label: "Expert",     pct: 100, opacity: 1 },
  proficient: { label: "Proficient", pct: 72,  opacity: 0.85 },
  applied:    { label: "Applied",    pct: 40,  opacity: 0.6 },
  mentioned:  { label: "Mentioned",  pct: 12,  opacity: 0.35 },
} as const;

type ViewTab = "breadth" | "depth" | "timeline";

function dc(domain: string) {
  return DOMAIN_COLORS[domain] ?? DOMAIN_COLORS.general;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

interface StepCloudProps {
  uploadResults: UploadResult[];
  onNext: () => void;
}

export function StepCloud({ uploadResults, onNext }: StepCloudProps) {
  const [cloud, setCloud] = useState<ClassifiedCloud | null>(null);
  const [identity, setIdentity] = useState<{
    core_profession: string;
    specializations: string[];
    career_stage: string;
    career_stage_generic: string;
    qualification_country: string | null;
    qualification_degrees: string[];
    niche_differentiators: string[];
  } | null>(null);
  const [education, setEducation] = useState<Array<{ institution: string; degree: string; field: string }>>([]);
  const [cloudData, setCloudData] = useState<CloudData | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState(0);
  const [tab, setTab] = useState<ViewTab>("breadth");
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const skipped = uploadResults.length === 0;

  // Phase 1: Conflict Resolution state
  const [conflicts, setConflicts] = useState<ConflictQuestion[]>([]);
  const [conflictsResolved, setConflictsResolved] = useState(false);
  const [stage, setStage] = useState<"loading" | "pending_parse" | "conflicts" | "socratic" | "cloud">("loading");
  const [socraticQuestions, setSocraticQuestions] = useState<Array<{ id: string; question: string; skill_name: string; why_asking: string }>>([]);
  const [socraticAnswers, setSocraticAnswers] = useState<Map<string, string>>(new Map());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build CloudData for the new visualization from API response
  function buildCloudData(data: Record<string, unknown>): CloudData | null {
    if (!data.classified && !data.nodes) return null;
    const id = data.identity as CloudData["identity"] | undefined;
    const traj = data.trajectory as CloudData["trajectory"] | undefined;
    const stats = data.stats as CloudData["stats"] | undefined;
    const nodes = (data.nodes ?? []) as CloudData["nodes"];
    const classified = data.classified as ClassifiedCloud | undefined;

    return {
      identity: {
        name: (id as unknown as Record<string, unknown>)?.candidate_name as string ?? id?.core_profession ?? "",
        core_profession: id?.core_profession ?? "Professional",
        specializations: id?.specializations ?? [],
        career_stage: id?.career_stage ?? "",
        qualification_country: id?.qualification_country ?? null,
        qualification_degrees: id?.qualification_degrees ?? [],
        niche_differentiators: id?.niche_differentiators ?? [],
      },
      nodes: nodes.length > 0 ? nodes : (classified?.topSkills ?? []).map((s, i) => ({
        id: `s-${i}`,
        name: s.name,
        tier: "core_skill" as const,
        category: s.category ?? "general",
        domain: s.domain ?? "general",
        evidence: s.evidence ?? [],
        summary: {
          total_months_used: s.depth?.totalMonths ?? 0,
          number_of_roles: s.depth?.roleCount ?? 0,
          has_impact: s.depth?.hasImpact ?? false,
          has_external_validation: s.depth?.hasCertification ?? false,
          has_depth: false,
          has_project: false,
          last_used: null,
        },
        depth: s.depth,
      })),
      trajectory: {
        roles: traj?.roles ?? (classified?.roles ?? []).map(r => ({
          company: r.company,
          title: r.title,
          start_date: String(r.startYear ?? ""),
          end_date: String(r.endYear ?? ""),
          duration_months: r.durationMonths,
          domain: r.domain,
          seniority_level: 3,
          isTraining: false,
        })),
      },
      stats: stats ?? {
        years: classified?.careerSpan?.years ?? 0,
        roles: classified?.totalRoles ?? 0,
        skills: classified?.topSkills?.length ?? 0,
        evidencePoints: classified?.totalEvidencePoints ?? 0,
        domains: classified?.domains?.length ?? 0,
        certCount: 0,
      },
    };
  }

  // Load conflicts → Cloud (called after parsing is confirmed done)
  async function loadConflictsAndCloud() {
    try {
      const conflictRes = await fetch("/api/cv/conflicts");
      if (conflictRes.ok) {
        const conflictData = await conflictRes.json();
        if (conflictData.questions && conflictData.questions.length > 0) {
          setConflicts(conflictData.questions);
          setLoading(false);
          setStage("conflicts");
          return;
        }
      }
    } catch { /* proceed to Cloud */ }

    try {
      let res = await fetch("/api/cloud");
      let data = res.ok ? await res.json() : null;

      // If cloud is empty but we have parsed CVs, trigger a build
      if (!data?.classified) {
        try { await fetch("/api/cv/build-cloud", { method: "POST" }); } catch { /* non-critical */ }
        res = await fetch("/api/cloud");
        data = res.ok ? await res.json() : null;
      }

      if (data?.classified) {
        setCloud(data.classified);
        setCloudData(buildCloudData(data));
        if (data.identity) setIdentity(data.identity);
        if (data.education) setEducation(data.education);
      }

      // Check for Socratic questions — show BEFORE Cloud visualization
      if (data?.socratic_questions && data.socratic_questions.length > 0) {
        setSocraticQuestions(data.socratic_questions);
        setLoading(false);
        setStage("socratic");
        return;
      }
    } catch { /* empty state */ }
    setLoading(false);
    setStage("cloud");
    setTimeout(() => setPhase(1), 150);
    setTimeout(() => setPhase(2), 400);
    setTimeout(() => setPhase(3), 700);
  }

  useEffect(() => {
    if (skipped) { setLoading(false); setStage("cloud"); return; }

    // Dev mode: CVs are pending_parse — poll until parsed, then build Cloud
    const hasPendingParse = uploadResults.some((r) => r.status === "pending_parse");
    if (hasPendingParse) {
      setStage("pending_parse");
      setLoading(false);

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch("/api/cv/conflicts");
          if (!res.ok) return;
          const data = await res.json();
          // total_documents > 0 means at least one CV is in parsed status
          // (total_roles is 0 for single CV — conflicts needs 2+)
          if (data.stats?.total_documents > 0 || (data.questions && data.questions.length > 0)) {
            // CVs are parsed — stop polling
            if (pollRef.current) clearInterval(pollRef.current);
            // Try to build Cloud first (dev mode endpoint)
            try { await fetch("/api/cv/build-cloud", { method: "POST" }); } catch { /* may already be built */ }
            setLoading(true);
            setStage("loading");
            await loadConflictsAndCloud();
          }
        } catch { /* keep polling */ }
      }, 3000);

      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }

    // Production: CVs already parsed — load immediately
    const timer = setTimeout(() => loadConflictsAndCloud(), 300);
    return () => clearTimeout(timer);
  }, [skipped]);

  // After conflicts are resolved, rebuild Cloud then check for Socratic questions
  async function handleConflictsComplete(answers: ConflictAnswer[]) {
    setConflictsResolved(true);
    setLoading(true);
    setStage("loading");

    try {
      // Send answers to backend to correct the parsed CVs, then rebuild Cloud
      const resolveRes = await fetch("/api/cv/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      // Check if resolve returned Socratic questions
      if (resolveRes.ok) {
        const resolveData = await resolveRes.json();
        if (resolveData.socratic_questions && resolveData.socratic_questions.length > 0) {
          setSocraticQuestions(resolveData.socratic_questions);
          setLoading(false);
          setStage("socratic");
          return;
        }
      }
    } catch { /* proceed to cloud */ }

    // No Socratic questions — go straight to Cloud
    await loadAndShowCloud();
  }

  // Shared helper: fetch Cloud data and transition to cloud stage
  async function loadAndShowCloud() {
    setLoading(true);
    try {
      const res = await fetch("/api/cloud");
      if (res.ok) {
        const data = await res.json();
        if (data.classified) {
          setCloud(data.classified);
          setCloudData(buildCloudData(data));
          if (data.education) setEducation(data.education);
        }
      }
    } catch { /* empty state */ }
    setLoading(false);
    setStage("cloud");
    setTimeout(() => setPhase(1), 150);
    setTimeout(() => setPhase(2), 400);
    setTimeout(() => setPhase(3), 700);
  }

  // Handle Socratic answers completion — batch submit, rebuild Cloud, then show
  const socraticCompleteRef = useRef(false);
  async function handleSocraticComplete() {
    // Prevent double-execution (React StrictMode or render-time call)
    if (socraticCompleteRef.current) return;
    socraticCompleteRef.current = true;

    setLoading(true);
    setStage("loading");

    // Build batch of real answers (exclude skips)
    const batch = Array.from(socraticAnswers.entries())
      .map(([questionId, answer]) => {
        const question = socraticQuestions.find(q => q.id === questionId);
        return question ? {
          question_id: questionId,
          skill_name: question.skill_name,
          answer: answer,
          question_text: question.question,
        } : null;
      })
      .filter(Boolean);

    if (batch.length > 0) {
      try {
        await fetch("/api/socratic/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: batch }),
        });
      } catch {
        console.error("Failed to persist Socratic answers");
      }
    }

    // Rebuild Cloud with enriched data, then show it
    try { await fetch("/api/cv/build-cloud", { method: "POST" }); } catch { /* non-critical */ }
    await loadAndShowCloud();
    socraticCompleteRef.current = false;
  }

  function handleConflictsSkip() {
    setConflictsResolved(true);
    setStage("loading");
    setLoading(true);
    // Check for Socratic questions even when conflicts skipped
    (async () => {
      try {
        // Build Cloud first
        try { await fetch("/api/cv/build-cloud", { method: "POST" }); } catch { /* may already exist */ }
        // Check for Socratic questions
        const cloudRes = await fetch("/api/cloud");
        if (cloudRes.ok) {
          const data = await cloudRes.json();
          if (data.socratic_questions && data.socratic_questions.length > 0) {
            if (data.classified) {
              setCloud(data.classified);
              setCloudData(buildCloudData(data));
              if (data.education) setEducation(data.education);
            }
            setSocraticQuestions(data.socratic_questions);
            setLoading(false);
            setStage("socratic");
            return;
          }
        }
      } catch { /* fall through */ }
      await loadAndShowCloud();
    })();
  }

  const ok = uploadResults.filter((r) => r.status === "parsed");
  const bad = uploadResults.filter((r) => r.error);

  // Auto-complete when all Socratic questions are answered
  // IMPORTANT: This useEffect MUST be before any conditional returns (React hooks rule)
  const allAnswered = stage === "socratic" && socraticQuestions.length > 0 &&
    !socraticQuestions.find(q => !socraticAnswers.has(q.id));
  useEffect(() => {
    if (allAnswered) {
      handleSocraticComplete();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAnswered]);

  if (skipped) {
    return (
      <div className="text-center">
        <Cloud className="mx-auto h-12 w-12 text-surface-text-muted" />
        <h2 className="mt-4 text-xl font-semibold text-surface-text">No CVs uploaded yet</h2>
        <p className="mt-2 text-sm text-surface-text-muted">Upload CVs to build your evidence-based profile.</p>
        <button onClick={onNext} className="mt-6 h-10 w-full rounded-lg bg-brand-600 text-sm font-medium text-white hover:bg-brand-700">Continue</button>
      </div>
    );
  }

  // Dev mode: waiting for external parse
  if (stage === "pending_parse") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-gradient-to-r from-brand-600 via-violet-600 to-purple-600 px-4 py-3 text-white shadow-md">
          <h2 className="text-lg font-bold tracking-tight">Reading your career history...</h2>
          <p className="mt-0.5 text-xs text-brand-100">
            We&apos;re extracting roles, skills, and achievements from your CVs. This page updates automatically.
          </p>
        </div>
        <div className="flex flex-col items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="mt-4 text-sm font-medium text-surface-text-secondary">Discovering what makes you stand out</p>
          <p className="mt-1 text-xs text-surface-text-muted">
            {uploadResults.filter((r) => r.status === "pending_parse").length} CV{uploadResults.filter((r) => r.status === "pending_parse").length > 1 ? "s" : ""} in progress — checking every few seconds
          </p>
        </div>
      </div>
    );
  }

  // Show conflict resolution phase
  if (stage === "conflicts" && conflicts.length > 0 && !conflictsResolved) {
    return (
      <ConflictResolution
        questions={conflicts}
        onComplete={handleConflictsComplete}
        onSkip={handleConflictsSkip}
      />
    );
  }

  // Show Socratic enrichment questions (BEFORE Cloud visualization)
  if (stage === "socratic" && socraticQuestions.length > 0) {
    const answeredCount = socraticAnswers.size;
    const totalCount = socraticQuestions.length;
    const currentQ = socraticQuestions.find(q => !socraticAnswers.has(q.id));

    if (!currentQ) {
      // All answered — useEffect above triggers handleSocraticComplete
      return (
        <div className="flex flex-col items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="mt-4 text-sm font-medium text-surface-text-secondary">Building your profile with enriched context...</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-brand-600 px-4 py-3 text-white shadow-md">
          <h2 className="text-lg font-bold tracking-tight">Help us understand you better</h2>
          <p className="mt-0.5 text-xs text-violet-100">
            {answeredCount}/{totalCount} questions · These answers make your profile more accurate
          </p>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-0 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-surface-text">{currentQ.question}</p>
              <p className="text-xs text-surface-text-muted">About: {currentQ.skill_name} · {currentQ.why_asking}</p>
              <textarea
                key={currentQ.id}
                className="mt-2 w-full rounded-lg border border-surface-border px-3 py-2 text-sm text-surface-text-secondary placeholder:text-surface-text-muted focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                placeholder="Your answer (optional — skip if you prefer)"
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const val = (e.target as HTMLTextAreaElement).value.trim();
                    setSocraticAnswers(prev => {
                      const next = new Map(prev);
                      next.set(currentQ.id, val || "skipped");
                      return next;
                    });
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSocraticAnswers(prev => {
                      const next = new Map(prev);
                      next.set(currentQ.id, "skipped");
                      return next;
                    });
                  }}
                  className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-surface-text-muted hover:bg-surface-2"
                >
                  Skip
                </button>
                <button
                  onClick={() => {
                    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
                    const val = textarea?.value?.trim() || "skipped";
                    setSocraticAnswers(prev => {
                      const next = new Map(prev);
                      next.set(currentQ.id, val);
                      return next;
                    });
                  }}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
                >
                  Next
                </button>
                {answeredCount > 0 && (
                  <button
                    onClick={() => handleSocraticComplete()}
                    className="ml-auto rounded-lg border border-violet-200 px-3 py-1.5 text-xs text-violet-600 hover:bg-violet-50"
                  >
                    Done — show my profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="h-1 rounded-full bg-surface-2">
          <div
            className="h-1 rounded-full bg-violet-500 transition-all"
            style={{ width: `${(answeredCount / totalCount) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-brand-600 via-violet-600 to-purple-600 px-4 py-3 text-white shadow-md">
        <h2 className="text-lg font-bold tracking-tight">Your Profile Cloud</h2>
        <p className="mt-0.5 text-xs text-brand-100">
          {loading ? "Connecting your experience to evidence..." : conflictsResolved ? "Updated with your corrections. Every skill backed by real evidence." : "Every skill backed by real roles, real impact."}
        </p>
      </div>

      {/* Errors */}
      {!loading && bad.length > 0 && bad.map((r) => (
        <div key={r.filename} className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs">
          <AlertCircle className="h-3 w-3 text-red-500" />
          <span className="text-red-700">{r.filename}: {r.error}</span>
        </div>
      ))}

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* CLOUD DATA — New visualization */}
      {!loading && cloudData && (
        <>
          <CloudVisualization data={cloudData} animate={true} />

          {/* CV sources */}
          {ok.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-4">
              {ok.map((r) => (
                <span key={r.filename} className="inline-flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-[10px] text-green-700">
                  <CheckCircle2 className="h-2.5 w-2.5" /> {r.filename}
                </span>
              ))}
            </div>
          )}

          <button onClick={onNext} className="mt-4 h-10 w-full rounded-lg bg-brand-600 text-sm font-medium text-white hover:bg-brand-700">
            Continue
          </button>
        </>
      )}

      {/* Fallback: old cloud data without new format */}
      {!loading && cloud && !cloudData && (
        <div className="py-6 text-center">
          <Cloud className="mx-auto h-10 w-10 text-surface-text-muted" />
          <p className="mt-3 text-sm text-surface-text-muted">Profile data loaded in legacy format. Rebuilding...</p>
          <button onClick={onNext} className="mt-4 h-10 w-full rounded-lg bg-brand-600 text-sm font-medium text-white hover:bg-brand-700">Continue</button>
        </div>
      )}

      {/* Empty */}
      {!loading && !cloud && (
        <div className="py-6 text-center">
          <Cloud className="mx-auto h-10 w-10 text-surface-text-muted" />
          <p className="mt-3 text-sm text-surface-text-muted">No skills extracted yet.</p>
          <button onClick={onNext} className="mt-4 h-10 w-full rounded-lg bg-brand-600 text-sm font-medium text-white hover:bg-brand-700">Continue</button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB 1: BREADTH — Radar showing domain strength
// ============================================================
// Larger SVG with labels placed clearly outside the chart.
// Each axis = one domain. Polygon shows relative strength.

function BreadthView({ cloud }: { cloud: ClassifiedCloud }) {
  const domains = cloud.domains;
  if (domains.length === 0) return <EmptyTab label="No domains detected" />;

  const maxScore = Math.max(1, ...domains.map((d) =>
    d.categories.reduce((s, c) => s + c.skills.reduce((ss, sk) => ss + sk.depth.score, 0), 0),
  ));

  const data = domains.map((d) => {
    const score = d.categories.reduce((s, c) => s + c.skills.reduce((ss, sk) => ss + sk.depth.score, 0), 0);
    const count = d.categories.reduce((s, c) => s + c.skills.length, 0);
    const experts = d.categories.reduce((s, c) => s + c.skills.filter((sk) => sk.depth.level === "expert").length, 0);
    return { ...d, norm: score / maxScore, count, experts };
  });

  // Radar needs 3+ domains to form a meaningful polygon; otherwise show bar chart
  if (data.length < 3) {
    return (
      <div className="space-y-3">
        {data.map((d) => {
          const color = dc(d.name);
          return (
            <div key={d.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color.hex }} />
                  <span className={`text-sm font-semibold ${color.text}`}>{d.displayName}</span>
                </div>
                <span className="text-[10px] text-surface-text-muted">
                  {d.count} skill{d.count !== 1 ? "s" : ""}{d.experts > 0 ? ` · ${d.experts} expert` : ""}
                </span>
              </div>
              <div className={`h-5 rounded-full ${color.barBg} overflow-hidden`}>
                <div
                  className={`h-full rounded-full ${color.bar} transition-all duration-700`}
                  style={{ width: `${Math.max(8, d.norm * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="text-xs text-surface-text-muted text-center pt-1">
          <span className="font-semibold text-surface-text-secondary">{domains.length} domain{domains.length !== 1 ? "s" : ""}</span> covering{" "}
          <span className="font-semibold text-surface-text-secondary">
            {domains.reduce((s, d) => s + d.categories.reduce((ss, c) => ss + c.skills.length, 0), 0)} skills
          </span>
        </p>
      </div>
    );
  }

  // Full radar chart for 3+ domains
  const size = 380;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 100;
  const labelR = maxR + 32;

  const n = data.length;
  const step = (2 * Math.PI) / n;

  const pts = data.map((d, i) => {
    const a = i * step - Math.PI / 2;
    const r = 15 + d.norm * (maxR - 15);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  const poly = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="100%" viewBox={`0 0 ${size} ${size}`} className="max-w-[340px]">
        <defs>
          <linearGradient id="rFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Grid rings */}
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <circle key={r} cx={cx} cy={cy} r={r * maxR} fill="none" stroke="#e4e4e7" strokeWidth={0.5} strokeDasharray="3,3" />
        ))}

        {/* Axes */}
        {data.map((_, i) => {
          const a = i * step - Math.PI / 2;
          return <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke="#e4e4e7" strokeWidth={0.5} />;
        })}

        {/* Filled polygon */}
        <path d={poly} fill="url(#rFill)" stroke="#6366f1" strokeWidth={2} />

        {/* Dots + labels */}
        {data.map((d, i) => {
          const a = i * step - Math.PI / 2;
          const r = 15 + d.norm * (maxR - 15);
          const px = cx + r * Math.cos(a);
          const py = cy + r * Math.sin(a);
          const lx = cx + labelR * Math.cos(a);
          const ly = cy + labelR * Math.sin(a);
          const color = dc(d.name).hex;
          const anchor = Math.abs(Math.cos(a)) < 0.3 ? "middle" : Math.cos(a) > 0 ? "start" : "end";

          return (
            <g key={d.name}>
              <circle cx={px} cy={py} r={5} fill={color} stroke="white" strokeWidth={2} />
              <text x={lx} y={ly - 5} textAnchor={anchor} fill="#374151" fontSize={10} fontWeight={600}>
                {d.displayName.length > 20 ? d.displayName.split(" & ")[0].split(",")[0] : d.displayName}
              </text>
              <text x={lx} y={ly + 8} textAnchor={anchor} fill="#9ca3af" fontSize={9}>
                {d.count} skill{d.count !== 1 ? "s" : ""}{d.experts > 0 ? ` · ${d.experts} expert` : ""}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="text-xs text-surface-text-muted text-center">
        <span className="font-semibold text-surface-text-secondary">{domains.length} domains</span> covering{" "}
        <span className="font-semibold text-surface-text-secondary">
          {domains.reduce((s, d) => s + d.categories.reduce((ss, c) => ss + c.skills.length, 0), 0)} skills
        </span>{" "}
        over <span className="font-semibold text-surface-text-secondary">{cloud.careerSpan.years} years</span>
      </p>
    </div>
  );
}

// ============================================================
// TAB 2: DEPTH — Top skills + domain drill-down
// ============================================================

function DepthView({
  cloud,
  expanded,
  setExpanded,
}: {
  cloud: ClassifiedCloud;
  expanded: string | null;
  setExpanded: (d: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Top skills — click to see evidence */}
      <div>
        <SectionLabel text="Strongest evidence" />
        <div className="space-y-1.5">
          {cloud.topSkills.slice(0, 8).map((s) => (
            <SkillBar key={s.name} skill={s} expandable />
          ))}
        </div>
        <DepthLegend />
      </div>

      {/* Domain drill-down */}
      <SectionLabel text="By domain" />
      {cloud.domains.map((domain) => {
        const colors = dc(domain.name);
        const total = domain.categories.reduce((s, c) => s + c.skills.length, 0);
        const experts = domain.categories.reduce((s, c) => s + c.skills.filter((sk) => sk.depth.level === "expert").length, 0);
        const open = expanded === domain.name;

        return (
          <div key={domain.name} className={`rounded-lg border ${colors.border} overflow-hidden`}>
            <button
              onClick={() => setExpanded(open ? null : domain.name)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface-2/50"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors.hex }} />
              <span className={`flex-1 text-sm font-semibold ${colors.text}`}>{domain.displayName}</span>
              <span className="text-[10px] text-surface-text-muted shrink-0">
                {total} skill{total !== 1 ? "s" : ""}{experts > 0 && ` \u00B7 ${experts} expert`}
              </span>
              {open ? <ChevronUp className="h-4 w-4 text-surface-text-muted" /> : <ChevronDown className="h-4 w-4 text-surface-text-muted" />}
            </button>
            {open && (
              <div className="border-t border-surface-border px-3 pb-3 pt-2 space-y-3 bg-surface-0/50">
                {domain.categories.map((cat) => (
                  <div key={cat.name}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-surface-text-muted">{cat.displayName}</p>
                    <div className="space-y-1">
                      {cat.skills.map((s) => <SkillBar key={s.name} skill={s} expandable />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// TAB 3: CAREER PROGRESSION — Y=seniority, X=years
// ============================================================

// Seniority level inference from role title — profession-agnostic
const SENIORITY_PATTERNS: Array<{ level: number; label: string; patterns: RegExp }> = [
  // Order matters: checked top-down, first match wins.
  // Compound titles checked before single-word to avoid partial matches.
  { level: 5, label: "Director+", patterns: /\b(director|chief|ceo|cfo|cto|coo|vp|vice.?president|head of|dean|professor|principal|partner)\b/i },
  { level: 1, label: "Entry", patterns: /\b(house.?officer|house.?job|student|volunteer|aide|clerk|freshman)\b/i },
  { level: 2, label: "Junior", patterns: /\b(junior|trainee|resident|residency|apprentice|graduate|entry)\b/i },
  { level: 4, label: "Senior", patterns: /\b(consultant|senior|lead|manager|superintendent|supervisor|fellow|attending|specialist|architect)\b/i },
  { level: 3, label: "Mid-Level", patterns: /\b(registrar|associate|engineer|analyst|officer|therapist|accountant|developer|intern)\b/i },
];

function inferSeniority(title: string): { level: number; label: string } {
  const lower = title.toLowerCase();
  // Check from highest to lowest — first match wins
  for (const { level, label, patterns } of SENIORITY_PATTERNS) {
    if (patterns.test(lower)) return { level, label };
  }
  return { level: 3, label: "Mid-Level" };
}

function TimelineView({ cloud }: { cloud: ClassifiedCloud }) {
  const roles = cloud.roles ?? [];
  if (roles.length === 0) return <EmptyTab label="No role timeline data" />;

  const minYear = cloud.careerSpan.startYear || roles[0]?.startYear || 2008;
  const maxYear = cloud.careerSpan.endYear || new Date().getFullYear();
  const span = Math.max(1, maxYear - minYear);

  const rolesWithSeniority = roles.map((r) => ({
    ...r,
    seniority: inferSeniority(r.title),
  }));

  // Chart dimensions
  const chartW = 320;
  const chartH = 200;
  const padL = 56;
  const padR = 16;
  const padT = 12;
  const padB = 28;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const maxLevel = 5;
  const levelLabels = ["", "Entry", "Junior", "Mid", "Senior", "Dir+"];

  // Points for each role, positioned at mid-year
  const points = rolesWithSeniority.map((r) => {
    const midYear = (r.startYear + r.endYear) / 2;
    const x = padL + ((midYear - minYear) / span) * plotW;
    const y = padT + plotH - ((r.seniority.level / maxLevel) * plotH);
    return { x, y, role: r };
  });

  const sortedPts = [...points].sort((a, b) => a.x - b.x);
  const linePath = sortedPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  // Year ticks
  const yearTicks: number[] = [];
  const tickStep = span <= 5 ? 1 : span <= 12 ? 2 : span <= 20 ? 3 : 5;
  for (let y = minYear; y <= maxYear; y += tickStep) yearTicks.push(y);
  if (yearTicks[yearTicks.length - 1] !== maxYear) yearTicks.push(maxYear);

  return (
    <div className="space-y-2">
      <div className="flex justify-center">
        <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} className="max-w-[360px]">
          {/* Grid lines */}
          {[1, 2, 3, 4, 5].map((lvl) => {
            const y = padT + plotH - ((lvl / maxLevel) * plotH);
            return (
              <g key={lvl}>
                <line x1={padL} y1={y} x2={padL + plotW} y2={y} stroke="#f4f4f5" strokeWidth={1} />
                <text x={padL - 6} y={y + 3} textAnchor="end" fill="#a1a1aa" fontSize={8}>{levelLabels[lvl]}</text>
              </g>
            );
          })}

          {/* Year labels */}
          {yearTicks.map((yr) => (
            <text key={yr} x={padL + ((yr - minYear) / span) * plotW} y={chartH - 4} textAnchor="middle" fill="#a1a1aa" fontSize={8}>{yr}</text>
          ))}

          {/* Progression line + area fill */}
          {sortedPts.length > 1 && (
            <path
              d={`${linePath} L${sortedPts[sortedPts.length - 1].x},${padT + plotH} L${sortedPts[0].x},${padT + plotH} Z`}
              fill="#6366f1" fillOpacity={0.06}
            />
          )}
          <path d={linePath} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* Role dots */}
          {sortedPts.map((p, i) => {
            const colors = dc(p.role.domain);
            const isCurrent = p.role.endYear >= new Date().getFullYear();
            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={5} fill={colors.hex} stroke="white" strokeWidth={2} />
                {isCurrent && (
                  <circle cx={p.x} cy={p.y} r={8} fill="none" stroke={colors.hex} strokeWidth={1.5} opacity={0.4}>
                    <animate attributeName="r" from="5" to="12" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Role legend */}
      <div className="space-y-1">
        {rolesWithSeniority.map((r, i) => {
          const colors = dc(r.domain);
          const isCurrent = r.endYear >= new Date().getFullYear();
          return (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: colors.hex }} />
              <span className="font-medium text-surface-text-secondary truncate flex-1" title={r.title}>{r.title}</span>
              <span className="text-surface-text-muted shrink-0">{r.startYear}\u2013{isCurrent ? "now" : r.endYear}</span>
              <span className={`rounded px-1.5 py-0.5 text-[8px] font-medium ${colors.bg} ${colors.text}`}>
                {r.seniority.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-surface-text-muted text-center">
        {roles.length} role{roles.length !== 1 ? "s" : ""} \u00B7{" "}
        {cloud.careerSpan.startYear}\u2013{cloud.careerSpan.endYear} \u00B7 seniority progression
      </p>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-4 py-6">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Cloud className="h-12 w-12 text-brand-400 animate-pulse" />
          <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-brand-500 animate-ping" />
        </div>
        <p className="text-sm font-medium text-surface-text-secondary">Building your Profile Cloud</p>
        <p className="text-xs text-surface-text-muted">Classifying domains, measuring depth...</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-lg bg-surface-2 animate-pulse" />)}
      </div>
      <div className="mx-auto h-48 w-48 rounded-full bg-surface-2 animate-pulse" />
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-surface-text-muted">{text}</h3>;
}

function DetailCard({ icon, value, label, detail }: { icon: React.ReactNode; value: string; label: string; detail: string }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-indigo-50 via-white to-violet-50 border border-indigo-100/50 px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="text-indigo-500">{icon}</div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-text-muted">{label}</span>
      </div>
      <p className="mt-1 text-sm font-bold bg-gradient-to-r from-indigo-700 to-violet-700 bg-clip-text text-transparent">
        {value}
      </p>
      {detail && <p className="mt-0.5 text-[10px] text-surface-text-muted">{detail}</p>}
    </div>
  );
}

function SkillBar({ skill, expandable = false }: { skill: ClassifiedSkill; expandable?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const colors = dc(skill.domain);
  const cfg = DEPTH_LEVELS[skill.depth.level];
  const years = Math.round(skill.depth.totalMonths / 12);
  // Bar width = evidence-based score (0-100), scaled by depth level confidence
  const barPct = Math.max(6, Math.min(100, (skill.depth.score / 110) * cfg.pct));

  return (
    <div>
      <div
        className={`flex items-center gap-2 ${expandable ? "cursor-pointer hover:bg-surface-2 -mx-1 px-1 rounded" : ""}`}
        onClick={expandable ? () => setExpanded(!expanded) : undefined}
      >
        {/* Depth level indicator (colored dot) */}
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: colors.hex, opacity: cfg.opacity }}
          title={cfg.label}
        />
        {/* Skill name — full width, no truncation */}
        <span className="min-w-0 flex-shrink text-xs font-medium text-surface-text-secondary" title={skill.name}>
          {skill.name}
        </span>
        {/* Evidence summary — concise text */}
        <span className="ml-auto shrink-0 text-[10px] text-surface-text-muted tabular-nums">
          {years > 0 && `${years}yr`}
          {years > 0 && skill.depth.roleCount > 0 && " · "}
          {skill.depth.roleCount > 0 && `${skill.depth.roleCount}r`}
        </span>
        {/* Badges */}
        <div className="flex shrink-0 gap-0.5">
          {skill.depth.hasImpact && <Badge icon={<TrendingUp className="h-2.5 w-2.5 text-emerald-600" />} bg="bg-emerald-100" title="Quantified impact" />}
          {skill.depth.hasCertification && <Badge icon={<Shield className="h-2.5 w-2.5 text-blue-600" />} bg="bg-blue-100" title="Backed by certification" />}
          {skill.depth.hasAward && <Badge icon={<Award className="h-2.5 w-2.5 text-amber-600" />} bg="bg-amber-100" title="Award/recognition" />}
          {skill.depth.hasProject && <Badge icon={<FolderKanban className="h-2.5 w-2.5 text-violet-600" />} bg="bg-violet-100" title="Project evidence" />}
        </div>
        {/* Depth level label */}
        <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-medium ${
          skill.depth.level === "expert" ? "bg-indigo-100 text-indigo-700" :
          skill.depth.level === "proficient" ? "bg-brand-50 text-brand-600" :
          skill.depth.level === "applied" ? "bg-surface-2 text-surface-text-secondary" :
          "bg-surface-2 text-surface-text-muted"
        }`}>
          {cfg.label}
        </span>
        {expandable && (
          expanded
            ? <ChevronUp className="h-3 w-3 text-surface-text-muted shrink-0" />
            : <ChevronDown className="h-3 w-3 text-surface-text-muted shrink-0" />
        )}
      </div>
      {/* Evidence bar (below the text row) */}
      <div className={`ml-4 mt-0.5 h-1.5 rounded-full ${colors.barBg} overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
          style={{ width: `${barPct}%`, opacity: cfg.opacity }}
        />
      </div>
      {/* Expanded evidence detail */}
      {expandable && expanded && skill.evidence && skill.evidence.length > 0 && (
        <div className="ml-4 mt-1 mb-2 space-y-1 border-l-2 border-surface-border pl-3">
          {skill.evidence.slice(0, 5).map((ev: EvidenceItem, i: number) => (
            <div key={i} className="text-[10px] text-surface-text-muted">
              {ev.type === "role" && (
                <span><span className="font-medium text-surface-text-secondary">{ev.title}</span> at {ev.company} · {Math.round((ev.duration_months ?? 0) / 12)}yr</span>
              )}
              {ev.type === "certification" && (
                <span className="font-medium text-blue-600">{ev.name} — {ev.issuer || "Unknown issuer"}</span>
              )}
              {ev.type === "impact" && (
                <span className="font-medium text-emerald-600">{ev.description}</span>
              )}
              {ev.type === "award" && (
                <span className="font-medium text-amber-600">{ev.name}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ icon, bg, title }: { icon: React.ReactNode; bg: string; title: string }) {
  return (
    <span className={`flex h-4 w-4 items-center justify-center rounded-full ${bg}`} title={title}>
      {icon}
    </span>
  );
}

function DepthLegend() {
  return (
    <div className="mt-3 space-y-1.5">
      {/* Depth levels */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {(["expert", "proficient", "applied", "mentioned"] as const).map((level) => (
          <span key={level} className="flex items-center gap-1 text-[9px] text-surface-text-muted">
            <span className={`h-2 w-2 rounded-full ${
              level === "expert" ? "bg-brand-600" :
              level === "proficient" ? "bg-indigo-400" :
              level === "applied" ? "bg-surface-3" :
              "bg-surface-3"
            }`} />
            {DEPTH_LEVELS[level].label}
          </span>
        ))}
      </div>
      {/* Badge legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <span className="flex items-center gap-1 text-[9px] text-surface-text-muted">
          <TrendingUp className="h-2.5 w-2.5 text-emerald-500" /> Impact
        </span>
        <span className="flex items-center gap-1 text-[9px] text-surface-text-muted">
          <Shield className="h-2.5 w-2.5 text-blue-500" /> Certified
        </span>
        <span className="flex items-center gap-1 text-[9px] text-surface-text-muted">
          <Award className="h-2.5 w-2.5 text-amber-500" /> Award
        </span>
        <span className="flex items-center gap-1 text-[9px] text-surface-text-muted">
          <FolderKanban className="h-2.5 w-2.5 text-violet-500" /> Project
        </span>
      </div>
      <p className="text-[8px] text-surface-text-muted">Bar = evidence strength · Click a skill to see its evidence chain</p>
    </div>
  );
}

function DifferentiatorsSection({ cloud, phase }: { cloud: ClassifiedCloud; phase: number }) {
  const certs = cloud.topSkills.filter((s) => s.depth.hasCertification).map((s) => s.name);
  const awards = cloud.topSkills.filter((s) => s.depth.hasAward).map((s) => s.name);
  const projects = cloud.topSkills.filter((s) => s.depth.hasProject).map((s) => s.name);
  if (certs.length === 0 && awards.length === 0 && projects.length === 0) return null;

  return (
    <div className={`transition-all duration-500 ${phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
      <SectionLabel text="Differentiators" />
      <div className="space-y-1.5">
        {certs.length > 0 && <TagRow icon={<Shield className="h-3.5 w-3.5 text-blue-500" />} label="Certified" items={certs} />}
        {awards.length > 0 && <TagRow icon={<Award className="h-3.5 w-3.5 text-amber-500" />} label="Recognized" items={awards} />}
        {projects.length > 0 && <TagRow icon={<FolderKanban className="h-3.5 w-3.5 text-violet-500" />} label="Project" items={projects} />}
      </div>
    </div>
  );
}

function TagRow({ icon, label, items }: { icon: React.ReactNode; label: string; items: string[] }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-surface-border bg-surface-2 px-3 py-2">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <span className="text-[10px] font-semibold text-surface-text-muted">{label}</span>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {items.slice(0, 6).map((item) => (
            <span key={item} className="rounded bg-surface-0 px-1.5 py-0.5 text-[10px] text-surface-text-secondary border border-surface-border">{item}</span>
          ))}
          {items.length > 6 && (
            <span className="rounded bg-surface-0 px-1.5 py-0.5 text-[10px] text-surface-text-muted border border-surface-border">+{items.length - 6}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROFILE SUMMARY — CODE-derived core identity
// ============================================================

function ProfileSummaryCard({
  cloud,
  identity,
  education,
  phase,
}: {
  cloud: ClassifiedCloud;
  identity: {
    core_profession: string;
    specializations: string[];
    career_stage: string;
    career_stage_generic: string;
    qualification_country: string | null;
    qualification_degrees: string[];
    niche_differentiators: string[];
  } | null;
  education: Array<{ institution: string; degree: string; field: string }>;
  phase: number;
}) {
  // Use server-computed identity when available, fall back to heuristics
  const coreSpeciality = identity?.core_profession || cloud.topSkills[0]?.name || cloud.domains[0]?.displayName || "Professional";
  const careerStage = identity?.career_stage_generic || (cloud.careerSpan.years >= 15 ? "Senior Professional" : cloud.careerSpan.years >= 8 ? "Experienced Professional" : cloud.careerSpan.years >= 3 ? "Mid-Career Professional" : "Early-Career Professional");
  const qualCountry = identity?.qualification_country || "";
  const years = cloud.careerSpan.years;

  // Degrees from identity (server-computed, deduped) or education array
  const degrees = identity?.qualification_degrees ?? education.map(ed => `${ed.degree}${ed.field ? ` (${ed.field})` : ""}`);

  // Niche differentiators from identity or cert-backed skills
  const niches = identity?.niche_differentiators ?? cloud.topSkills.filter(s => s.depth.hasCertification).map(s => s.name).slice(0, 3);

  return (
    <div className={`rounded-xl border border-indigo-100/50 bg-gradient-to-br from-indigo-50/50 via-white to-violet-50/50 p-3 shadow-sm transition-all duration-500 ${phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
          <User className="h-5 w-5 text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-surface-text">{coreSpeciality}</p>
          <p className="text-[11px] text-surface-text-muted">
            {identity?.career_stage ? `${identity.career_stage} · ` : ""}{careerStage}{years > 0 ? ` · ${years} years` : ""}
          </p>
          {qualCountry && (
            <p className="text-[10px] text-surface-text-muted mt-0.5">Qualified in {qualCountry}</p>
          )}
          {/* Qualification degrees */}
          {degrees.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {degrees.map((deg, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[9px] font-medium text-blue-700">
                  <GraduationCap className="h-2.5 w-2.5" />
                  {deg}
                </span>
              ))}
            </div>
          )}
          {/* Niche differentiators */}
          {niches.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {niches.map((n) => (
                <span key={n} className="rounded bg-brand-50 border border-indigo-200 px-1.5 py-0.5 text-[9px] font-medium text-indigo-700">
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CORRECTION BUTTON — user signals something is wrong
// ============================================================

function CorrectionButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!message.trim()) return;
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), context: "cloud_review" }),
      });
    } catch { /* non-critical */ }
    setSent(true);
    setTimeout(() => { setOpen(false); setSent(false); setMessage(""); }, 2000);
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-center">
        <p className="text-xs font-medium text-green-700">Thanks! We&apos;ll use this to improve your profile.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-surface-border bg-surface-2 py-2 text-xs text-surface-text-muted hover:bg-surface-2 hover:text-surface-text-secondary transition-colors"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Something doesn&apos;t look right?
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-surface-border bg-surface-2 p-3 space-y-2">
      <p className="text-xs font-medium text-surface-text-secondary">Tell us what needs fixing</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="e.g., My speciality is Anesthesiology not ACLS, or I was a Registrar not a Junior..."
        className="w-full rounded border border-surface-border bg-surface-0 px-2 py-1.5 text-xs text-surface-text-secondary placeholder:text-surface-text-muted focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200 resize-none"
        rows={2}
      />
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!message.trim()}
          className="flex-1 rounded bg-brand-600 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit
        </button>
        <button
          onClick={() => { setOpen(false); setMessage(""); }}
          className="rounded px-3 py-1.5 text-xs text-surface-text-muted hover:bg-surface-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-surface-border bg-surface-2">
      <p className="text-sm text-surface-text-muted">{label}</p>
    </div>
  );
}
