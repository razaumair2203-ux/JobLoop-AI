"use client";

import { useEffect, useState, useRef } from "react";
import { Award, MapPin, GraduationCap, Clock, User, Briefcase, BarChart3, FileCheck, Globe } from "lucide-react";
import type { CloudIdentity, CloudStats, CloudSkillNode, CloudTrajectoryRole } from "./types";

// Domain → glow color mapping (subset of career-path colors, used for personalized glow)
const DOMAIN_GLOW: Record<string, string> = {
  healthcare: "rgba(99,102,241,0.25)", clinical: "rgba(99,102,241,0.25)", medical: "rgba(99,102,241,0.25)",
  technology: "rgba(6,182,212,0.25)", software: "rgba(6,182,212,0.25)",
  engineering: "rgba(245,158,11,0.25)", aerospace: "rgba(245,158,11,0.25)",
  finance: "rgba(16,185,129,0.25)", banking: "rgba(16,185,129,0.25)",
  education: "rgba(139,92,246,0.25)", management: "rgba(236,72,153,0.25)",
  defense: "rgba(100,116,139,0.25)", military: "rgba(100,116,139,0.25)",
  consulting: "rgba(244,63,94,0.25)", research: "rgba(20,184,166,0.25)",
};

function getDomainGlow(domains: Set<string>): string {
  for (const d of domains) {
    const lower = d.toLowerCase();
    for (const [key, color] of Object.entries(DOMAIN_GLOW)) {
      if (lower.includes(key)) return color;
    }
  }
  return "rgba(99,102,241,0.25)"; // default indigo
}

interface IdentityCardProps {
  identity: CloudIdentity;
  stats: CloudStats;
  roles?: CloudTrajectoryRole[];
  nodes?: CloudSkillNode[];
  animate?: boolean;
}

