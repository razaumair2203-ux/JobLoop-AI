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
  legal:              { hex: "#4338ca", text: "text-indigo-700",  bg: "bg-indigo-50",  bar: "bg-indigo-500",  barBg: "bg-indigo-100",  border: "border-indigo-200" },
  operations:         { hex: "#0d9488", text: "text-teal-700",    bg: "bg-teal-50",    bar: "bg-teal-500",    barBg: "bg-teal-100",    border: "border-teal-200" },
  energy:             { hex: "#ca8a04", text: "text-yellow-700",  bg: "bg-yellow-50",  bar: "bg-yellow-500",  barBg: "bg-yellow-100",  border: "border-yellow-200" },
  general:            { hex: "#71717a", text: "text-zinc-600",    bg: "bg-zinc-50",    bar: "bg-zinc-400",    barBg: "bg-zinc-100",    border: "border-zinc-200" },
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
  const [education, setEducation] = useState<Array<{ institution: string; degree: string; field: string }>>([]);
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

  // Handle Socratic answers completion — rebuild Cloud with enriched data, then show
  async function handleSocraticComplete() {
    setLoading(true);
    setStage("loading");
    // Send Socratic answers to backend (future: rebuild Cloud with enriched context)
    // For now, just transition to Cloud view
    await loadAndShowCloud();
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

  if (skipped) {
    return (
      <div className="text-center">
        <Cloud className="mx-auto h-12 w-12 text-zinc-300" />
        <h2 className="mt-4 text-xl font-semibold text-zinc-900">No CVs uploaded yet</h2>
        <p className="mt-2 text-sm text-zinc-500">Upload CVs to build your evidence-based profile.</p>
        <button onClick={onNext} className="mt-6 h-10 w-full rounded-lg bg-brand-600 text-sm font-medium text-white hover:bg-brand-700">Continue</button>
      </div>
    );
  }

  // Dev mode: waiting for external parse
  if (stage === "pending_parse") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-4 py-3 text-white shadow-md">
          <h2 className="text-lg font-bold tracking-tight">Reading your career history...</h2>
          <p className="mt-0.5 text-xs text-indigo-100">
            We&apos;re extracting roles, skills, and achievements from your CVs. This page updates automatically.
          </p>
        </div>
        <div className="flex flex-col items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="mt-4 text-sm font-medium text-zinc-700">Discovering what makes you stand out</p>
          <p className="mt-1 text-xs text-zinc-400">
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
      // All answered — proceed to Cloud
      handleSocraticComplete();
      return (
        <div className="flex flex-col items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="mt-4 text-sm font-medium text-zinc-700">Building your profile with enriched context...</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-4 py-3 text-white shadow-md">
          <h2 className="text-lg font-bold tracking-tight">Help us understand you better</h2>
          <p className="mt-0.5 text-xs text-violet-100">
            {answeredCount}/{totalCount} questions · These answers make your profile more accurate
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-zinc-800">{currentQ.question}</p>
              <p className="text-xs text-zinc-400">About: {currentQ.skill_name} · {currentQ.why_asking}</p>
              <textarea
                className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                placeholder="Your answer (optional — skip if you prefer)"
                rows={3}
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
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50"
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
        <div className="h-1 rounded-full bg-zinc-100">
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
      <div className="rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-4 py-3 text-white shadow-md">
        <h2 className="text-lg font-bold tracking-tight">Your Profile Cloud</h2>
        <p className="mt-0.5 text-xs text-indigo-100">
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

      {/* CLOUD DATA */}
      {!loading && cloud && (
        <>
          {/* Stat cards — with domain & top skill detail */}
          <div className={`grid grid-cols-2 gap-2 transition-all duration-500 ${phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            <DetailCard
              icon={<Clock className="h-4 w-4" />}
              value={`${cloud.careerSpan.years} years`}
              label="Career span"
              detail={`${cloud.totalRoles} roles across ${cloud.domains.length} domain${cloud.domains.length !== 1 ? "s" : ""}`}
            />
            <DetailCard
              icon={<TrendingUp className="h-4 w-4" />}
              value={`${cloud.totalEvidencePoints} evidence points`}
              label="Profile depth"
              detail={cloud.topSkills[0] ? `Strongest: ${cloud.topSkills[0].name}` : ""}
            />
          </div>
          {/* Domain chips */}
          {cloud.domains.length > 0 && (
            <div className={`flex flex-wrap gap-1.5 transition-all duration-500 ${phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
              {cloud.domains.map((d) => {
                const colors = dc(d.name);
                const skillCount = d.categories.reduce((s, c) => s + c.skills.length, 0);
                return (
                  <span
                    key={d.name}
                    className={`inline-flex items-center gap-1.5 rounded-full ${colors.bg} ${colors.border} border px-2.5 py-1`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.hex }} />
                    <span className={`text-xs font-medium ${colors.text}`}>{d.displayName}</span>
                    <span className="text-[10px] text-zinc-400">{skillCount}</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Profile Summary Card (includes education + country) */}
          <ProfileSummaryCard cloud={cloud} education={education} phase={phase} />

          {/* Tabs */}
          <div className={`transition-all duration-500 ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            <div className="flex gap-1 rounded-lg bg-zinc-100 p-0.5">
              {([
                { key: "breadth" as ViewTab, label: "Breadth", icon: <Radar className="h-3.5 w-3.5" /> },
                { key: "depth" as ViewTab, label: "Depth", icon: <Layers className="h-3.5 w-3.5" /> },
                { key: "timeline" as ViewTab, label: "Career Path", icon: <GitBranch className="h-3.5 w-3.5" /> },
              ]).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                    tab === t.key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div className="mt-3">
              {tab === "breadth" && <BreadthView cloud={cloud} />}
              {tab === "depth" && <DepthView cloud={cloud} expanded={expandedDomain} setExpanded={setExpandedDomain} />}
              {tab === "timeline" && <TimelineView cloud={cloud} />}
            </div>
          </div>

          {/* Differentiators */}
          <DifferentiatorsSection cloud={cloud} phase={phase} />

          {/* Growth Opportunities */}
          {cloud.gaps.length > 0 && (
            <div className={`transition-all duration-500 ${phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
              <SectionLabel text="Where to strengthen" />
              <div className="space-y-1.5">
                {cloud.gaps.map((gap) => (
                  <div key={gap.skillName} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    {gap.type === "missing"
                      ? <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />}
                    <div>
                      <span className="text-xs font-semibold text-amber-800 capitalize">{gap.skillName}</span>
                      <p className="text-[10px] text-amber-600 leading-tight">{gap.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CV sources */}
          {ok.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {ok.map((r) => (
                <span key={r.filename} className="inline-flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-[10px] text-green-700">
                  <CheckCircle2 className="h-2.5 w-2.5" /> {r.filename}
                </span>
              ))}
            </div>
          )}

          {/* Correction mechanism */}
          <CorrectionButton />

          <button onClick={onNext} className="h-10 w-full rounded-lg bg-brand-600 text-sm font-medium text-white hover:bg-brand-700">
            Continue to Socratic Questions
          </button>
        </>
      )}

      {/* Empty */}
      {!loading && !cloud && (
        <div className="py-6 text-center">
          <Cloud className="mx-auto h-10 w-10 text-zinc-300" />
          <p className="mt-3 text-sm text-zinc-500">No skills extracted yet.</p>
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
                <span className="text-[10px] text-zinc-400">
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
        <p className="text-xs text-zinc-500 text-center pt-1">
          <span className="font-semibold text-zinc-700">{domains.length} domain{domains.length !== 1 ? "s" : ""}</span> covering{" "}
          <span className="font-semibold text-zinc-700">
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

      <p className="text-xs text-zinc-500 text-center">
        <span className="font-semibold text-zinc-700">{domains.length} domains</span> covering{" "}
        <span className="font-semibold text-zinc-700">
          {domains.reduce((s, d) => s + d.categories.reduce((ss, c) => ss + c.skills.length, 0), 0)} skills
        </span>{" "}
        over <span className="font-semibold text-zinc-700">{cloud.careerSpan.years} years</span>
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
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-50/50"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors.hex }} />
              <span className={`flex-1 text-sm font-semibold ${colors.text}`}>{domain.displayName}</span>
              <span className="text-[10px] text-zinc-400 shrink-0">
                {total} skill{total !== 1 ? "s" : ""}{experts > 0 && ` \u00B7 ${experts} expert`}
              </span>
              {open ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
            </button>
            {open && (
              <div className="border-t border-zinc-100 px-3 pb-3 pt-2 space-y-3 bg-white/50">
                {domain.categories.map((cat) => (
                  <div key={cat.name}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{cat.displayName}</p>
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
              <span className="font-medium text-zinc-700 truncate flex-1" title={r.title}>{r.title}</span>
              <span className="text-zinc-400 shrink-0">{r.startYear}\u2013{isCurrent ? "now" : r.endYear}</span>
              <span className={`rounded px-1.5 py-0.5 text-[8px] font-medium ${colors.bg} ${colors.text}`}>
                {r.seniority.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-zinc-400 text-center">
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
        <p className="text-sm font-medium text-zinc-700">Building your Profile Cloud</p>
        <p className="text-xs text-zinc-400">Classifying domains, measuring depth...</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-lg bg-zinc-100 animate-pulse" />)}
      </div>
      <div className="mx-auto h-48 w-48 rounded-full bg-zinc-100 animate-pulse" />
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{text}</h3>;
}

function DetailCard({ icon, value, label, detail }: { icon: React.ReactNode; value: string; label: string; detail: string }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-indigo-50 via-white to-violet-50 border border-indigo-100/50 px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="text-indigo-500">{icon}</div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{label}</span>
      </div>
      <p className="mt-1 text-sm font-bold bg-gradient-to-r from-indigo-700 to-violet-700 bg-clip-text text-transparent">
        {value}
      </p>
      {detail && <p className="mt-0.5 text-[10px] text-zinc-500">{detail}</p>}
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
        className={`flex items-center gap-2 ${expandable ? "cursor-pointer hover:bg-zinc-50 -mx-1 px-1 rounded" : ""}`}
        onClick={expandable ? () => setExpanded(!expanded) : undefined}
      >
        {/* Depth level indicator (colored dot) */}
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: colors.hex, opacity: cfg.opacity }}
          title={cfg.label}
        />
        {/* Skill name — full width, no truncation */}
        <span className="min-w-0 flex-shrink text-xs font-medium text-zinc-700" title={skill.name}>
          {skill.name}
        </span>
        {/* Evidence summary — concise text */}
        <span className="ml-auto shrink-0 text-[10px] text-zinc-400 tabular-nums">
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
          skill.depth.level === "proficient" ? "bg-blue-50 text-blue-600" :
          skill.depth.level === "applied" ? "bg-zinc-100 text-zinc-600" :
          "bg-zinc-50 text-zinc-400"
        }`}>
          {cfg.label}
        </span>
        {expandable && (
          expanded
            ? <ChevronUp className="h-3 w-3 text-zinc-400 shrink-0" />
            : <ChevronDown className="h-3 w-3 text-zinc-400 shrink-0" />
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
        <div className="ml-4 mt-1 mb-2 space-y-1 border-l-2 border-zinc-100 pl-3">
          {skill.evidence.slice(0, 5).map((ev: EvidenceItem, i: number) => (
            <div key={i} className="text-[10px] text-zinc-500">
              {ev.type === "role" && (
                <span><span className="font-medium text-zinc-600">{ev.title}</span> at {ev.company} · {Math.round((ev.duration_months ?? 0) / 12)}yr</span>
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
          <span key={level} className="flex items-center gap-1 text-[9px] text-zinc-500">
            <span className={`h-2 w-2 rounded-full ${
              level === "expert" ? "bg-indigo-600" :
              level === "proficient" ? "bg-blue-400" :
              level === "applied" ? "bg-zinc-400" :
              "bg-zinc-200"
            }`} />
            {DEPTH_LEVELS[level].label}
          </span>
        ))}
      </div>
      {/* Badge legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <span className="flex items-center gap-1 text-[9px] text-zinc-400">
          <TrendingUp className="h-2.5 w-2.5 text-emerald-500" /> Impact
        </span>
        <span className="flex items-center gap-1 text-[9px] text-zinc-400">
          <Shield className="h-2.5 w-2.5 text-blue-500" /> Certified
        </span>
        <span className="flex items-center gap-1 text-[9px] text-zinc-400">
          <Award className="h-2.5 w-2.5 text-amber-500" /> Award
        </span>
        <span className="flex items-center gap-1 text-[9px] text-zinc-400">
          <FolderKanban className="h-2.5 w-2.5 text-violet-500" /> Project
        </span>
      </div>
      <p className="text-[8px] text-zinc-400">Bar = evidence strength · Click a skill to see its evidence chain</p>
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
    <div className="flex items-start gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <span className="text-[10px] font-semibold text-zinc-500">{label}</span>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {items.slice(0, 6).map((item) => (
            <span key={item} className="rounded bg-white px-1.5 py-0.5 text-[10px] text-zinc-700 border border-zinc-200">{item}</span>
          ))}
          {items.length > 6 && (
            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] text-zinc-400 border border-zinc-200">+{items.length - 6}</span>
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
  education,
  phase,
}: {
  cloud: ClassifiedCloud;
  education: Array<{ institution: string; degree: string; field: string }>;
  phase: number;
}) {
  // Core speciality: strongest domain's top skill (by score)
  const primaryDomain = cloud.domains[0];
  const topSkill = cloud.topSkills[0];
  const coreSpeciality = topSkill?.name ?? primaryDomain?.displayName ?? "Professional";

  // Career stage: infer from career span + role count
  const years = cloud.careerSpan.years;
  let careerStage = "Professional";
  if (years >= 15) careerStage = "Senior Professional";
  else if (years >= 8) careerStage = "Experienced Professional";
  else if (years >= 3) careerStage = "Mid-Career Professional";
  else careerStage = "Early-Career Professional";

  // Qualification country: extract from education institution names
  // Simple heuristic — look for known country keywords in institution names
  const institutionText = education.map((e) => e.institution).join(" ").toLowerCase();
  let qualCountry = "";
  if (/\b(pakistan|lahore|karachi|islamabad|peshawar|quetta|faisalabad|rawalpindi|multan)\b/i.test(institutionText)) qualCountry = "Pakistan";
  else if (/\b(india|delhi|mumbai|chennai|bangalore|kolkata|hyderabad|pune|aiims)\b/i.test(institutionText)) qualCountry = "India";
  else if (/\b(united kingdom|london|oxford|cambridge|manchester|birmingham|edinburgh|glasgow|leeds)\b/i.test(institutionText)) qualCountry = "United Kingdom";
  else if (/\b(united states|new york|california|texas|harvard|yale|stanford|mit|johns hopkins)\b/i.test(institutionText)) qualCountry = "United States";
  else if (/\b(saudi|riyadh|jeddah|dammam|ksu|kfupm)\b/i.test(institutionText)) qualCountry = "Saudi Arabia";
  else if (/\b(uae|dubai|abu dhabi|sharjah|ajman)\b/i.test(institutionText)) qualCountry = "UAE";
  else if (/\b(australia|sydney|melbourne|brisbane|perth|adelaide)\b/i.test(institutionText)) qualCountry = "Australia";
  else if (/\b(canada|toronto|vancouver|montreal|ottawa|calgary)\b/i.test(institutionText)) qualCountry = "Canada";
  else if (/\b(germany|berlin|munich|hamburg|frankfurt)\b/i.test(institutionText)) qualCountry = "Germany";
  else if (/\b(china|beijing|shanghai|guangzhou|tsinghua|peking)\b/i.test(institutionText)) qualCountry = "China";
  else if (/\b(japan|tokyo|osaka|kyoto)\b/i.test(institutionText)) qualCountry = "Japan";
  else if (/\b(south korea|seoul|busan|kaist)\b/i.test(institutionText)) qualCountry = "South Korea";
  else if (/\b(egypt|cairo|alexandria)\b/i.test(institutionText)) qualCountry = "Egypt";
  else if (/\b(nigeria|lagos|abuja|ibadan)\b/i.test(institutionText)) qualCountry = "Nigeria";
  else if (/\b(south africa|johannesburg|cape town|pretoria)\b/i.test(institutionText)) qualCountry = "South Africa";
  else if (/\b(philippines|manila|cebu|ateneo)\b/i.test(institutionText)) qualCountry = "Philippines";
  else if (/\b(bangladesh|dhaka|chittagong)\b/i.test(institutionText)) qualCountry = "Bangladesh";
  else if (/\b(sri lanka|colombo)\b/i.test(institutionText)) qualCountry = "Sri Lanka";
  else if (/\b(malaysia|kuala lumpur|penang)\b/i.test(institutionText)) qualCountry = "Malaysia";
  else if (/\b(iran|tehran|isfahan)\b/i.test(institutionText)) qualCountry = "Iran";
  else if (/\b(iraq|baghdad|erbil)\b/i.test(institutionText)) qualCountry = "Iraq";
  else if (/\b(jordan|amman)\b/i.test(institutionText)) qualCountry = "Jordan";
  else if (/\b(turkey|istanbul|ankara)\b/i.test(institutionText)) qualCountry = "Turkey";
  else if (/\b(qatar|doha)\b/i.test(institutionText)) qualCountry = "Qatar";
  else if (/\b(oman|muscat)\b/i.test(institutionText)) qualCountry = "Oman";
  else if (/\b(bahrain|manama)\b/i.test(institutionText)) qualCountry = "Bahrain";
  else if (/\b(kuwait)\b/i.test(institutionText)) qualCountry = "Kuwait";

  // Niche: certifications + instructor status
  const certSkills = cloud.topSkills.filter((s) => s.depth.hasCertification).map((s) => s.name);
  const niches = certSkills.slice(0, 3);

  return (
    <div className={`rounded-xl border border-indigo-100/50 bg-gradient-to-br from-indigo-50/50 via-white to-violet-50/50 p-3 shadow-sm transition-all duration-500 ${phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
          <User className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-zinc-900">{coreSpeciality}</p>
          <p className="text-[11px] text-zinc-500">{careerStage}{years > 0 ? ` · ${years} years` : ""}</p>
          {qualCountry && (
            <p className="text-[10px] text-zinc-400 mt-0.5">Qualified in {qualCountry}</p>
          )}
          {/* Education */}
          {education.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {education.map((ed, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[9px] font-medium text-blue-700">
                  <GraduationCap className="h-2.5 w-2.5" />
                  {ed.degree}{ed.field ? ` — ${ed.field}` : ""}
                </span>
              ))}
            </div>
          )}
          {/* Niche certifications */}
          {niches.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {niches.map((n) => (
                <span key={n} className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[9px] font-medium text-indigo-700">
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
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 py-2 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Something doesn&apos;t look right?
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2">
      <p className="text-xs font-medium text-zinc-700">Tell us what needs fixing</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="e.g., My speciality is Anesthesiology not ACLS, or I was a Registrar not a Junior..."
        className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 placeholder:text-zinc-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200 resize-none"
        rows={2}
      />
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!message.trim()}
          className="flex-1 rounded bg-indigo-600 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit
        </button>
        <button
          onClick={() => { setOpen(false); setMessage(""); }}
          className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-zinc-100 bg-zinc-50">
      <p className="text-sm text-zinc-400">{label}</p>
    </div>
  );
}
