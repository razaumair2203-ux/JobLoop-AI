"use client";

import { useState, useEffect } from "react";
import { Cloud, Filter, Upload, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

// Types matching ClassifiedCloud from packages/ai/src/taxonomy.ts
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

interface Evidence {
  type: "role" | "impact" | "certification" | "award" | "project" | "education" | "workshop" | "publication" | "socratic";
  // role
  company?: string;
  title?: string;
  duration_months?: number;
  context?: string;
  start_date?: string;
  end_date?: string;
  // impact
  description?: string;
  source_role?: string;
  metric?: string | null;
  // certification / award / workshop / publication
  name?: string;
  issuer?: string;
  year?: number | null;
  active?: boolean;
  // project
  url?: string | null;
  is_professional?: boolean;
  // education
  institution?: string;
  degree?: string;
  field?: string;
  relevance?: string;
  // workshop
  provider?: string;
  // publication
  venue?: string;
  peer_reviewed?: boolean;
  // socratic
  question?: string;
  answer?: string;
  date?: string;
  triggered_by?: string | null;
}

interface ClassifiedSkill {
  name: string;
  domain: string;
  category: string;
  depth: DepthAssessment;
  evidence: Evidence[];
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

interface ClassifiedCloud {
  domains: TaxonomyDomain[];
  topSkills: ClassifiedSkill[];
  roles: ClassifiedRole[];
  careerSpan: { startYear: number; endYear: number; years: number };
  totalRoles: number;
  totalEvidencePoints: number;
  gaps: SkillGap[];
}

// Depth level → display
const depthConfig = {
  expert: { label: "Expert", color: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
  proficient: { label: "Proficient", color: "bg-sky-500", badge: "bg-sky-50 text-sky-700" },
  applied: { label: "Applied", color: "bg-violet-500", badge: "bg-violet-50 text-violet-700" },
  mentioned: { label: "Mentioned", color: "bg-amber-500", badge: "bg-amber-50 text-amber-700" },
};

export default function CloudPage() {
  const [cloud, setCloud] = useState<ClassifiedCloud | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cloud")
      .then((r) => r.json())
      .then((data) => {
        setCloud(data.classified ?? null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!cloud) return <EmptyState />;

  // Flatten all skills for grid view
  const allSkills: ClassifiedSkill[] = cloud.domains.flatMap((d) =>
    d.categories.flatMap((c) => c.skills)
  );

  // Get unique domains for filter
  const domains = ["All", ...cloud.domains.map((d) => d.displayName)];

  const filtered =
    activeFilter === "All"
      ? allSkills
      : allSkills.filter((s) => s.domain === activeFilter || cloud.domains.find(d => d.displayName === activeFilter)?.name === s.domain);

  // Stats
  const expertCount = allSkills.filter((s) => s.depth.level === "expert").length;
  const proficientCount = allSkills.filter((s) => s.depth.level === "proficient").length;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Profile Cloud</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Your skills, backed by evidence — {cloud.careerSpan.years} years across {cloud.totalRoles} roles
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 flex gap-4">
        <StatCard value={allSkills.length} label="Total skills" />
        <StatCard value={expertCount} label="Expert depth" color="text-emerald-600" />
        <StatCard value={proficientCount} label="Proficient" color="text-sky-600" />
        <StatCard value={cloud.totalEvidencePoints} label="Evidence points" />
        <StatCard value={cloud.gaps.length} label="Gaps detected" color={cloud.gaps.length > 0 ? "text-amber-600" : "text-zinc-900"} />
      </div>

      {/* Domain filter */}
      <div className="mt-6 flex items-center gap-2">
        <Filter className="h-4 w-4 text-zinc-400" />
        {domains.map((domain) => (
          <button
            key={domain}
            onClick={() => setActiveFilter(domain)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === domain
                ? "bg-brand-50 text-brand-700"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {domain}
          </button>
        ))}
      </div>

      {/* Skill Grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((skill) => (
          <SkillCard
            key={`${skill.domain}-${skill.name}`}
            skill={skill}
            expanded={expandedSkill === `${skill.domain}-${skill.name}`}
            onToggle={() =>
              setExpandedSkill(
                expandedSkill === `${skill.domain}-${skill.name}`
                  ? null
                  : `${skill.domain}-${skill.name}`
              )
            }
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16 flex flex-col items-center text-center">
          <Cloud className="h-12 w-12 text-zinc-300" />
          <p className="mt-3 text-sm font-medium text-zinc-500">No skills in this domain</p>
        </div>
      )}

      {/* Gaps section */}
      {cloud.gaps.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">Detected Gaps</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Skills your career suggests but your Cloud lacks depth on
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cloud.gaps.map((gap) => (
              <div
                key={gap.skillName}
                className="rounded-xl border border-amber-200 bg-amber-50/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900">{gap.skillName}</h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    {gap.type}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-600">{gap.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Career Timeline */}
      {cloud.roles.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">Career Timeline</h2>
          <div className="mt-4 space-y-2">
            {cloud.roles.map((role, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3">
                <div className="flex-shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-500">
                  {role.startYear}–{role.endYear}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">{role.title}</p>
                  <p className="text-xs text-zinc-500">{role.company} · {role.domain} · {role.durationMonths}mo</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function SkillCard({
  skill,
  expanded,
  onToggle,
}: {
  skill: ClassifiedSkill;
  expanded: boolean;
  onToggle: () => void;
}) {
  const config = depthConfig[skill.depth.level];
  const maxMonths = 120; // 10 years
  const barWidth = Math.min((skill.depth.totalMonths / maxMonths) * 100, 100);

  return (
    <div
      className="cursor-pointer rounded-xl border border-zinc-200 bg-white p-4 transition-shadow hover:shadow-md hover:border-brand-200"
      onClick={onToggle}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">{skill.name}</h3>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            {skill.category}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${config.badge}`}>
          {config.label}
        </span>
      </div>

      {/* Duration bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span>{skill.depth.roleCount} role{skill.depth.roleCount !== 1 ? "s" : ""} · {skill.depth.totalMonths}mo</span>
          <span>{skill.evidence.length} evidence</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full ${config.color} transition-all`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* Depth indicators */}
      <div className="mt-2 flex flex-wrap gap-1">
        {skill.depth.hasImpact && <DepthPill label="Impact" />}
        {skill.depth.hasCertification && <DepthPill label="Certified" />}
        {skill.depth.hasProject && <DepthPill label="Project" />}
        {skill.depth.hasAward && <DepthPill label="Award" />}
      </div>

      {/* Expanded evidence */}
      {expanded && skill.evidence.length > 0 && (
        <div className="mt-3 border-t border-zinc-100 pt-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            Evidence chain
          </p>
          <div className="space-y-2">
            {skill.evidence.map((ev, i) => (
              <div key={i} className="text-xs text-zinc-600">
                <span className="font-medium text-zinc-700">{ev.type}</span>
                {ev.type === "role" && (
                  <>
                    <span className="text-zinc-400"> · {ev.company}{ev.title ? ` — ${ev.title}` : ""}</span>
                    {ev.duration_months != null && <span className="text-zinc-400"> · {ev.duration_months}mo</span>}
                    {ev.context && <p className="mt-0.5 text-zinc-500">{ev.context}</p>}
                  </>
                )}
                {ev.type === "impact" && (
                  <>
                    {ev.source_role && <span className="text-zinc-400"> · {ev.source_role}</span>}
                    {ev.description && <p className="mt-0.5 text-zinc-500">{ev.description}</p>}
                    {ev.metric && <p className="mt-0.5 font-medium text-emerald-700">{ev.metric}</p>}
                  </>
                )}
                {ev.type === "certification" && (
                  <span className="text-zinc-400"> · {ev.name}{ev.issuer ? ` (${ev.issuer})` : ""}{ev.year ? `, ${ev.year}` : ""}</span>
                )}
                {ev.type === "award" && (
                  <>
                    <span className="text-zinc-400"> · {ev.name}{ev.issuer ? ` — ${ev.issuer}` : ""}</span>
                    {ev.context && <p className="mt-0.5 text-zinc-500">{ev.context}</p>}
                  </>
                )}
                {ev.type === "project" && (
                  <>
                    <span className="text-zinc-400"> · {ev.name}{ev.is_professional ? " (work)" : " (personal)"}</span>
                    {ev.description && <p className="mt-0.5 text-zinc-500">{ev.description}</p>}
                  </>
                )}
                {ev.type === "education" && (
                  <span className="text-zinc-400"> · {ev.degree} in {ev.field}{ev.institution ? `, ${ev.institution}` : ""}</span>
                )}
                {ev.type === "workshop" && (
                  <span className="text-zinc-400"> · {ev.name}{ev.provider ? ` (${ev.provider})` : ""}{ev.year ? `, ${ev.year}` : ""}</span>
                )}
                {ev.type === "publication" && (
                  <>
                    <span className="text-zinc-400"> · {ev.title}{ev.venue ? ` — ${ev.venue}` : ""}{ev.year ? `, ${ev.year}` : ""}</span>
                    {ev.peer_reviewed && <span className="ml-1 rounded bg-emerald-50 px-1 py-0.5 text-[10px] text-emerald-600">peer-reviewed</span>}
                  </>
                )}
                {ev.type === "socratic" && (
                  <>
                    {ev.question && <p className="mt-0.5 italic text-zinc-500">Q: {ev.question}</p>}
                    {ev.answer && <p className="mt-0.5 text-zinc-600">A: {ev.answer}</p>}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expand hint */}
      <div className="mt-2 flex justify-center">
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-zinc-300" />
        ) : (
          <ChevronRight className="h-3 w-3 text-zinc-300" />
        )}
      </div>
    </div>
  );
}

function DepthPill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">
      {label}
    </span>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-5 py-3">
      <p className={`text-2xl font-semibold ${color || "text-zinc-900"}`}>{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 rounded bg-zinc-200" />
      <div className="mt-2 h-4 w-72 rounded bg-zinc-100" />
      <div className="mt-6 flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 w-28 rounded-xl bg-zinc-100" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-36 rounded-xl bg-zinc-100" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <Cloud className="h-12 w-12 text-red-300" />
      <p className="mt-3 text-sm font-medium text-red-600">Failed to load Cloud</p>
      <p className="mt-1 text-xs text-zinc-500">{message}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <Upload className="h-12 w-12 text-zinc-300" />
      <p className="mt-3 text-sm font-medium text-zinc-700">No Profile Cloud yet</p>
      <p className="mt-1 text-sm text-zinc-500">
        Upload your CV to build your evidence-backed skill profile
      </p>
      <Link
        href="/onboarding"
        className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Get started
      </Link>
    </div>
  );
}
