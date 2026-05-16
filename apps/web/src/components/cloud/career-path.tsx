"use client";

import { useState } from "react";
import type { CloudTrajectoryRole } from "./types";

interface CareerPathProps {
  roles: CloudTrajectoryRole[];
}

const DOMAIN_COLORS: Record<string, string> = {
  healthcare: "#6366f1",
  clinical: "#6366f1",
  medical: "#6366f1",
  anesthesi: "#818cf8",
  technology: "#06b6d4",
  software: "#06b6d4",
  engineering: "#f59e0b",
  aerospace: "#f59e0b",
  defense: "#64748b",
  military: "#64748b",
  finance: "#10b981",
  banking: "#10b981",
  education: "#8b5cf6",
  teaching: "#8b5cf6",
  management: "#ec4899",
  research: "#14b8a6",
  consulting: "#f43f5e",
  construction: "#d97706",
  energy: "#84cc16",
  general: "#94a3b8",
};

function getDomainColor(domain: string): string {
  const lower = domain.toLowerCase();
  for (const [key, color] of Object.entries(DOMAIN_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return DOMAIN_COLORS.general;
}

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function parseDate(s: string): Date | null {
  if (!s || s.toLowerCase() === "unknown") return null;
  if (s.toLowerCase() === "present" || s.toLowerCase() === "current") return new Date();
  const ymd = s.match(/^(\d{4})-(\d{2})/);
  if (ymd) return new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1);
  const match = s.match(/(\w+)\s+(\d{4})/);
  if (match) {
    const months: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const m = months[match[1].toLowerCase().slice(0, 3)] ?? 0;
    return new Date(parseInt(match[2]), m);
  }
  const yearOnly = s.match(/^\d{4}$/);
  if (yearOnly) return new Date(parseInt(s), 0);
  return null; // Unparseable — don't guess
}

export function CareerPath({ roles }: CareerPathProps) {
  const [activeRole, setActiveRole] = useState<number | null>(null);

  if (roles.length === 0) return null;

  const parsedRoles = roles
    .map((r, idx) => {
      const startDate = parseDate(r.start_date);
      const endDate = parseDate(r.end_date);
      if (!startDate) return null; // Skip roles with unparseable start dates
      return {
        ...r,
        startMs: startDate.getTime(),
        endMs: (endDate ?? new Date()).getTime(), // null end = current
        idx,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.startMs - b.startMs);

  if (parsedRoles.length === 0) return null;

  const minTime = parsedRoles[0].startMs;
  const maxTime = Math.max(...parsedRoles.map((r) => r.endMs));
  const timeSpan = maxTime - minTime || 1;

  const startYear = new Date(minTime).getFullYear();
  const endYear = new Date(maxTime).getFullYear();
  const totalYears = endYear - startYear + 1;
  const totalCareerYears = Math.round((maxTime - minTime) / (365.25 * 24 * 60 * 60 * 1000));
  const yearStep = totalYears > 15 ? 5 : totalYears > 8 ? 2 : 1;
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    if ((y - startYear) % yearStep === 0 || y === endYear) years.push(y);
  }

  const LEFT_MARGIN = 140;
  const CHART_WIDTH = 480;
  const LANE_HEIGHT = 48;
  const PADDING_TOP = 30;
  const PADDING_BOTTOM = 45;
  const totalHeight = PADDING_TOP + parsedRoles.length * LANE_HEIGHT + PADDING_BOTTOM;
  const SVG_WIDTH = LEFT_MARGIN + CHART_WIDTH + 20;

  // Use CSS custom properties for theme-aware SVG colors
  // These resolve from globals.css surface system in dark mode
  const gridColor = "var(--surface-border, #e4e4e7)";
  const yearLabelColor = "var(--surface-text-muted, #a1a1aa)";
  const titleColor = "var(--surface-text, #374151)";
  const subtitleColor = "var(--surface-text-secondary, #9ca3af)";
  const hoverBg = "var(--surface-2, #f4f4f5)";

  const handleRoleInteraction = (i: number) => {
    setActiveRole(prev => prev === i ? null : i);
  };

  return (
    <div className="space-y-3">
      {/* Career summary header */}
      <div className="flex items-center gap-2 text-sm text-surface-text-muted">
        <span className="font-medium text-surface-text-secondary">{parsedRoles.length} roles</span>
        <span className="text-surface-text-muted">&middot;</span>
        <span>{totalCareerYears} years</span>
        <span className="text-surface-text-muted">&middot;</span>
        <span>{startYear} &ndash; {endYear}</span>
      </div>

      <div className="overflow-x-auto relative">
        <svg
          width="100%"
          viewBox={`0 0 ${SVG_WIDTH} ${totalHeight}`}
          className="min-w-[500px]"
          role="img"
          aria-label={`Career timeline showing ${parsedRoles.length} roles from ${startYear} to ${endYear}`}
        >
          <desc>
            {parsedRoles.map(r => `${r.title} at ${r.company}, ${r.start_date} to ${r.end_date}`).join(". ")}
          </desc>

          {/* Training stripe patterns — defined once at SVG root */}
          <defs>
            {parsedRoles.map((role, i) => role.isTraining ? (
              <pattern key={i} id={`training-${i}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
              </pattern>
            ) : null)}
          </defs>

          {/* Year grid lines */}
          {years.map((y) => {
            const x = LEFT_MARGIN + ((new Date(y, 0).getTime() - minTime) / timeSpan) * CHART_WIDTH;
            return (
              <g key={y}>
                <line
                  x1={x} y1={PADDING_TOP - 10}
                  x2={x} y2={totalHeight - PADDING_BOTTOM + 10}
                  stroke={gridColor} strokeWidth={1} strokeDasharray="4,4"
                />
                <text x={x} y={totalHeight - PADDING_BOTTOM + 25} textAnchor="middle" fill={yearLabelColor} fontSize={11}>
                  {y}
                </text>
              </g>
            );
          })}

          {/* Role lanes */}
          {parsedRoles.map((role, i) => {
            const x1 = LEFT_MARGIN + ((role.startMs - minTime) / timeSpan) * CHART_WIDTH;
            const x2 = LEFT_MARGIN + ((role.endMs - minTime) / timeSpan) * CHART_WIDTH;
            const barWidth = Math.max(x2 - x1, 8);
            const y = PADDING_TOP + i * LANE_HEIGHT;
            const color = getDomainColor(role.domain);
            const isActive = activeRole === i;
            const isPresent = role.end_date?.toLowerCase() === "present";

            const maxTitleLen = 28;
            const displayTitle = role.title.length > maxTitleLen
              ? role.title.slice(0, maxTitleLen - 2).trimEnd() + "\u2026"
              : role.title;
            const maxCompanyLen = 28;
            const displayCompany = role.company.length > maxCompanyLen
              ? role.company.slice(0, maxCompanyLen - 2).trimEnd() + "\u2026"
              : role.company;

            return (
              <g
                key={i}
                onMouseEnter={() => setActiveRole(i)}
                onMouseLeave={() => setActiveRole(null)}
                onClick={() => handleRoleInteraction(i)}
                className="cursor-pointer"
                aria-label={`${role.title} at ${role.company}, ${role.start_date} to ${role.end_date}`}
              >
                {/* Lane background on hover */}
                <rect
                  x={0} y={y - 2}
                  width={SVG_WIDTH} height={LANE_HEIGHT - 4}
                  rx={6}
                  fill={isActive ? hoverBg : "transparent"}
                  style={{ transition: "fill 0.15s ease" }}
                />

                {/* Role title (left side) */}
                <text
                  x={LEFT_MARGIN - 8} y={y + 16}
                  textAnchor="end" fill={titleColor}
                  fontSize={13} fontWeight={isActive ? 600 : 500}
                  style={{ transition: "font-weight 0.15s ease" }}
                >
                  {displayTitle}
                </text>

                {/* Company subtitle */}
                <text x={LEFT_MARGIN - 8} y={y + 31} textAnchor="end" fill={subtitleColor} fontSize={10.5}>
                  {displayCompany}
                </text>

                {/* Role bar */}
                <rect
                  x={x1} y={y + 6}
                  width={barWidth} height={24}
                  rx={4}
                  fill={color}
                  opacity={isActive ? 1 : 0.75}
                  stroke={isActive ? color : "none"}
                  strokeWidth={2}
                  style={{ transition: "opacity 0.15s ease" }}
                />

                {/* Training indicator — diagonal stripe overlay */}
                {role.isTraining && (
                  <>
                    <rect
                      x={x1} y={y + 6}
                      width={barWidth} height={24}
                      rx={4}
                      fill={`url(#training-${i})`}
                    />
                    {barWidth > 50 && (
                      <text x={x1 + barWidth / 2} y={y + 22} textAnchor="middle" fill="white" fontSize={8} fontWeight={600} letterSpacing={0.5}>
                        TRAINING
                      </text>
                    )}
                  </>
                )}

                {/* Duration inside bar (if wide enough and not training) */}
                {barWidth > 40 && !role.isTraining && (
                  <text x={x1 + barWidth / 2} y={y + 22} textAnchor="middle" fill="white" fontSize={9} fontWeight={500}>
                    {role.duration_months < 12 ? `${role.duration_months}mo` : `${Math.round(role.duration_months / 12)}y`}
                  </text>
                )}

                {/* Present indicator — animated pulse + "Current" label */}
                {isPresent && (
                  <>
                    <circle cx={x2 + 8} cy={y + 18} r={4} fill={color}>
                      <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <text x={x2 + 16} y={y + 22} fill={color} fontSize={9} fontWeight={500}>
                      Current
                    </text>
                  </>
                )}

              </g>
            );
          })}
        </svg>

        {/* HTML tooltip — positioned over SVG for shadow/blur/rounded corners */}
        {activeRole !== null && (() => {
          const role = parsedRoles[activeRole];
          const y = PADDING_TOP + activeRole * LANE_HEIGHT;
          const x1 = LEFT_MARGIN + ((role.startMs - minTime) / timeSpan) * CHART_WIDTH;
          const topPct = ((y - 4) / totalHeight) * 100;
          const leftPct = (x1 / SVG_WIDTH) * 100;
          const dur = role.duration_months < 12
            ? `${role.duration_months} months`
            : `${Math.round(role.duration_months / 12)} year${Math.round(role.duration_months / 12) > 1 ? "s" : ""}`;
          return (
            <div
              className="absolute z-10 pointer-events-none animate-fade-in"
              style={{ top: `${topPct}%`, left: `${Math.min(leftPct, 65)}%`, transform: "translateY(-100%)" }}
            >
              <div className="bg-surface-0 text-surface-text rounded-lg shadow-xl px-3 py-2 text-xs leading-relaxed border border-surface-border backdrop-blur-sm min-w-[180px]">
                <p className="font-semibold text-sm">{role.title}</p>
                <p className="text-surface-text-muted mt-0.5">{role.company} &middot; {dur}</p>
                <p className="text-surface-text-muted mt-0.5">{titleCase(role.domain)}{role.isTraining ? " · Training" : ""}</p>
              </div>
              {/* Caret */}
              <div className="ml-4 w-2 h-2 bg-surface-0 rotate-45 -mt-1 border-r border-b border-surface-border" />
            </div>
          );
        })()}
      </div>

      {/* Domain legend */}
      <div className="flex flex-wrap gap-3 text-xs text-surface-text-muted">
        {[...new Set(roles.map((r) => r.domain))].map((domain) => (
          <span key={domain} className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: getDomainColor(domain) }} />
            {titleCase(domain)}
          </span>
        ))}
        {roles.some(r => r.isTraining) && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-surface-3 inline-block" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)" }} />
            Training
          </span>
        )}
      </div>
    </div>
  );
}
