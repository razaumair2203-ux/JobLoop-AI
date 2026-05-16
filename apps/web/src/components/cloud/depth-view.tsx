"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Inbox, Search, X } from "lucide-react";
import type { CloudSkillNode, NodeTier, CloudEvidence } from "./types";

interface DepthViewProps {
  nodes: CloudSkillNode[];
}

const TIER_LABELS: Record<NodeTier, string> = {
  core_skill: "Core Skills",
  certification: "Certifications",
  education: "Education & Qualifications",
  license: "Licenses",
  voluntary: "Additional Training",
};

const TIER_ORDER: NodeTier[] = ["core_skill", "certification", "education", "license", "voluntary"];

const depthOrder: Record<string, number> = { expert: 4, proficient: 3, applied: 2, mentioned: 1 };

export function DepthView({ nodes }: DepthViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    if (!nodes || nodes.length === 0) return new Map<NodeTier, CloudSkillNode[]>();

    const query = search.toLowerCase().trim();
    const filtered = query
      ? nodes.filter(n =>
          n.name.toLowerCase().includes(query) ||
          n.evidence.some(e =>
            (e.company ?? "").toLowerCase().includes(query) ||
            (e.title ?? "").toLowerCase().includes(query) ||
            (e.issuer ?? "").toLowerCase().includes(query) ||
            (e.name ?? "").toLowerCase().includes(query) ||
            (e.description ?? "").toLowerCase().includes(query) ||
            (typeof e.context === "string" ? e.context.toLowerCase().includes(query) : false)
          )
        )
      : nodes;

    const g = new Map<NodeTier, CloudSkillNode[]>();

    for (const node of filtered) {
      const tier = node.tier ?? "core_skill";
      if (!g.has(tier)) g.set(tier, []);
      g.get(tier)!.push(node);
    }

    for (const [, tierNodes] of g) {
      tierNodes.sort((a, b) => {
        const aLevel = depthOrder[a.depth?.level ?? "mentioned"] ?? 0;
        const bLevel = depthOrder[b.depth?.level ?? "mentioned"] ?? 0;
        if (bLevel !== aLevel) return bLevel - aLevel;
        if (b.evidence.length !== a.evidence.length) return b.evidence.length - a.evidence.length;
        return (b.summary.total_months_used ?? 0) - (a.summary.total_months_used ?? 0);
      });
    }

    return g;
  }, [nodes, search]);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="text-center py-12 text-surface-text-muted">
        <Inbox size={40} className="mx-auto mb-3 text-surface-text-muted" />
        <p className="text-sm">Upload a CV to see your expertise map.</p>
      </div>
    );
  }

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleNodes = Array.from(grouped.values()).flat();
  const allExpanded = visibleNodes.length > 0 && visibleNodes.every(n => expandedNodes.has(n.id));
  const toggleAll = () => {
    if (allExpanded) {
      setExpandedNodes(new Set());
    } else {
      setExpandedNodes(new Set(visibleNodes.map(n => n.id)));
    }
  };

  const totalFiltered = Array.from(grouped.values()).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="space-y-6">
      {/* Search + legend + controls */}
      <div className="space-y-3">
        {/* Search bar — only show when 8+ skills (worth filtering) */}
        {nodes.length >= 8 && (
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skills, companies, roles..."
              className="w-full rounded-lg border border-surface-border bg-surface-0 py-2 pl-9 pr-8 text-sm text-surface-text placeholder:text-surface-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-text-muted hover:text-surface-text transition-colors focus-ring rounded"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
        {search && (
          <p className="text-xs text-surface-text-muted">
            {totalFiltered} result{totalFiltered !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
          </p>
        )}
        {/* Inline legend + controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-surface-text-muted">
            <span className="flex items-center gap-1"><span className="w-2.5 h-1.5 rounded-sm bg-indigo-500 dark:bg-indigo-400 inline-block" /> Roles</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-1.5 rounded-sm bg-amber-400 dark:bg-amber-300 inline-block" /> Certs</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-1.5 rounded-sm bg-emerald-500 dark:bg-emerald-400 inline-block" /> Impact</span>
            <span className="text-surface-text-muted">|</span>
            <span className="flex items-center gap-1"><span className="px-1.5 py-px rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium">Expert</span> → <span className="px-1.5 py-px rounded-full bg-surface-2 text-surface-text-muted text-[10px]">Mentioned</span></span>
          </div>
          <button
            onClick={toggleAll}
            className="text-xs text-surface-text-muted hover:text-surface-text-secondary transition-colors focus-ring rounded px-2 py-1"
          >
            {allExpanded ? "Collapse all" : "Expand all"}
        </button>
        </div>
      </div>

      {TIER_ORDER.map((tier) => {
        const tierNodes = grouped.get(tier);
        if (!tierNodes || tierNodes.length === 0) return null;

        return (
          <div key={tier}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xs font-medium text-surface-text-muted uppercase tracking-wider">{TIER_LABELS[tier]}</h3>
              <span className="text-[11px] text-surface-text-muted">{tierNodes.length}</span>
              <div className="flex-1 h-px bg-surface-2" />
            </div>

            <div className="space-y-0.5">
              {tierNodes.map((node, i) => (
                <div
                  key={node.id}
                  className="animate-enter"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <SkillRow
                    node={node}
                    expanded={expandedNodes.has(node.id)}
                    onToggle={() => toggleNode(node.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Depth criteria — single compact line, not a 3-section manual */}
      <div className="border-t border-surface-border pt-3 mt-2">
        <p className="text-[11px] text-surface-text-muted leading-relaxed">
          <span className="font-medium text-surface-text-muted">How depth is determined:</span>{" "}
          Expert = 3+ roles, 5+ years, plus credential or impact &middot; Proficient = 2+ roles or 2+ years &middot; Applied = used in one role &middot; Mentioned = listed but not linked to a role
        </p>
      </div>
    </div>
  );
}

function SkillRow({
  node,
  expanded,
  onToggle,
}: {
  node: CloudSkillNode;
  expanded: boolean;
  onToggle: () => void;
}) {
  const depth = node.depth;
  const depthLevel = depth?.level ?? "mentioned";
  const isExpert = depthLevel === "expert";
  const isMentioned = depthLevel === "mentioned";
  const roleEvidence = node.evidence.filter((e) => e.type === "role");
  const certEvidence = node.evidence.filter((e) => e.type === "certification");
  const impactEvidence = node.evidence.filter((e) => e.type === "impact");
  const otherEvidence = node.evidence.filter((e) => !["role", "certification", "impact"].includes(e.type));
  const totalEvidence = node.evidence.length;

  // Summary + recency — computed but shown only in expanded section
  const lastUsed = node.summary.last_used;
  const recencyLabel = getRecencyLabel(lastUsed);
  const roles = node.summary.number_of_roles;
  const months = node.summary.total_months_used;
  const durationStr = months > 0
    ? months < 12 ? `${months}mo` : `${Math.round(months / 12)}y`
    : "";
  const summaryParts: string[] = [];
  if (roles > 0) summaryParts.push(`${roles} role${roles > 1 ? "s" : ""}`);
  if (durationStr) summaryParts.push(durationStr);
  if (node.summary.has_impact) summaryParts.push("impact");
  if (recencyLabel) summaryParts.push(recencyLabel);
  const summaryText = summaryParts.join(" · ");

  // Visual: expert = semibold, mentioned = dimmed, everything else = uniform
  const rowOpacity = isMentioned ? "opacity-60" : "";
  const nameClass = isExpert
    ? "text-sm font-semibold text-surface-text"
    : "text-sm font-medium text-surface-text-secondary";
  const accentBorder = isExpert
    ? "border-l-2 border-indigo-500 dark:border-indigo-400 pl-2.5"
    : "";

  return (
    <div className={`group ${rowOpacity}`}>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${node.name} — ${depthLevel}. ${expanded ? "Collapse" : "Expand"} details.`}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-2 active:bg-surface-3 transition-colors text-left focus-ring ${accentBorder}`}
      >
        {/* 1. Skill name */}
        <span className={`${nameClass} min-w-0 w-[140px] sm:w-[180px] shrink-0 break-words leading-tight`}>
          {node.name}
        </span>

        {/* 2. Evidence bar — full width, proportion only */}
        <div className="flex-1 min-w-[60px]">
          {totalEvidence > 0 ? (
            <EvidenceBar
              roleCount={roleEvidence.length}
              certCount={certEvidence.length}
              impactCount={impactEvidence.length}
              otherCount={otherEvidence.length}
            />
          ) : (
            <span className="text-[11px] text-surface-text-muted italic">No evidence linked yet</span>
          )}
        </div>

        {/* 3. Depth badge */}
        {depth && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full shrink-0 capitalize ${depthColor(depth.level)}`}
            title={depthTooltip(depth.level)}
          >
            {depth.level}
          </span>
        )}

        {/* 4. Chevron */}
        {totalEvidence > 0 && (
          <span className="text-surface-text-muted group-hover:text-surface-text-secondary transition-colors shrink-0" aria-hidden="true">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </button>

      {/* Expanded: summary line + evidence details */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded && totalEvidence > 0 ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="ml-4 sm:ml-[140px] pl-3 border-l border-surface-border mb-2 py-1 space-y-1.5">
            {/* Summary line — always visible when expanded */}
            {summaryText && (
              <div className="text-[11px] text-surface-text-muted tabular-nums mb-1">
                {summaryText}
              </div>
            )}
            {roleEvidence.map((ev, i) => (
              <EvidenceDetail key={`role-${i}`} evidence={ev} type="role" />
            ))}
            {impactEvidence.map((ev, i) => (
              <EvidenceDetail key={`impact-${i}`} evidence={ev} type="impact" />
            ))}
            {certEvidence.map((ev, i) => (
              <EvidenceDetail key={`cert-${i}`} evidence={ev} type="cert" />
            ))}
            {otherEvidence.map((ev, i) => (
              <EvidenceDetail key={`other-${i}`} evidence={ev} type="other" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceBar({
  roleCount,
  certCount,
  impactCount,
  otherCount,
}: {
  roleCount: number;
  certCount: number;
  impactCount: number;
  otherCount: number;
}) {
  const total = roleCount + certCount + impactCount + otherCount;
  if (total === 0) return <div className="h-3 w-full rounded-full bg-surface-2" />;

  // Single encoding: segments show proportion of evidence types. Full width always.
  return (
    <div
      className="h-3 w-full rounded-full bg-surface-2 overflow-hidden flex"
      role="img"
      aria-label={`${total} evidence: ${roleCount} roles, ${certCount} certs, ${impactCount} impact`}
    >
      {roleCount > 0 && (
        <div
          className="bg-indigo-500 dark:bg-indigo-400 h-full"
          style={{ width: `${(roleCount / total) * 100}%` }}
        />
      )}
      {certCount > 0 && (
        <div
          className="bg-amber-400 dark:bg-amber-300 h-full"
          style={{ width: `${(certCount / total) * 100}%` }}
        />
      )}
      {impactCount > 0 && (
        <div
          className="bg-emerald-500 dark:bg-emerald-400 h-full"
          style={{ width: `${(impactCount / total) * 100}%` }}
        />
      )}
      {otherCount > 0 && (
        <div
          className="bg-surface-3 h-full"
          style={{ width: `${(otherCount / total) * 100}%` }}
        />
      )}
    </div>
  );
}

function EvidenceDetail({ evidence, type }: { evidence: CloudEvidence; type: string }) {
  const colors: Record<string, string> = {
    role: "text-indigo-600 dark:text-indigo-400",
    impact: "text-emerald-600 dark:text-emerald-400",
    cert: "text-amber-600 dark:text-amber-400",
    other: "text-surface-text-muted",
  };
  const dots: Record<string, string> = {
    role: "bg-indigo-500 dark:bg-indigo-400",
    impact: "bg-emerald-500 dark:bg-emerald-400",
    cert: "bg-amber-400 dark:bg-amber-300",
    other: "bg-surface-3",
  };

  let text = "";
  if (evidence.type === "role") {
    const dur = evidence.duration_months
      ? evidence.duration_months < 12
        ? `${evidence.duration_months}mo`
        : `${Math.round(evidence.duration_months / 12)}y`
      : "";
    text = `${evidence.title ?? "Role"} at ${evidence.company ?? "Unknown"}${dur ? ` (${dur})` : ""}`;
    if (evidence.context && typeof evidence.context === "string" && !evidence.context.startsWith("Used in role")) {
      text += ` \u2014 "${evidence.context}"`;
    }
  } else if (evidence.type === "impact") {
    text = evidence.description ?? "Impact evidence";
  } else if (evidence.type === "certification") {
    text = `${evidence.name ?? "Certification"}${evidence.issuer ? ` (${evidence.issuer})` : ""}`;
  } else if (evidence.type === "socratic") {
    const answer = (evidence as { answer?: string }).answer;
    text = answer ? `Enriched: "${answer.slice(0, 100)}${answer.length > 100 ? "..." : ""}"` : "Socratic enrichment";
  } else {
    text = evidence.name ?? evidence.description ?? evidence.type ?? "Evidence";
  }

  return (
    <div className="flex items-start gap-2 py-0.5">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dots[type] ?? dots.other}`} />
      <span className={`text-sm leading-relaxed ${colors[type] ?? colors.other}`}>{text}</span>
    </div>
  );
}

function getRecencyLabel(lastUsed: string | null): string | null {
  if (!lastUsed) return null;
  const lower = lastUsed.toLowerCase();
  if (lower === "present" || lower === "current") return "Active";
  // Try to extract year
  const yearMatch = lastUsed.match(/(\d{4})/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[1]);
  const currentYear = new Date().getFullYear();
  const gap = currentYear - year;
  if (gap <= 1) return "Active";
  if (gap <= 3) return `${year}`;
  return `${year}`;
}

function depthTooltip(level: string): string {
  switch (level) {
    case "expert": return "3+ roles, 5+ years, plus a credential or measurable impact";
    case "proficient": return "2+ roles or 2+ years of experience";
    case "applied": return "Used in one role";
    case "mentioned": return "Listed on CV but not yet linked to a role";
    default: return "";
  }
}

function depthColor(level: string): string {
  // Monochrome indigo intensity scale — avoids collision with bar colors (indigo/amber/emerald)
  switch (level) {
    case "expert": return "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium";
    case "proficient": return "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400";
    case "applied": return "bg-surface-2 text-surface-text-secondary";
    case "mentioned": return "bg-surface-2 text-surface-text-muted";
    default: return "bg-surface-2 text-surface-text-muted";
  }
}

