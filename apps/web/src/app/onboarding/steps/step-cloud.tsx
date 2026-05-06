"use client";

import { useEffect, useState, useRef } from "react";
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  Briefcase,
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

interface ClassifiedSkill {
  name: string;
  domain: string;
  category: string;
  depth: DepthAssessment;
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
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState(0);
  const [tab, setTab] = useState<ViewTab>("breadth");
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const skipped = uploadResults.length === 0;

  // Phase 1: Conflict Resolution state
  const [conflicts, setConflicts] = useState<ConflictQuestion[]>([]);
  const [conflictsResolved, setConflictsResolved] = useState(false);
  const [stage, setStage] = useState<"loading" | "conflicts" | "cloud">("loading");

  useEffect(() => {
    if (skipped) { setLoading(false); setStage("cloud"); return; }
    const timer = setTimeout(async () => {
      try {
        // First check for conflicts from cross-CV analysis
        const conflictRes = await fetch("/api/cloud/conflicts");
        if (conflictRes.ok) {
          const conflictData = await conflictRes.json();
          if (conflictData.questions && conflictData.questions.length > 0) {
            setConflicts(conflictData.questions);
            setLoading(false);
            setStage("conflicts");
            return;
          }
        }
      } catch { /* no conflicts endpoint yet — proceed to Cloud */ }

      // No conflicts (or endpoint not ready) — go straight to Cloud
      try {
        const res = await fetch("/api/cloud");
        if (res.ok) {
          const data = await res.json();
          if (data.classified) setCloud(data.classified);
        }
      } catch { /* empty state */ }
      setLoading(false);
      setStage("cloud");
      setTimeout(() => setPhase(1), 150);
      setTimeout(() => setPhase(2), 400);
      setTimeout(() => setPhase(3), 700);
    }, 300);
    return () => clearTimeout(timer);
  }, [skipped]);