export function IdentityCard({ identity, stats, roles, nodes, animate = true }: IdentityCardProps) {
  const [phase, setPhase] = useState(animate ? 0 : 4);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!animate || hasAnimated.current) {
      setPhase(4);
      return;
    }
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => {
        setPhase(4);
        hasAnimated.current = true;
      }, 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [animate]);

  const summaryLine = buildNarrativeSummary(identity, stats, roles, nodes);
  const initials = getInitials(identity.name);

  // Derive primary domain for personalized glow
  const userDomains = new Set<string>();
  if (roles) {
    for (const r of roles) {
      if (r.domain) userDomains.add(r.domain);
    }
  }
  const glowColor = getDomainGlow(userDomains);

  return (
    <div
      className="relative overflow-hidden rounded-2xl text-white p-6 sm:p-8 shadow-2xl dark:ring-1 dark:ring-surface-border antialiased animate-gradient"
      style={{ background: "linear-gradient(135deg, #18181b 0%, #1e1b2e 25%, #27272a 50%, #1b2e1e 75%, #18181b 100%)" }}
      role="region"
      aria-label={`Professional profile for ${identity.name || "user"}`}
    >
      {/* Personalized glow effects — color adapts to user's primary domain */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" style={{ backgroundColor: glowColor }} />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" style={{ backgroundColor: glowColor }} />

      <div className="relative z-10 space-y-5">
        {/* Name + Avatar */}
        <div className={`transition-all duration-700 ease-out ${phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full bg-brand-600/30 border-2 border-brand-400/40 flex items-center justify-center shrink-0">
              {initials ? (
                <span className="text-lg font-bold text-brand-200">{initials}</span>
              ) : (
                <User size={24} className="text-brand-300" />
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight truncate min-w-0">
              {identity.name || "Your Profile"}
            </h2>
          </div>
        </div>

        {/* Core Profession — hide generic "Professional" fallback */}
        <div className={`transition-all duration-700 ease-out ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          {identity.core_profession && identity.core_profession !== "Professional" && (
            <p className="text-base sm:text-lg font-semibold text-brand-300 tracking-wide">
              {identity.core_profession}
            </p>
          )}
          {identity.specializations.length > 0 && (
            <p className="text-sm text-surface-text-muted mt-1">
              {identity.specializations.join(" \u00b7 ")}
            </p>
          )}
        </div>

        {/* Narrative Summary */}
        <div className={`transition-all duration-1000 ease-out ${phase >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="text-surface-text-muted text-sm leading-relaxed italic">
            {summaryLine}
          </p>
        </div>

        {/* Qualifications + Differentiators + Stats */}
        <div className={`transition-all duration-700 ease-out ${phase >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          {/* Qualifications Row */}
          {(identity.qualification_degrees.length > 0 || identity.qualification_country) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {identity.qualification_degrees.map((deg) => (
                <span key={deg} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-3/50 text-sm text-zinc-200 border border-surface-border/30">
                  <GraduationCap size={14} className="text-surface-text-muted shrink-0" />
                  {deg}
                </span>
              ))}
              {identity.qualification_country && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-3/50 text-sm text-zinc-200 border border-surface-border/30">
                  <MapPin size={14} className="text-surface-text-muted shrink-0" />
                  {identity.qualification_country}
                </span>
              )}
            </div>
          )}

          {/* Differentiators */}
          {identity.niche_differentiators.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {identity.niche_differentiators.map((d) => (
                <span key={d} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-700/20 text-sm text-brand-200 border border-brand-700/30">
                  <Award size={14} className="text-surface-text-muted shrink-0" />
                  {d}
                </span>
              ))}
            </div>
          )}

          {/* Stats — hero metric + supporting grid (Vercel pattern) */}
          <div className="mt-4 space-y-3">
            {/* Hero stat: Experience */}
            <div className="bg-surface-3/30 rounded-xl px-4 py-3 border border-surface-border/20">
              <dl>
                <dt className="sr-only">Experience</dt>
                <dd className="flex items-center gap-2">
                  <Clock size={20} className="text-surface-text-muted shrink-0" />
                  <span className="text-2xl font-bold text-white tabular-nums">{stats.years}</span>
                  <span className="text-sm text-surface-text-muted">years of experience</span>
                </dd>
              </dl>
            </div>
            {/* Supporting stats */}
            <dl className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              <StatChip label="Roles" value={stats.roles} icon={<Briefcase size={14} className="text-surface-text-muted" />} />
              <StatChip label="Skills" value={stats.skills} icon={<BarChart3 size={14} className="text-surface-text-muted" />} />
              <StatChip label="Proof Points" value={stats.evidencePoints} icon={<FileCheck size={14} className="text-surface-text-muted" />} />
              {stats.domains > 1 && (
                <StatChip label="Industries" value={stats.domains} icon={<Globe size={14} className="text-surface-text-muted" />} />
              )}
              {stats.certCount > 0 && (
                <StatChip label="Credentials" value={stats.certCount} icon={<Award size={14} className="text-surface-text-muted" />} />
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  const formatted = value >= 1000 ? value.toLocaleString() : String(value);
  return (
    <div className="bg-surface-3/30 rounded-lg px-2.5 py-1.5 text-center border border-surface-border/20">
      <dt className="sr-only">{label}</dt>
      <dd>
        <div className="flex items-center justify-center gap-1">
          {icon}
          <span className="text-base font-bold text-white tabular-nums">{formatted}</span>
        </div>
        <span className="text-[10px] text-surface-text-muted uppercase tracking-wide">{label}</span>
      </dd>
    </div>
  );
}

function getInitials(name: string): string {
  if (!name) return "";
  const cleaned = name.replace(/^(Dr\.?|Mr\.?|Mrs\.?|Ms\.?|Prof\.?)\s+/i, "").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0]?.toUpperCase() ?? "";
}

function buildNarrativeSummary(
  identity: CloudIdentity,
  stats: CloudStats,
  roles?: CloudTrajectoryRole[],
  nodes?: CloudSkillNode[],
): string {
  if (stats.years === 0 && stats.roles === 0) {
    return "Your professional profile is being built.";
  }

  const companies = new Set<string>();
  const domains = new Set<string>();
  if (roles) {
    for (const r of roles) {
      if (r.company) {
        const short = r.company.split(/[,&]/)[0].trim();
        if (short.length <= 30) companies.add(short);
      }
      if (r.domain) domains.add(r.domain.replace(/_/g, " "));
    }
  }

  const parts: string[] = [];

  const domainPhrase = domains.size > 0
    ? Array.from(domains).slice(0, 2).join(" and ")
    : identity.core_profession.toLowerCase();
  if (stats.years > 0) {
    parts.push(`${stats.years} years in ${domainPhrase}`);
  }

  if (companies.size >= 3) {
    const companyList = Array.from(companies).slice(0, 3);
    parts.push(`across ${companyList.join(", ")}${companies.size > companyList.length ? ` and ${companies.size - companyList.length} more` : ""}`);
  } else if (stats.roles > 1) {
    parts.push(`across ${stats.roles} roles`);
  }

  const topSkills = nodes
    ?.filter(n => n.tier === "core_skill")
    .sort((a, b) => b.evidence.length - a.evidence.length)
    .slice(0, 2)
    .map(n => n.name);
  if (topSkills && topSkills.length > 0) {
    parts.push(`with deep expertise in ${topSkills.join(" and ")}`);
  } else if (stats.certCount > 0) {
    parts.push(`backed by ${stats.certCount} professional credential${stats.certCount > 1 ? "s" : ""}`);
  }

  if (parts.length === 0) {
    return `${identity.core_profession} with ${stats.evidencePoints} evidence points across ${stats.skills} skills.`;
  }

  return parts.join(" \u2014 ") + ".";
}