  // After conflicts are resolved, rebuild Cloud with corrections
  async function handleConflictsComplete(answers: ConflictAnswer[]) {
    setConflictsResolved(true);
    setLoading(true);
    setStage("loading");

    try {
      // Send answers to backend to correct the parsed CVs, then rebuild Cloud
      await fetch("/api/cloud/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      // Fetch the rebuilt Cloud
      const res = await fetch("/api/cloud");
      if (res.ok) {
        const data = await res.json();
        if (data.classified) setCloud(data.classified);
      }
    } catch { /* proceed with what we have */ }

    setLoading(false);
    setStage("cloud");
    setTimeout(() => setPhase(1), 150);
    setTimeout(() => setPhase(2), 400);
    setTimeout(() => setPhase(3), 700);
  }

  function handleConflictsSkip() {
    setConflictsResolved(true);
    // Build Cloud without corrections
    setStage("loading");
    setLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/cloud");
        if (res.ok) {
          const data = await res.json();
          if (data.classified) setCloud(data.classified);
        }
      } catch { /* empty state */ }
      setLoading(false);
      setStage("cloud");
      setTimeout(() => setPhase(1), 150);
      setTimeout(() => setPhase(2), 400);
      setTimeout(() => setPhase(3), 700);
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-4 py-3 text-white shadow-md">
        <h2 className="text-lg font-bold tracking-tight">Your Profile Cloud</h2>
        <p className="mt-0.5 text-xs text-indigo-100">
          {loading ? "Mapping evidence to skills..." : conflictsResolved ? "Updated with your corrections. Every skill backed by real evidence." : "Every skill backed by real roles, real impact."}
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
          {/* Stat cards */}
          <div className={`grid grid-cols-4 gap-2 transition-all duration-500 ${phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
            <StatCard icon={<Clock className="h-4 w-4" />} value={cloud.careerSpan.years} label="Years" />
            <StatCard icon={<Briefcase className="h-4 w-4" />} value={cloud.totalRoles} label="Roles" />
            <StatCard icon={<Layers className="h-4 w-4" />} value={cloud.domains.length} label="Domains" />
            <StatCard icon={<TrendingUp className="h-4 w-4" />} value={cloud.totalEvidencePoints} label="Evidence" />
          </div>

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

  // viewBox gives room for labels outside the radar
  const size = 380;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 100; // radius of outer ring
  const labelR = maxR + 32; // where labels go

  const maxScore = Math.max(1, ...domains.map((d) =>
    d.categories.reduce((s, c) => s + c.skills.reduce((ss, sk) => ss + sk.depth.score, 0), 0),
  ));

  const data = domains.map((d) => {
    const score = d.categories.reduce((s, c) => s + c.skills.reduce((ss, sk) => ss + sk.depth.score, 0), 0);
    const count = d.categories.reduce((s, c) => s + c.skills.length, 0);
    const experts = d.categories.reduce((s, c) => s + c.skills.filter((sk) => sk.depth.level === "expert").length, 0);
    return { ...d, norm: score / maxScore, count, experts };
  });

  const n = data.length;
  const step = (2 * Math.PI) / n;

  // Polygon points
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

          // Adjust text-anchor based on position
          const anchor = Math.abs(Math.cos(a)) < 0.3 ? "middle" : Math.cos(a) > 0 ? "start" : "end";

          return (
            <g key={d.name}>
              <circle cx={px} cy={py} r={5} fill={color} stroke="white" strokeWidth={2} />
              <text x={lx} y={ly - 5} textAnchor={anchor} fill="#374151" fontSize={10} fontWeight={600}>
                {d.displayName.length > 20 ? d.displayName.split(" & ")[0].split(",")[0] : d.displayName}
              </text>
              <text x={lx} y={ly + 8} textAnchor={anchor} fill="#9ca3af" fontSize={9}>
                {d.count} skill{d.count !== 1 ? "s" : ""}{d.experts > 0 ? ` \u00B7 ${d.experts} expert` : ""}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Summary line */}
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
      {/* Top skills */}
      <div>
        <SectionLabel text="Strongest evidence" />
        <div className="space-y-1">
          {cloud.topSkills.slice(0, 8).map((s) => (
            <SkillBar key={s.name} skill={s} />
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
                    <div className="space-y-0.5">
                      {cat.skills.map((s) => <SkillBar key={s.name} skill={s} />)}
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
// TAB 3: CAREER TIMELINE — horizontal swim lanes
// ============================================================

function TimelineView({ cloud }: { cloud: ClassifiedCloud }) {
  const roles = cloud.roles ?? [];
  if (roles.length === 0) return <EmptyTab label="No role timeline data" />;

  const minYear = cloud.careerSpan.startYear || roles[0]?.startYear || 2008;
  const maxYear = cloud.careerSpan.endYear || new Date().getFullYear();
  const span = Math.max(1, maxYear - minYear);

  return (
    <div className="space-y-3">
      {/* Year axis */}
      <div className="flex items-end">
        <div className="w-28 shrink-0" /> {/* spacer for labels */}
        <div className="relative flex-1 h-5">
          {/* Year markers */}
          {Array.from({ length: Math.min(span + 1, 20) }, (_, i) => {
            const y = minYear + Math.round(i * span / Math.min(span, 19));
            const pct = ((y - minYear) / span) * 100;
            return (
              <span key={y} className="absolute text-[9px] text-zinc-400 -translate-x-1/2" style={{ left: `${pct}%` }}>
                {y}
              </span>
            );
          })}
        </div>
      </div>

      {/* Role bars */}
      <div className="space-y-1.5">
        {roles.map((role, i) => {
          const left = ((role.startYear - minYear) / span) * 100;
          const width = Math.max(2, ((role.endYear - role.startYear) / span) * 100);
          const colors = dc(role.domain);
          const isCurrent = role.endYear >= new Date().getFullYear();

          return (
            <div key={i} className="flex items-center gap-0">
              {/* Role label */}
              <div className="w-28 shrink-0 pr-2 text-right">
                <p className="text-[10px] font-medium text-zinc-700 truncate leading-tight" title={role.title}>{role.title}</p>
                <p className="text-[9px] text-zinc-400 truncate leading-tight" title={role.company}>{role.company}</p>
              </div>
              {/* Bar track */}
              <div className="relative flex-1 h-6 rounded bg-zinc-50 border border-zinc-100">
                <div
                  className="absolute top-0.5 bottom-0.5 rounded"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: colors.hex,
                    opacity: 0.8,
                  }}
                />
                {isCurrent && (
                  <div
                    className="absolute top-1 h-3 w-3 rounded-full border-2 border-white animate-pulse"
                    style={{
                      left: `${left + width - 1.5}%`,
                      backgroundColor: colors.hex,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Domain legend */}
      <div className="flex flex-wrap gap-2 pt-1">
        {cloud.domains.map((d) => (
          <span key={d.name} className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dc(d.name).hex }} />
            {d.displayName}
          </span>
        ))}
      </div>

      <p className="text-[10px] text-zinc-400 text-center">
        {roles.length} role{roles.length !== 1 ? "s" : ""} spanning{" "}
        {cloud.careerSpan.startYear}\u2013{cloud.careerSpan.endYear}
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

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-gradient-to-br from-indigo-50 via-white to-violet-50 border border-indigo-100/50 px-2 py-2.5 text-center shadow-sm">
      <div className="text-indigo-500">{icon}</div>
      <span className="mt-0.5 text-lg font-bold bg-gradient-to-r from-indigo-700 to-violet-700 bg-clip-text text-transparent">
        {value}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{label}</span>
    </div>
  );
}

function SkillBar({ skill }: { skill: ClassifiedSkill }) {
  const colors = dc(skill.domain);
  const cfg = DEPTH_LEVELS[skill.depth.level];
  const years = Math.round(skill.depth.totalMonths / 12);
  const barPct = Math.max(6, (skill.depth.score / 100) * cfg.pct);

  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 truncate text-xs font-medium text-zinc-700" title={skill.name}>
        {skill.name}
      </span>
      <div className={`relative flex-1 h-4 rounded-full ${colors.barBg} overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
          style={{ width: `${barPct}%`, opacity: cfg.opacity }}
        />
        {/* Labels inside the bar only if there's room */}
        {barPct > 20 && (
          <span className="absolute inset-0 flex items-center px-2 text-[8px] font-medium text-white drop-shadow-sm">
            {years > 0 && `${years}yr`}
            {years > 0 && skill.depth.roleCount > 0 && " \u00B7 "}
            {skill.depth.roleCount > 0 && `${skill.depth.roleCount} role${skill.depth.roleCount > 1 ? "s" : ""}`}
            {skill.depth.hasImpact && " \u00B7 impact"}
          </span>
        )}
      </div>
      {/* Badges */}
      <div className="flex shrink-0 gap-0.5">
        {skill.depth.hasCertification && <Badge icon={<Shield className="h-2.5 w-2.5 text-blue-600" />} bg="bg-blue-100" title="Certified" />}
        {skill.depth.hasAward && <Badge icon={<Award className="h-2.5 w-2.5 text-amber-600" />} bg="bg-amber-100" title="Award" />}
        {skill.depth.hasProject && <Badge icon={<FolderKanban className="h-2.5 w-2.5 text-violet-600" />} bg="bg-violet-100" title="Project" />}
      </div>
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
    <div className="mt-2 flex gap-3">
      {(["expert", "proficient", "applied", "mentioned"] as const).map((level) => (
        <span key={level} className="flex items-center gap-1 text-[9px] text-zinc-500">
          <span className="h-1.5 w-5 rounded-full bg-indigo-500" style={{ opacity: DEPTH_LEVELS[level].opacity }} />
          {DEPTH_LEVELS[level].label}
        </span>
      ))}
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

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-zinc-100 bg-zinc-50">
      <p className="text-sm text-zinc-400">{label}</p>
    </div>
  );
}
